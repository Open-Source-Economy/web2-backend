import {
  Issue,
  IssueId,
  Owner,
  OwnerId,
  Repository,
  RepositoryId,
  ValidationError,
} from "@open-source-economy/api-types";
import { config, logger } from "../config";

export function getGitHubAPI(): GitHubApi {
  return new GitHubApiImpl();
}

export function getGitHubService(): GitHubApi {
  return new GitHubApiImpl();
}

export interface GitHubApi {
  getOwner(ownerId: OwnerId): Promise<Owner>;

  getOwnerAndRepository(
    repositoryId: RepositoryId,
  ): Promise<[Owner, Repository]>;

  getIssue(issueId: IssueId): Promise<[Issue, Owner]>;

  /**
   * Retrieves a list of organizations the authenticated user belongs to.
   * @param accessToken - The GitHub access token for authentication.
   * @returns A promise that resolves to an array of Owner objects representing organizations.
   */
  listAuthenticatedUserOrganizations(accessToken: string): Promise<Owner[]>;

  /**
   * Retrieves a list of repositories for a given organization.
   * @param ownerId - The OwnerId object of the organization.
   * @param accessToken - The GitHub access token for authentication.
   * @returns A promise that resolves to an array of Repository objects.
   */
  listOrganizationRepositories(
    ownerId: OwnerId,
    accessToken: string,
  ): Promise<Repository[]>;

  /**
   * Retrieves a list of repositories owned by or accessible to the authenticated user.
   * @param accessToken - The GitHub access token for authentication.
   * @returns A promise that resolves to an array of Repository objects.
   */
  listAuthenticatedUserRepositories(accessToken: string): Promise<Repository[]>;

  /**
   * Retrieves repositories a specific user has contributed to, meeting a minimum contribution threshold.
   * This involves fetching all accessible repositories and then checking contributor stats for each.
   *
   * @param accessToken - The GitHub access token for authentication.
   * @param userGithubId - The GitHub ID of the user whose contributions are being checked.
   * @param minContributions - The minimum number of contributions required for a repository to be included.
   * @returns A promise that resolves to an array of Repository objects the user contributed to.
   */
  listRepositoriesWithUserContribution(
    accessToken: string,
    userGithubId: OwnerId,
    minContributions: number,
  ): Promise<Repository[]>;
}

class GitHubApiImpl implements GitHubApi {
  // Centralized GitHub API request handler
  private async request<T>(
    url: string,
    method: string,
    errorHandlerMessage: string,
    accessToken?: string,
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      headers.Authorization = `Token ${config.github.requestToken}`;
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
      });

      if (!response.ok) {
        const errorDetails = `Status ${response.status} - ${response.statusText}. URL: ${response.url}`;
        logger.error(`${errorHandlerMessage}: ${errorDetails}`);
        throw new Error(
          `${errorHandlerMessage}. Status: ${response.status} - ${response.statusText}`,
        );
      }
      return await response.json();
    } catch (error) {
      logger.error(
        `Failed to call GitHub API for ${errorHandlerMessage}: ${error}`,
      );
      throw new Error(`Call to GitHub API failed: ${error}`);
    }
  }

  async getOwner(ownerId: OwnerId): Promise<Owner> {
    const url = `https://api.github.com/users/${ownerId.login.trim()}`;
    const json = await this.request<any>(url, "GET", "Error fetching owner");

    const owner = Owner.fromGithubApi(json);
    if (owner instanceof ValidationError) {
      logger.error(`Invalid JSON response: Owner parsing failed. URL: ${url}`);
      throw owner;
    }
    return owner;
  }

  async getOwnerAndRepository(
    repositoryId: RepositoryId,
  ): Promise<[Owner, Repository]> {
    const url = `https://api.github.com/repos/${repositoryId.ownerId.login.trim()}/${repositoryId.name.trim()}`;
    const json = await this.request<any>(
      url,
      "GET",
      "Error fetching repository",
    );

    if (!json.owner) {
      throw new Error(
        `Invalid JSON response: Missing owner field. URL: ${url}`,
      );
    }

    const owner = Owner.fromGithubApi(json.owner);
    const repo = Repository.fromGithubApi(json);

    if (repo instanceof ValidationError) {
      logger.error(
        `Invalid JSON response: Repository parsing failed. URL: ${url}`,
      );
      throw repo;
    } else if (owner instanceof ValidationError) {
      logger.error(`Invalid JSON response: Owner parsing failed. URL: ${url}`);
      throw owner;
    }
    return [owner, repo];
  }

  async getIssue(issueId: IssueId): Promise<[Issue, Owner]> {
    const url = `https://api.github.com/repos/${issueId.repositoryId.ownerId.login.trim()}/${issueId.repositoryId.name.trim()}/issues/${issueId.number}`;
    const json = await this.request<any>(url, "GET", "Error fetching issue");

    const issue = Issue.fromGithubApi(issueId.repositoryId, json);
    const openedBy = Owner.fromGithubApi(json.user);

    if (issue instanceof ValidationError) {
      logger.error(`Invalid JSON response: Issue parsing failed. URL: ${url}`);
      throw issue;
    } else if (openedBy instanceof ValidationError) {
      logger.error(`Invalid JSON response: Owner parsing failed. URL: ${url}`);
      throw openedBy;
    }
    return [issue, openedBy];
  }

  async listAuthenticatedUserOrganizations(
    accessToken: string,
  ): Promise<Owner[]> {
    const url = "https://api.github.com/user/orgs";
    const orgsJson = await this.request<any[]>(
      url,
      "GET",
      "Error fetching user organizations",
      accessToken,
    );

    return orgsJson
      .map((org: any) => {
        const owner = Owner.fromGithubApi(org);
        if (owner instanceof ValidationError) {
          logger.warn(
            `Failed to parse organization as Owner: ${owner.message}`,
          );
          return null;
        }
        return owner;
      })
      .filter(Boolean) as Owner[];
  }

  async listOrganizationRepositories(
    ownerId: OwnerId,
    accessToken: string,
  ): Promise<Repository[]> {
    const url = `https://api.github.com/orgs/${ownerId.login.trim()}/repos?per_page=100`;
    const reposJson = await this.request<any[]>(
      url,
      "GET",
      "Error fetching organization repositories",
      accessToken,
    );

    return reposJson
      .map((repo: any) => {
        const repository = Repository.fromGithubApi(repo);
        if (repository instanceof ValidationError) {
          logger.warn(`Failed to parse repository: ${repository.message}`);
          return null;
        }
        return repository;
      })
      .filter(Boolean) as Repository[];
  }

  async listAuthenticatedUserRepositories(
    accessToken: string,
  ): Promise<Repository[]> {
    const url =
      "https://api.github.com/user/repos?per_page=100&affiliation=owner,collaborator";
    const reposJson = await this.request<any[]>(
      url,
      "GET",
      "Error fetching user repositories",
      accessToken,
    );

    return reposJson
      .map((repo: any) => {
        const repository = Repository.fromGithubApi(repo);
        if (repository instanceof ValidationError) {
          logger.warn(`Failed to parse repository: ${repository.message}`);
          return null;
        }
        return repository;
      })
      .filter(Boolean) as Repository[];
  }

  // TODO: improve implementation to be more performant and handle rate limits and errors more gracefully
  async listRepositoriesWithUserContribution(
    accessToken: string,
    userGithubId: OwnerId,
    minContributions: number,
  ): Promise<Repository[]> {
    const contributedRepositories: Repository[] = [];

    // First, get all repositories the authenticated user has access to
    const allAccessibleRepos =
      await this.listAuthenticatedUserRepositories(accessToken);

    for (const repo of allAccessibleRepos) {
      try {
        const contributorsUrl = `https://api.github.com/repos/${repo.id.ownerId.login.trim()}/${repo.id.name.trim()}/contributors?anon=true`;
        const contributors: any[] = await this.request<any[]>(
          contributorsUrl,
          "GET",
          `Error fetching contributors for ${repo.id.ownerId.login}/${repo.id.name}`,
          accessToken,
        );

        // Find the specific user's contributions
        const userContributor = contributors.find(
          (contributor: any) => contributor.id === userGithubId.githubId,
        );

        if (
          userContributor &&
          userContributor.contributions >= minContributions
        ) {
          contributedRepositories.push(repo);
        }
      } catch (error) {
        // Log the error but don't stop the entire process for one failed repo
        logger.warn(
          `Could not get contributions for repository ${repo.id.ownerId.login}/${repo.id.name}: ${error}`,
        );
      }
    }

    return contributedRepositories;
  }
}
