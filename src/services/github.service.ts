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
import { Paginator, RateLimiter } from "../utils";

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
   * Uses the configured GitHub token for authentication.
   * @returns A promise that resolves to an array of Owner objects representing organizations.
   */
  listAuthenticatedUserOrganizations(): Promise<Owner[]>;

  /**
   * Retrieves a single page of repositories for a given organization.
   * Uses the configured GitHub token for authentication.
   * @param ownerId - The OwnerId object of the organization.
   * @param page - The page number to fetch (default: 1).
   * @param perPage - Number of repositories per page (max: 100, default: 100).
   * @returns A promise that resolves to an array of Repository objects.
   */
  listOrganizationRepositories(
    ownerId: OwnerId,
    page?: number,
    perPage?: number,
  ): Promise<Repository[]>;

  /**
   * Retrieves ALL repositories for a given organization with pagination and rate limiting.
   * Uses the configured GitHub token for authentication.
   * Automatically handles pagination and includes delays to avoid rate limiting.
   *
   * ⚠️ WARNING: This operation can take a long time for large organizations.
   * For example, an organization with 6,000 repos will take ~9 seconds just for pagination delays
   * (60 pages × 150ms delay) plus additional time for API requests.
   *
   * @param ownerId - The OwnerId object of the organization.
   * @returns A promise that resolves to an array of all Repository objects.
   */
  listAllOrganizationRepositories(ownerId: OwnerId): Promise<Repository[]>;

  /**
   * Retrieves a single page of repositories for a given user.
   * Uses the configured GitHub token for authentication.
   * @param ownerId - The OwnerId object of the user.
   * @param page - The page number to fetch (default: 1).
   * @param perPage - Number of repositories per page (max: 100, default: 100).
   * @returns A promise that resolves to an array of Repository objects.
   */
  listUserRepositories(
    ownerId: OwnerId,
    page?: number,
    perPage?: number,
  ): Promise<Repository[]>;

  /**
   * Retrieves ALL repositories for a given user with pagination and rate limiting.
   * Uses the configured GitHub token for authentication.
   * Automatically handles pagination and includes delays to avoid rate limiting.
   *
   * @param ownerId - The OwnerId object of the user.
   * @returns A promise that resolves to an array of all Repository objects owned by the user.
   */
  listAllUserRepositories(ownerId: OwnerId): Promise<Repository[]>;

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

  /**
   * Fetches multiple repositories in a single GraphQL request.
   * More efficient than making individual REST API calls.
   *
   * @param repositoryIds - Array of repository IDs to fetch
   * @returns Promise resolving to array of [Owner, Repository] tuples in the same order as input
   */
  getRepositoriesBulk(
    repositoryIds: RepositoryId[],
  ): Promise<Array<[Owner, Repository]>>;

  /**
   * Fetches multiple owners (users/organizations) in a single GraphQL request.
   * More efficient than making individual REST API calls.
   *
   * @param ownerIds - Array of owner IDs to fetch
   * @returns Promise resolving to array of Owner objects in the same order as input
   */
  getOwnersBulk(ownerIds: OwnerId[]): Promise<Owner[]>;
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
      headers.Authorization = `Bearer ${config.github.publicAccessToken}`;
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

  /**
   * GraphQL API request handler
   *
   * @param query - The GraphQL query string
   * @param errorHandlerMessage - Error message for logging
   * @param useOrgToken - If true, uses the read:org token. If false, uses the public access token.
   *                      Default: false
   *
   * WHY TWO TOKENS ARE REQUIRED:
   * GitHub's GraphQL API has strict scope requirements:
   * - Public queries (repositories, users): Can use a token with public access (no special scopes)
   * - Organization queries: Require read:org scope, which is not needed for public queries
   *
   * Using separate tokens provides:
   * 1. Better security: Use minimal scopes for each operation (principle of least privilege)
   * 2. Clear separation of concerns: Public access token for public data, read:org token only when needed
   * 3. Flexibility: The public access token can be used without organization permissions
   */
  private async graphqlRequest<T>(
    query: string,
    errorHandlerMessage: string,
    useOrgToken: boolean = false,
  ): Promise<T> {
    const token = useOrgToken
      ? config.github.readOrgToken
      : config.github.publicAccessToken;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v4+json",
      Authorization: `Bearer ${token}`,
    };

    try {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorDetails = `Status ${response.status} - ${response.statusText}`;
        logger.error(`${errorHandlerMessage}: ${errorDetails}`);
        throw new Error(
          `${errorHandlerMessage}. Status: ${response.status} - ${response.statusText}`,
        );
      }

      const json = await response.json();
      if (json.errors) {
        const errorMessages = json.errors.map((e: any) => e.message).join("; ");
        logger.error(
          `${errorHandlerMessage}: GraphQL errors: ${errorMessages}`,
        );
        throw new Error(`${errorHandlerMessage}: ${errorMessages}`);
      }

      return json.data as T;
    } catch (error) {
      logger.error(
        `Failed to call GitHub GraphQL API for ${errorHandlerMessage}: ${error}`,
      );
      throw new Error(`Call to GitHub GraphQL API failed: ${error}`);
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

  async listAuthenticatedUserOrganizations(): Promise<Owner[]> {
    const url = "https://api.github.com/user/orgs";
    const orgsJson = await this.request<any[]>(
      url,
      "GET",
      "Error fetching user organizations",
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
    page: number = 1,
    perPage: number = 100,
  ): Promise<Repository[]> {
    const url = `https://api.github.com/orgs/${ownerId.login.trim()}/repos?per_page=${perPage}&page=${page}`;
    const reposJson = await this.request<any[]>(
      url,
      "GET",
      `Error fetching organization repositories (page ${page})`,
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

  async listAllOrganizationRepositories(
    ownerId: OwnerId,
  ): Promise<Repository[]> {
    const rateLimiter = new RateLimiter(config.github.sync.rateLimitDelayMs);

    const result = await Paginator.fetchAllPages(
      (page, perPage) =>
        this.listOrganizationRepositories(ownerId, page, perPage),
      {
        perPage: 100,
        rateLimiter,
      },
      `organization ${ownerId.login} repositories`,
    );

    return result.allItems;
  }

  async listUserRepositories(
    ownerId: OwnerId,
    page: number = 1,
    perPage: number = 100,
  ): Promise<Repository[]> {
    const url = `https://api.github.com/users/${ownerId.login.trim()}/repos?per_page=${perPage}&page=${page}&type=owner`;
    const reposJson = await this.request<any[]>(
      url,
      "GET",
      `Error fetching user repositories (page ${page})`,
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

  async listAllUserRepositories(ownerId: OwnerId): Promise<Repository[]> {
    const rateLimiter = new RateLimiter(config.github.sync.rateLimitDelayMs);

    const result = await Paginator.fetchAllPages(
      (page, perPage) => this.listUserRepositories(ownerId, page, perPage),
      {
        perPage: 100,
        rateLimiter,
      },
      `user ${ownerId.login} repositories`,
    );

    return result.allItems;
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

  async getRepositoriesBulk(
    repositoryIds: RepositoryId[],
  ): Promise<Array<[Owner, Repository]>> {
    if (repositoryIds.length === 0) {
      return [];
    }

    /**
     * Note on token usage: This method uses the public access token (not the read:org token).
     * Repository queries can use public access (no special scopes), even when the repository
     * owner is an organization. The read:org token is only needed when querying organization
     * nodes directly (see getOwnersBulk).
     */

    // Build GraphQL query with aliases for each repository
    // Note: GraphQL field names use camelCase, not snake_case
    // Use databaseId instead of id to get numeric IDs (GraphQL id is a base64 node ID)
    const repositoryFields = `
      databaseId
      name
      url
      description
      homepageUrl
      primaryLanguage {
        name
      }
      forkCount
      stargazerCount
      watchers {
        totalCount
      }
      isFork
      repositoryTopics(first: 20) {
        nodes {
          topic {
            name
          }
        }
      }
      issues(states: OPEN) {
        totalCount
      }
      visibility
      watchers {
        totalCount
      }
      owner {
        ... on User {
          login
          databaseId
          url
          avatarUrl
          followers {
            totalCount
          }
          following {
            totalCount
          }
          repositories {
            totalCount
          }
          gists {
            totalCount
          }
          name
          twitterUsername
          company
          websiteUrl
          location
        }
        ... on Organization {
          login
          databaseId
          url
          avatarUrl
          repositories {
            totalCount
          }
          name
          twitterUsername
          websiteUrl
          location
        }
      }
    `;

    const queryParts = repositoryIds.map(
      (repoId, index) => `
      repo${index}: repository(owner: "${repoId.ownerId.login}", name: "${repoId.name}") {
        ${repositoryFields}
      }
    `,
    );

    const query = `
      query {
        ${queryParts.join("\n")}
      }
    `;

    logger.debug(`Fetching ${repositoryIds.length} repositories via GraphQL`);

    const data = await this.graphqlRequest<Record<string, any>>(
      query,
      "Error fetching repositories via GraphQL",
    );

    const results: Array<[Owner, Repository]> = [];

    for (let i = 0; i < repositoryIds.length; i++) {
      const repoData = data[`repo${i}`];
      if (!repoData) {
        throw new Error(
          `Repository not found: ${repositoryIds[i].ownerId.login}/${repositoryIds[i].name}`,
        );
      }

      // Convert GraphQL response to REST API format for parsing
      const ownerData = repoData.owner;
      const isOrganization = ownerData.__typename === "Organization";

      const restFormatOwner = {
        login: ownerData.login,
        id: ownerData.databaseId, // Use databaseId (numeric) instead of id (base64 node ID)
        type: isOrganization ? "Organization" : "User",
        html_url: ownerData.url,
        avatar_url: ownerData.avatarUrl,
        followers: ownerData.followers?.totalCount,
        following: isOrganization ? undefined : ownerData.following?.totalCount,
        public_repos: ownerData.repositories?.totalCount,
        public_gists: isOrganization ? undefined : ownerData.gists?.totalCount,
        name: ownerData.name,
        twitter_username: ownerData.twitterUsername,
        company: isOrganization ? undefined : ownerData.company,
        website_url: ownerData.websiteUrl,
        location: ownerData.location,
        // Email requires special scopes, so we omit it
        email: undefined,
      };

      const restFormatRepo = {
        id: repoData.databaseId, // Use databaseId (numeric) instead of id (base64 node ID)
        name: repoData.name,
        full_name: `${ownerData.login}/${repoData.name}`,
        html_url: repoData.url,
        description: repoData.description,
        homepage: repoData.homepageUrl,
        language: repoData.primaryLanguage?.name,
        forks_count: repoData.forkCount,
        stargazers_count: repoData.stargazerCount,
        watchers_count: repoData.watchers?.totalCount,
        fork: repoData.isFork,
        topics:
          repoData.repositoryTopics?.nodes?.map((n: any) => n.topic.name) || [],
        open_issues_count: repoData.issues?.totalCount,
        visibility: repoData.visibility?.toLowerCase(),
        subscribers_count: repoData.watchers?.totalCount,
        network_count: repoData.forkCount, // Approximate
        owner: restFormatOwner,
      };

      const owner = Owner.fromGithubApi(restFormatOwner);
      if (owner instanceof ValidationError) {
        throw new Error(
          `Failed to parse owner for ${repositoryIds[i].ownerId.login}/${repositoryIds[i].name}: ${owner.message}`,
        );
      }

      const repository = Repository.fromGithubApi(restFormatRepo);
      if (repository instanceof ValidationError) {
        throw new Error(
          `Failed to parse repository ${repositoryIds[i].ownerId.login}/${repositoryIds[i].name}: ${repository.message}`,
        );
      }

      results.push([owner, repository]);
    }

    return results;
  }

  async getOwnersBulk(ownerIds: OwnerId[]): Promise<Owner[]> {
    if (ownerIds.length === 0) {
      return [];
    }

    /**
     * GraphQL Implementation for Bulk Owner Fetching
     *
     * PROBLEM: GitHub's GraphQL API treats users and organizations as separate types.
     * When querying an organization using the `user` query, GraphQL throws an error
     * ("Could not resolve to a User") instead of returning null. This prevents us
     * from querying both types in a single GraphQL query using aliases.
     *
     * SOLUTION: We query each owner individually, trying user first, then falling
     * back to organization if the user query fails. This approach:
     * - Handles both users and organizations correctly
     * - Gracefully falls back from user to organization queries
     * - Provides better error messages if neither type matches
     *
     * PERFORMANCE NOTE: This results in N GraphQL queries (one per owner) instead
     * of a single bulk query. For better performance with large batches, consider
     * using REST API with rate limiting, or implement batching strategies.
     *
     * TODO: In the future, we should consider adding separate project types for
     * organizations vs users (e.g., GITHUB_USER and GITHUB_ORGANIZATION) instead
     * of the generic GITHUB_OWNER type. This would allow us to:
     * - Know the type ahead of time and skip the try/catch logic
     * - Use more efficient bulk GraphQL queries (group users and orgs separately)
     * - Improve type safety and API clarity
     * - Potentially reduce API calls by querying like-types in batches
     * - Use the appropriate token (standard vs org) without needing try/catch
     *
     * TOKEN USAGE:
     * - User queries: Uses public access token (config.github.publicAccessToken - no special scopes)
     * - Organization queries: Uses read:org token (config.github.readOrgToken - requires read:org scope)
     */

    // Build GraphQL query fields for users and organizations
    // Use databaseId instead of id to get numeric IDs (GraphQL id is a base64 node ID)
    // Only request public fields that don't require special scopes
    const userFields = `
      login
      databaseId
      url
      avatarUrl
      followers {
        totalCount
      }
      following {
        totalCount
      }
      repositories {
        totalCount
      }
      gists {
        totalCount
      }
      name
      twitterUsername
      company
      websiteUrl
      location
    `;

    const orgFields = `
      login
      databaseId
      url
      avatarUrl
      repositories {
        totalCount
      }
      name
      twitterUsername
      websiteUrl
      location
    `;

    // Query each owner individually to handle errors gracefully
    // We can't query both user and org in one query because GraphQL throws errors when user doesn't exist
    const results: Owner[] = [];

    for (let i = 0; i < ownerIds.length; i++) {
      const ownerId = ownerIds[i];
      let ownerData: any = null;
      let isOrganization = false;

      try {
        // Try user first
        const userQuery = `
          query {
            owner: user(login: "${ownerId.login}") {
              ${userFields}
            }
          }
        `;

        const userResponse = await this.graphqlRequest<{ owner: any }>(
          userQuery,
          `Error fetching user ${ownerId.login}`,
        );

        if (userResponse.owner) {
          ownerData = userResponse.owner;
          isOrganization = false;
        }
      } catch (userError) {
        // If user query fails, try organization
        const errorMessage =
          userError instanceof Error ? userError.message : String(userError);
        if (errorMessage.includes("Could not resolve to a User")) {
          try {
            const orgQuery = `
              query {
                owner: organization(login: "${ownerId.login}") {
                  ${orgFields}
                }
              }
            `;

            // Use organization token (requires read:org scope)
            const orgResponse = await this.graphqlRequest<{ owner: any }>(
              orgQuery,
              `Error fetching organization ${ownerId.login}`,
              true, // useOrgToken = true
            );

            if (orgResponse.owner) {
              ownerData = orgResponse.owner;
              isOrganization = true;
            }
          } catch (orgError) {
            throw new Error(
              `Owner not found (neither user nor organization): ${ownerId.login}`,
            );
          }
        } else {
          throw userError;
        }
      }

      if (!ownerData) {
        throw new Error(`Owner not found: ${ownerId.login}`);
      }

      // Convert GraphQL response to REST API format for parsing
      const restFormatOwner = {
        login: ownerData.login,
        id: ownerData.databaseId, // Use databaseId (numeric) instead of id (base64 node ID)
        type: isOrganization ? "Organization" : "User",
        html_url: ownerData.url,
        avatar_url: ownerData.avatarUrl,
        followers: ownerData.followers?.totalCount,
        following: isOrganization ? undefined : ownerData.following?.totalCount,
        public_repos: ownerData.repositories?.totalCount,
        public_gists: isOrganization ? undefined : ownerData.gists?.totalCount,
        name: ownerData.name,
        twitter_username: ownerData.twitterUsername,
        company: isOrganization ? undefined : ownerData.company,
        website_url: ownerData.websiteUrl,
        location: ownerData.location,
        // Email requires special scopes, so we omit it
        email: undefined,
      };

      const owner = Owner.fromGithubApi(restFormatOwner);
      if (owner instanceof ValidationError) {
        throw new Error(
          `Failed to parse owner ${ownerId.login}: ${owner.message}`,
        );
      }

      results.push(owner);
    }

    return results;
  }
}
