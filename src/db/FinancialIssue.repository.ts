import { Pool } from "pg";
import {
  FinancialIssue,
  Issue,
  IssueFunding,
  IssueId,
  ManagedIssue,
  Owner,
  Repository,
  User,
} from "@open-source-economy/api-types";
import { pool } from "../dbPool";
import { GitHubApi, githubService } from "../services";
import { logger } from "../config";
import { issueRepo, ownerRepo, repositoryRepo } from "./github";
import { userRepo } from "./user";
import { issueFundingRepo, managedIssueRepo } from "./index";

export function getFinancialIssueRepository(
  gitHubApi: GitHubApi = githubService,
): FinancialIssueRepository {
  return new FinancialIssueRepositoryImpl(pool, gitHubApi);
}

// TODO: optimize this implementation
export interface FinancialIssueRepository {
  get(issueId: IssueId): Promise<FinancialIssue | null>;

  getAll(): Promise<FinancialIssue[]>;
}

export class FinancialIssueRepositoryImpl implements FinancialIssueRepository {
  pool: Pool;
  githubService: GitHubApi;

  constructor(pool: Pool, githubService: GitHubApi) {
    this.pool = pool;
    this.githubService = githubService;
  }

  async get(issueId: IssueId): Promise<FinancialIssue> {
    const githubRepoPromise: Promise<[Owner, Repository]> =
      this.githubService.getOwnerAndRepository(issueId.repositoryId);
    const githubIssuePromise: Promise<[Issue, Owner]> =
      this.githubService.getIssue(issueId);

    Promise.all([githubRepoPromise, githubIssuePromise])
      .then(async ([repoResult, issueResult]) => {
        const [owner, repo] = repoResult;
        const [issue, issueCreatedBy] = issueResult;

        await ownerRepo
          .insertOrUpdate(owner as Owner)
          .then(async () => {
            await repositoryRepo.insertOrUpdate(repo as Repository);
          })
          .then(async () => {
            await ownerRepo.insertOrUpdate(issueCreatedBy as Owner);
          })
          .then(async () => {
            const i = issue as Issue;
            i.setRepositoryId((repo as Repository).id); // TODO: not very elegant way to deal with the fact that github query doesn't return repository id nor owner id
            await issueRepo.createOrUpdate(i);
          });
      })
      .catch((error) => {
        logger.error("Error fetching GitHub data:", error);
      });

    const owner: Promise<Owner | null> = ownerRepo
      .getById(issueId.repositoryId.ownerId)
      .then(async (owner) => {
        if (!owner) {
          const [owner, _] = await githubRepoPromise;
          return owner;
        }
        return owner;
      })
      .catch((error) => {
        logger.error(
          `Issue owner ${JSON.stringify(issueId)} does not exist in the DB and go an error fetching GitHub data:`,
          error,
        );
        return null;
      });

    const repo: Promise<Repository | null> = repositoryRepo
      .getById(issueId.repositoryId)
      .then(async (repo) => {
        if (!repo) {
          const [_, repo] = await githubRepoPromise;
          return repo;
        }
        return repo;
      })
      .catch((error) => {
        logger.error(
          `Issue repository ${JSON.stringify(issueId)} does not exist in the DB and go an error fetching GitHub data:`,
          error,
        );
        return null;
      });

    const issue: Promise<Issue | null> = issueRepo
      .getById(issueId)
      .then(async (issue) => {
        if (!issue) {
          const [issue, _] = await githubIssuePromise;
          return issue;
        }
        return issue;
      })
      .catch((error) => {
        logger.error(
          `Issue ${JSON.stringify(issueId)} does not exist in the DB and go an error fetching GitHub data:`,
          error,
        );
        return null;
      });

    const managedIssue = managedIssueRepo.getByIssueId(issueId);
    const issueManager = managedIssue
      .then((managedIssue) => {
        if (!managedIssue) {
          return null;
        } else {
          return userRepo.getById(managedIssue.managerId);
        }
      })
      .catch((error) => {
        logger.error(
          `Got an error fetching the manager for managed issue for issue ${JSON.stringify(issueId)}:`,
          error,
        );
        return null;
      });

    const o = await owner;
    const r = await repo;
    const i = await issue;

    if (o && r && i) {
      const issueFundings = issueFundingRepo.getAll(issueId);
      return new FinancialIssue(
        o,
        r,
        i,
        await issueManager,
        await managedIssue,
        await issueFundings,
      );
    } else {
      throw new Error(
        `Failed to fetch all required data for managed issue ${JSON.stringify(issueId)}`,
      );
    }
  }

  async getAll(): Promise<FinancialIssue[]> {
    const allManagedIssues = await managedIssueRepo.getAll();
    logger.debug(`Got ${allManagedIssues.length} managed issues from the DB`);
    const managedIssues: Map<number | undefined, ManagedIssue> = new Map(
      allManagedIssues.map((m) => {
        if (!m.githubIssueId || !m.githubIssueId.githubId) {
          logger.error(
            `ManagedIssue of github issue id: ${m.githubIssueId}, does not have a githubId field defined in the DB`,
          );
        }
        return [m.githubIssueId?.githubId, m];
      }),
    );

    const issueFundings: Map<number, IssueFunding[]> = new Map();
    const allIssueFundings = await issueFundingRepo.getAll();
    logger.debug(`Got ${allIssueFundings.length} issue fundings from the DB`);
    allIssueFundings.forEach((i) => {
      const githubId = i.githubIssueId?.githubId;
      if (!githubId) {
        // TODO: fix this mess with optional githubId
        logger.error(
          `IssueFunding of github issue id: ${i.githubIssueId}, does not have a githubId field defined in the DB`,
        );
        return; // Skip if githubId is undefined
      }

      // Initialize an empty array if the key doesn't exist
      if (!issueFundings.has(githubId)) {
        issueFundings.set(githubId, []);
      }

      // Add the IssueFunding to the corresponding array
      issueFundings.get(githubId)?.push(i);
    });

    const issueIds: Map<number | undefined, IssueId> = new Map();

    allManagedIssues.forEach((m) => {
      const githubId = m.githubIssueId?.githubId;
      if (githubId !== undefined) {
        // Add to the map if the key doesn't already exist
        if (!issueIds.has(githubId)) {
          issueIds.set(githubId, m.githubIssueId);
        }
      }
    });

    allIssueFundings.forEach((i) => {
      const githubId = i.githubIssueId?.githubId;
      if (githubId !== undefined) {
        // Add to the map if the key doesn't already exist
        if (!issueIds.has(githubId)) {
          issueIds.set(githubId, i.githubIssueId);
        }
      }
    });

    const financialIssues: FinancialIssue[] = [];
    for (const [githubId, issueId] of issueIds) {
      if (!githubId) {
        logger.error(
          `Issue with github id: ${issueId}, does not have an id field defined in the DB`,
        );
        continue; // Skip if githubId is undefined
      }

      const managedIssue = managedIssues.get(githubId) ?? null;
      let issueManager: User | null = null;
      if (managedIssue !== null) {
        issueManager = await userRepo.getById(managedIssue.managerId);
      }
      const fundings = issueFundings.get(githubId) ?? [];

      const owner = await ownerRepo.getById(issueId.repositoryId.ownerId);
      const repo = await repositoryRepo.getById(issueId.repositoryId);
      const issue = await issueRepo.getById(issueId);

      if (!owner || !repo || !issue) {
        logger.error(
          `Financial issue with github id: ${githubId}, does not have a valid owner, repo, or issue in the DB`,
        );
        continue; // Use continue to skip to the next iteration
      }

      financialIssues.push(
        new FinancialIssue(
          owner,
          repo,
          issue,
          issueManager,
          managedIssue,
          fundings,
        ),
      );
    }
    return financialIssues;
  }
}
