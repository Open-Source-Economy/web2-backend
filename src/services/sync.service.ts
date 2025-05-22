import { OwnerRepository } from "../db/github/Owner.repository";
import { RepositoryRepository } from "../db/github/Repository.repository";
import { GitHubApi } from "./github.service";
import {
  Owner,
  OwnerId,
  Project,
  ProjectId,
  Repository,
  RepositoryId,
} from "../api/model";
import { ownerRepo, repositoryRepo } from "../db";
import { logger } from "../config";
import { ProjectRepository } from "../db/project/Project.repository";

export function getGithubSyncService(
  githubService: GitHubApi,
  ownerRepo: OwnerRepository,
  repositoryRepo: RepositoryRepository,
  projectRepo: ProjectRepository,
): GithubSyncService {
  return new GithubSyncServiceImpl(
    githubService,
    ownerRepo,
    repositoryRepo,
    projectRepo,
  );
}

// TODO: this needs to be re-thought
export interface GithubSyncService {
  /**
   * Fetches an Owner by ID from GitHub, upserts it into the local database, and returns the resulting record.
   *
   * This method performs two main tasks in parallel:
   * 1. Kicks off a GitHub API call to retrieve the `Owner` data, then inserts or updates that record in the local DB.
   * 2. Attempts to read the `Owner` from the local DB; if it’s not yet present, waits for the GitHub promise to resolve.
   *
   * All errors during the GitHub fetch or database operations are logged. If, after both steps, no valid
   * `Owner` record can be obtained, the method throws.
   *
   * @async
   * @param {OwnerId} ownerId
   *   Unique identifier (login/name) of the GitHub owner to sync.
   * @returns {Promise<Owner>}
   *   The up-to-date `Owner` record, either freshly fetched or retrieved from the local database.
   *
   * @throws {Error}
   *   If neither the DB read nor the GitHub fetch yields a valid `Owner`.
   *
   * @example
   * ```ts
   * try {
   *   const owner = await service.syncOwner({ login: "octocat" });
   *   console.log(owner.id, owner.login);
   * } catch (err) {
   *   console.error("Could not sync owner:", err);
   * }
   * ```
   */
  syncOwner(ownerId: OwnerId): Promise<Owner>;

  /**
   * Fetches a GitHub repository (and its owner) by ID, ensures both are up-to-date in the local database,
   * and returns them.
   *
   * This method concurrently:
   * 1. Calls the GitHub service to fetch the owner and repository data.
   * 2. Inserts or updates the owner and repository records in the local DB.
   * 3. Reads back the owner and repository from the DB.
   *
   * If the records don’t already exist locally, it waits for the GitHub fetch and then stores them.
   * All errors during fetching or DB operations are logged; if final data cannot be resolved,
   * the method throws.
   *
   * @async
   * @param {RepositoryId} repositoryId
   *   - `ownerId`: unique identifier for the repository owner
   *   - `repoId`: unique identifier for the repository itself
   * @returns {Promise<[Owner, Repository]>}
   *   A tuple containing:
   *   1. `Owner` — the owner record
   *   2. `Repository` — the repository record
   *
   * @throws {Error}
   *   If after all fetch and insert/update attempts either the owner or repository record
   *   is still unavailable.
   *
   * @example
   * ```ts
   * try {
   *   const [owner, repo] = await service.syncRepository({ ownerId: "octocat", repoId: "hello-world" });
   *   console.log(owner.login); // "octocat"
   *   console.log(repo.name);   // "hello-world"
   * } catch (e) {
   *   console.error("Could not load repository:", e);
   * }
   * ```
   */
  syncRepository(repositoryId: RepositoryId): Promise<[Owner, Repository]>;

  syncProject(projectId: ProjectId): Promise<Project>;
}

class GithubSyncServiceImpl implements GithubSyncService {
  constructor(
    private githubService: GitHubApi,
    private ownerRepo: OwnerRepository,
    private repositoryRepo: RepositoryRepository,
    private projectRepo: ProjectRepository,
  ) {}

  async syncOwner(ownerId: OwnerId): Promise<Owner> {
    const githubOwnerPromise = this.githubService.getOwner(ownerId);
    githubOwnerPromise
      .then(async (owner) => {
        await ownerRepo.insertOrUpdate(owner as Owner);
      })
      .catch((error) => {
        logger.error("Error fetching GitHub data:", error);
      });

    const owner = await ownerRepo
      .getById(ownerId)
      .then(async (owner) => {
        if (!owner) {
          return githubOwnerPromise;
        }
        return owner;
      })
      .catch((error) => {
        logger.error(
          `Owner ${JSON.stringify(ownerId)} does not exist in the DB and go an error fetching GitHub data:`,
          error,
        );
        return null;
      });

    if (owner) {
      return owner;
    } else {
      throw new Error(
        `Failed to fetch all required data for repository ${JSON.stringify(ownerId)}`,
      );
    }
  }

  async syncRepository(
    repositoryId: RepositoryId,
  ): Promise<[Owner, Repository]> {
    const githubRepoPromise: Promise<[Owner, Repository]> =
      this.githubService.getOwnerAndRepository(repositoryId);

    githubRepoPromise
      .then(async ([owner, repo]) => {
        ownerRepo
          .insertOrUpdate(owner as Owner)
          .then(async () => {
            await repositoryRepo.insertOrUpdate(repo as Repository);
          })
          .catch((error) => {
            logger.error("Error updating the DB", error);
          });

        return [owner, repo];
      })
      .catch((error) => {
        logger.error("Error fetching GitHub data:", error);
        return null;
      });

    const owner: Owner | null = await ownerRepo
      .getById(repositoryId.ownerId)
      .then(async (owner) => {
        if (!owner) {
          const [owner, _] = await githubRepoPromise;
          return owner;
        }
        return owner;
      })
      .catch((error) => {
        logger.error(
          `Owner ${JSON.stringify(repositoryId.ownerId)} does not exist in the DB and go an error fetching GitHub data:`,
          error,
        );
        return null;
      });

    const repo: Repository | null = await repositoryRepo
      .getById(repositoryId)
      .then(async (repo) => {
        if (!repo) {
          const [_, repo] = await githubRepoPromise;
          return repo;
        }
        return repo;
      })
      .catch((error) => {
        logger.error(
          `Repository ${JSON.stringify(repositoryId)} does not exist in the DB and go an error fetching GitHub data:`,
          error,
        );
        return null;
      });

    if (owner && repo) {
      return [owner, repo];
    } else {
      throw new Error(
        `Failed to fetch all required data for repository ${JSON.stringify(repositoryId)}`,
      );
    }
  }

  async syncProject(projectId: ProjectId): Promise<Project> {
    if (projectId instanceof RepositoryId) {
      await this.syncRepository(
        new RepositoryId(new OwnerId(projectId.ownerId.login), projectId.name),
      );
    } else {
      await this.syncOwner(new OwnerId(projectId.login));
    }

    // @ts-ignore: project should have being inserted in the DB if not present - or trow an error
    return (await this.projectRepo.getById(projectId)) as Promise<Project>;
  }
}
