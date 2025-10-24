import { OwnerRepository } from "../db/github/Owner.repository";
import { RepositoryRepository } from "../db/github/Repository.repository";
import { GitHubApi } from "./github.service";
import {
  Owner,
  OwnerId,
  ProjectId,
  ProjectItemType,
  Repository,
  RepositoryId,
} from "@open-source-economy/api-types";
import { logger } from "../config";
import { ProjectRepository, ProjectItemRepository } from "../db";

export function getGithubSyncService(
  githubService: GitHubApi,
  ownerRepo: OwnerRepository,
  repositoryRepo: RepositoryRepository,
  projectRepo: ProjectRepository,
  projectItemRepo: ProjectItemRepository,
): GithubSyncService {
  return new GithubSyncServiceImpl(
    githubService,
    ownerRepo,
    repositoryRepo,
    projectRepo,
    projectItemRepo,
  );
}

export interface GithubSyncService {
  /**
   * Fetches an Owner by ID from GitHub, upserts it into the local database, and returns the resulting record.
   *
   * This method performs two main tasks in parallel:
   * 1. Kicks off a GitHub API call to retrieve the `Owner` data, then inserts or updates that record in the local DB.
   * 2. Attempts to read the `Owner` from the local DB; if it's not yet present, waits for the GitHub promise to resolve.
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
   * If the records don't already exist locally, it waits for the GitHub fetch and then stores them.
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
   */
  syncRepository(repositoryId: RepositoryId): Promise<[Owner, Repository]>;

  /**
   * Syncs a project which can be either a repository or an owner-only project.
   * Returns the owner and repository (if applicable).
   *
   * @param {ProjectId} projectId - The project identifier
   * @returns {Promise<[Owner, Repository | null]>} - Owner and optional repository
   */
  syncProject(projectId: ProjectId): Promise<[Owner, Repository | null]>;

  /**
   * Syncs all owners and repositories from all project items in the database.
   * This method fetches all project items and syncs their associated owners and repositories.
   *
   * @async
   * @returns {Promise<{ syncedOwners: number; syncedRepositories: number; errors: number }>}
   *   Statistics about the sync operation including counts of synced owners, repositories, and any errors encountered.
   */
  syncAllProjectItems(): Promise<{
    syncedOwners: number;
    syncedRepositories: number;
    errors: number;
  }>;
}

class GithubSyncServiceImpl implements GithubSyncService {
  constructor(
    private githubService: GitHubApi,
    private ownerRepo: OwnerRepository,
    private repositoryRepo: RepositoryRepository,
    private projectRepo: ProjectRepository,
    private projectItemRepo: ProjectItemRepository,
  ) {}

  async syncOwner(ownerId: OwnerId): Promise<Owner> {
    const githubOwnerPromise = this.githubService.getOwner(ownerId);

    // Start the GitHub fetch and DB upsert in parallel
    githubOwnerPromise
      .then(async (owner) => {
        await this.ownerRepo.insertOrUpdate(owner as Owner);
      })
      .catch((error) => {
        logger.error("Error fetching GitHub data:", error);
      });

    // Try to get from DB first, fallback to GitHub promise if not found
    const owner = await this.ownerRepo
      .getById(ownerId)
      .then(async (owner) => {
        if (!owner) {
          return await githubOwnerPromise;
        }
        return owner;
      })
      .catch(async (error) => {
        logger.error(
          `Owner ${JSON.stringify(ownerId)} does not exist in the DB, trying GitHub:`,
          error,
        );
        try {
          return await githubOwnerPromise;
        } catch (githubError) {
          logger.error("Error fetching from GitHub:", githubError);
          return null;
        }
      });

    if (owner) {
      return owner;
    } else {
      throw new Error(
        `Failed to fetch owner data for ${JSON.stringify(ownerId)}`,
      );
    }
  }

  async syncRepository(
    repositoryId: RepositoryId,
  ): Promise<[Owner, Repository]> {
    const githubRepoPromise: Promise<[Owner, Repository]> =
      this.githubService.getOwnerAndRepository(repositoryId);

    // Start the GitHub fetch and DB upsert in parallel
    githubRepoPromise
      .then(async ([owner, repo]) => {
        try {
          await this.ownerRepo.insertOrUpdate(owner as Owner);
          await this.repositoryRepo.insertOrUpdate(repo as Repository);
        } catch (error) {
          logger.error("Error updating the DB:", error);
        }
      })
      .catch((error) => {
        logger.error("Error fetching GitHub data:", error);
      });

    // Try to get owner from DB first, fallback to GitHub promise
    const owner: Owner | null = await this.ownerRepo
      .getById(repositoryId.ownerId)
      .then(async (owner) => {
        if (!owner) {
          const [fetchedOwner, _] = await githubRepoPromise;
          return fetchedOwner;
        }
        return owner;
      })
      .catch(async (error) => {
        logger.error(
          `Owner ${JSON.stringify(repositoryId.ownerId)} does not exist in the DB, trying GitHub:`,
          error,
        );
        try {
          const [fetchedOwner, _] = await githubRepoPromise;
          return fetchedOwner;
        } catch (githubError) {
          logger.error("Error fetching from GitHub:", githubError);
          return null;
        }
      });

    // Try to get repository from DB first, fallback to GitHub promise
    const repo: Repository | null = await this.repositoryRepo
      .getById(repositoryId)
      .then(async (repo) => {
        if (!repo) {
          const [_, fetchedRepo] = await githubRepoPromise;
          return fetchedRepo;
        }
        return repo;
      })
      .catch(async (error) => {
        logger.error(
          `Repository ${JSON.stringify(repositoryId)} does not exist in the DB, trying GitHub:`,
          error,
        );
        try {
          const [_, fetchedRepo] = await githubRepoPromise;
          return fetchedRepo;
        } catch (githubError) {
          logger.error("Error fetching from GitHub:", githubError);
          return null;
        }
      });

    if (owner && repo) {
      return [owner, repo];
    } else {
      throw new Error(
        `Failed to fetch all required data for repository ${JSON.stringify(repositoryId)}`,
      );
    }
  }

  async syncProject(projectId: ProjectId): Promise<[Owner, Repository | null]> {
    if (projectId instanceof RepositoryId) {
      const [owner, repo] = await this.syncRepository(projectId);
      return [owner, repo];
    } else {
      // Assuming projectId is an OwnerId or has owner information
      const owner = await this.syncOwner(new OwnerId(projectId.login));
      return [owner, null];
    }
  }

  async syncAllProjectItems(): Promise<{
    syncedOwners: number;
    syncedRepositories: number;
    errors: number;
  }> {
    logger.info("Starting sync of all project items...");

    // Get all project items from the database
    const projectItems = await this.projectItemRepo.getAll();

    let syncedOwners = 0;
    let syncedRepositories = 0;
    let errors = 0;

    // Track unique owners and repositories to avoid duplicate syncs
    const syncedOwnerIds = new Set<string>();
    const syncedRepositoryIds = new Set<string>();

    // Delay between API calls to avoid rate limiting (in milliseconds)
    const RATE_LIMIT_DELAY_MS = 10; // 0.01 second between calls

    for (const projectItem of projectItems) {
      try {
        if (projectItem.projectItemType === ProjectItemType.GITHUB_REPOSITORY) {
          const repositoryId = projectItem.sourceIdentifier as RepositoryId;
          const repoKey = `${repositoryId.ownerId.login}/${repositoryId.name}`;

          // Sync repository (and its owner)
          if (!syncedRepositoryIds.has(repoKey)) {
            logger.info(`Syncing repository: ${repoKey}`);
            await this.syncRepository(repositoryId);
            syncedRepositories++;
            syncedRepositoryIds.add(repoKey);
            syncedOwnerIds.add(repositoryId.ownerId.login);
            logger.info(`Successfully synced repository: ${repoKey}`);

            // Wait before next API call to avoid rate limiting
            await new Promise((resolve) =>
              setTimeout(resolve, RATE_LIMIT_DELAY_MS),
            );
          } else {
            logger.debug(`Skipping already synced repository: ${repoKey}`);
          }
        } else if (
          projectItem.projectItemType === ProjectItemType.GITHUB_OWNER
        ) {
          const ownerId = projectItem.sourceIdentifier as OwnerId;
          const ownerKey = ownerId.login;

          // Sync owner
          if (!syncedOwnerIds.has(ownerKey)) {
            logger.info(`Syncing owner: ${ownerKey}`);
            await this.syncOwner(ownerId);
            syncedOwners++;
            syncedOwnerIds.add(ownerKey);
            logger.info(`Successfully synced owner: ${ownerKey}`);

            // Wait before next API call to avoid rate limiting
            await new Promise((resolve) =>
              setTimeout(resolve, RATE_LIMIT_DELAY_MS),
            );
          } else {
            logger.debug(`Skipping already synced owner: ${ownerKey}`);
          }
        }
        // URL type items don't have GitHub data to sync
      } catch (error) {
        errors++;
        logger.error(
          `Error syncing project item ${projectItem.id.uuid}:`,
          error,
        );
      }
    }

    logger.info(
      `Sync completed: ${syncedOwners} owners, ${syncedRepositories} repositories, ${errors} errors`,
    );

    return {
      syncedOwners,
      syncedRepositories,
      errors,
    };
  }
}
