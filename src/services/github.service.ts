import {
  Issue,
  IssueId,
  Owner,
  OwnerId,
  Repository,
  RepositoryId,
} from "../api/model";
import { config, logger } from "../config";
import { ValidationError } from "../api/model/error";

export function getGitHubAPI(): GitHubApi {
  return new GitHubApiImpl();
}

export function getGitHubService(): GitHubService {
  return new GitHubServiceImpl();
}

export interface GitHubApi {
  getOwner(ownerId: OwnerId): Promise<Owner>;

  getOwnerAndRepository(
    repositoryId: RepositoryId,
  ): Promise<[Owner, Repository]>;

  // returns the issue and the owner that opened the issue
  getIssue(issueId: IssueId): Promise<[Issue, Owner]>;
}

export interface GitHubService {
  getUserOrganizations(accessToken: string): Promise<Organization[]>;
  getOrganizationRepositories(org: string, accessToken: string): Promise<Repository[]>;
  getUserRepositories(accessToken: string): Promise<Repository[]>;
}

export interface Organization {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  description: string | null;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

class GitHubApiImpl implements GitHubApi {
  async getOwner(ownerId: OwnerId): Promise<Owner> {
    try {
      // https://api.github.com/users/laurianemollier (for users and organizations)
      // https://api.github.com/orgs/open-source-economy (for organizations)
      const response: Response = await fetch(
        `https://api.github.com/users/${ownerId.login.trim()}`,
        {
          method: "GET",
          headers: {
            Authorization: "Token " + config.github.requestToken,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      if (response.ok) {
        const json = await response.json();
        const owner: Owner | ValidationError = Owner.fromGithubApi(json);
        if (owner instanceof ValidationError) {
          logger.error(
            `Invalid JSON response: Owner parsing failed. URL: ${response.url}`,
          );
          return Promise.reject(owner);
        } else {
          return owner;
        }
      } else {
        const errorDetails = `Error fetching owner: Status ${response.status} - ${response.statusText}. URL: ${response.url}`;
        logger.error(errorDetails);
        return Promise.reject(
          new Error(
            `Failed to fetch owner from GitHub. Status: ${response.status} - ${response.statusText}`,
          ),
        );
      }
    } catch (error) {
      logger.error(`Failed to call GitHub API for getOwner: ${error}`);
      return Promise.reject(new Error("Call to GitHub API failed: " + error));
    }
  }

  async getOwnerAndRepository(
    repositoryId: RepositoryId,
  ): Promise<[Owner, Repository]> {
    try {
      const response: Response = await fetch(
        `https://api.github.com/repos/${repositoryId.ownerId.login.trim()}/${repositoryId.name.trim()}`,
        {
          method: "GET",
          headers: {
            Authorization: "Token " + config.github.requestToken,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      if (response.ok) {
        const json = await response.json();
        if (!json.owner) {
          return Promise.reject(
            new Error(
              `Invalid JSON response: Missing owner field. URL: ${response.url}`,
            ),
          );
        }

        const owner: Owner | ValidationError = Owner.fromGithubApi(json.owner);
        const repo: Repository | ValidationError =
          Repository.fromGithubApi(json);
        if (repo instanceof ValidationError) {
          logger.error(
            `Invalid JSON response: Repository parsing failed. URL: ${response.url}`,
          );
          return Promise.reject(repo);
        } else if (owner instanceof ValidationError) {
          logger.error(
            `Invalid JSON response: Owner parsing failed. URL: ${response.url}`,
          );
          return Promise.reject(owner);
        } else {
          return [owner, repo];
        }
      } else {
        return Promise.reject(
          new Error(
            `Failed to fetch repository from GitHub. Status: ${response.status} - ${response.statusText}. URL: ${response.url}`,
          ),
        );
      }
    } catch (error) {
      logger.error(
        `Failed to call GitHub API for getOwnerAndRepository: ${error}`,
      );
      return Promise.reject(new Error("Call to GitHub API failed: " + error));
    }
  }

  async getIssue(issueId: IssueId): Promise<[Issue, Owner]> {
    try {
      const response: Response = await fetch(
        `https://api.github.com/repos/${issueId.repositoryId.ownerId.login.trim()}/${issueId.repositoryId.name.trim()}/issues/${issueId.number}`,
        {
          method: "GET",
          headers: {
            Authorization: "Token " + config.github.requestToken,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      if (response.ok) {
        const json = await response.json();
        const issue: Issue | ValidationError = Issue.fromGithubApi(
          issueId.repositoryId,
          json,
        );
        const openBy: Owner | ValidationError = Owner.fromGithubApi(json.user);
        if (issue instanceof ValidationError) {
          logger.error(
            `Invalid JSON response: Issue parsing failed. URL: ${response.url}`,
          );
          return Promise.reject(issue);
        } else if (openBy instanceof ValidationError) {
          logger.error(
            `Invalid JSON response: Owner parsing failed. URL: ${response.url}`,
          );
          return Promise.reject(openBy);
        } else {
          return [issue, openBy];
        }
      } else {
        const errorDetails = `Error fetching issue: Status ${response.status} - ${response.statusText}. URL: ${response.url}`;
        logger.error(errorDetails);
        return Promise.reject(
          new Error(
            `Failed to fetch issue from GitHub. Status: ${response.status} - ${response.statusText}`,
          ),
        );
      }
    } catch (error) {
      logger.error(`Failed to call GitHub API for getIssue: ${error}`);
      return Promise.reject(new Error("Call to GitHub API failed: " + error));
    }
  }
}

class GitHubServiceImpl implements GitHubService {
  async getUserOrganizations(accessToken: string): Promise<Organization[]> {
    try {
      const response: Response = await fetch(
        'https://api.github.com/user/orgs',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
        },
      );

      if (response.ok) {
        const orgs = await response.json();
        return orgs.map((org: any) => ({
          id: org.id,
          login: org.login,
          name: org.name || org.login,
          avatar_url: org.avatar_url,
          description: org.description,
        }));
      } else {
        const errorDetails = `Error fetching user organizations: Status ${response.status} - ${response.statusText}. URL: ${response.url}`;
        logger.error(errorDetails);
        return Promise.reject(
          new Error(
            `Failed to fetch user organizations from GitHub. Status: ${response.status} - ${response.statusText}`,
          ),
        );
      }
    } catch (error) {
      logger.error(`Failed to call GitHub API for getUserOrganizations: ${error}`);
      return Promise.reject(new Error('Call to GitHub API failed: ' + error));
    }
  }

  async getOrganizationRepositories(org: string, accessToken: string): Promise<Repository[]> {
    try {
      const response: Response = await fetch(
        `https://api.github.com/orgs/${org}/repos?per_page=100`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
        },
      );

      if (response.ok) {
        const repos = await response.json();
        return repos.map((repo: any) => {
          const repository = Repository.fromGithubApi(repo);
          if (repository instanceof ValidationError) {
            logger.warn(`Failed to parse repository: ${repository.message}`);
            return null;
          }
          return repository;
        }).filter(Boolean);
      } else {
        const errorDetails = `Error fetching organization repositories: Status ${response.status} - ${response.statusText}. URL: ${response.url}`;
        logger.error(errorDetails);
        return Promise.reject(
          new Error(
            `Failed to fetch organization repositories from GitHub. Status: ${response.status} - ${response.statusText}`,
          ),
        );
      }
    } catch (error) {
      logger.error(`Failed to call GitHub API for getOrganizationRepositories: ${error}`);
      return Promise.reject(new Error('Call to GitHub API failed: ' + error));
    }
  }

  async getUserRepositories(accessToken: string): Promise<Repository[]> {
    try {
      const response: Response = await fetch(
        'https://api.github.com/user/repos?per_page=100&affiliation=owner,collaborator',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
        },
      );

      if (response.ok) {
        const repos = await response.json();
        return repos.map((repo: any) => {
          const repository = Repository.fromGithubApi(repo);
          if (repository instanceof ValidationError) {
            logger.warn(`Failed to parse repository: ${repository.message}`);
            return null;
          }
          return repository;
        }).filter(Boolean);
      } else {
        const errorDetails = `Error fetching user repositories: Status ${response.status} - ${response.statusText}. URL: ${response.url}`;
        logger.error(errorDetails);
        return Promise.reject(
          new Error(
            `Failed to fetch user repositories from GitHub. Status: ${response.status} - ${response.statusText}`,
          ),
        );
      }
    } catch (error) {
      logger.error(`Failed to call GitHub API for getUserRepositories: ${error}`);
      return Promise.reject(new Error('Call to GitHub API failed: ' + error));
    }
  }
}
