import { Pool } from "pg";
import { pool } from "../../dbPool";
import * as dto from "@open-source-economy/api-types";
import {
  Owner,
  OwnerId,
  ProjectItem,
  ProjectItemId,
  ProjectItemType,
  ProjectItemWithDetails,
  Repository,
  RepositoryId,
  SourceIdentifier,
} from "@open-source-economy/api-types";
import { BaseRepository } from "../helpers";
import {
  DeveloperProfileCompanion,
  DeveloperProjectItemCompanion,
  OwnerCompanion,
  ProjectItemCompanion,
  RepositoryCompanion,
} from "../helpers/companions";

export interface CreateProjectItemParams {
  projectItemType: ProjectItemType;
  sourceIdentifier: SourceIdentifier;
}

export function getProjectItemRepository(): ProjectItemRepository {
  return new ProjectItemRepositoryImpl(pool);
}

export interface ProjectItemRepository {
  /**
   * Creates a new project item.
   *
   * @param params - An object containing the project item details for creation.
   * @returns A promise that resolves to the created ProjectItem.
   */
  create(params: CreateProjectItemParams): Promise<ProjectItem>;
  /**
   * Deletes a project item by its unique ProjectItemId.
   *
   * @param id - The ProjectItemId of the project item to delete.
   * @returns A Promise that resolves when the deletion is complete.
   */
  delete(id: ProjectItemId): Promise<void>;
  /**
   * Retrieves a project item by its unique ProjectItemId.
   *
   * @param id - The ProjectItemId of the project item to retrieve.
   * @returns A Promise that resolves to the ProjectItem if found, otherwise null.
   */
  getById(id: ProjectItemId): Promise<ProjectItem | null>;
  /**
   * Retrieves project items associated with a given project ID.
   *
   * @param projectId - The ProjectItemId of the parent project.
   * @returns A promise that resolves to an array of ProjectItem.
   */
  getByProjectId(projectId: ProjectItemId): Promise<ProjectItem | null>;
  /**
   * Retrieves a project item of type GITHUB_REPOSITORY by its GitHub repository ID.
   *
   * @param repositoryId - The RepositoryId object of the GitHub repository.
   * @returns A promise that resolves to the ProjectItem if found, otherwise null.
   */
  getByGithubRepository(
    repositoryId: RepositoryId,
  ): Promise<ProjectItem | null>;
  /**
   * Retrieves all project items of type GITHUB_OWNER for a given GitHub owner ID.
   *
   * @param ownerId - The OwnerId object of the GitHub owner.
   * @returns A promise that resolves to an array of ProjectItem.
   */
  getByGithubOwner(ownerId: OwnerId): Promise<ProjectItem[]>;

  /**
   * Retrieves a project item based on its URL and type URL.
   *
   * @param url - The URL string of the project item.
   * @returns A promise that resolves to the ProjectItem if found, otherwise null.
   */
  getByUrl(url: string): Promise<ProjectItem | null>;

  /**
   * Retrieves a project item based on its type and source identifier.
   *
   * @param projectItemType - The type of the project item (e.g., GITHUB_REPOSITORY, GITHUB_OWNER, URL).
   * @param sourceIdentifier - The unique identifier of the project item, which can be an OwnerId, RepositoryId, or a string (URL).
   * @returns A promise that resolves to the ProjectItem if found, otherwise null.
   */
  getBySourceIdentifier(
    projectItemType: ProjectItemType,
    sourceIdentifier: SourceIdentifier,
  ): Promise<ProjectItem | null>;

  /**
   * Retrieves all project items with their associated Owner, Repository (if exists),
   * and a list of developers with their profiles, project items associations, and owner info.
   *
   * @param options - Query options for sorting and limiting results
   * @returns A promise that resolves to an object containing project items and total count
   */
  getAllWithDetails(options?: {
    sortBy?: dto.ProjectItemSortField;
    sortOrder?: dto.SortOrder;
    limit?: number;
  }): Promise<{
    projectItems: ProjectItemWithDetails[];
    total: number;
  }>;
}

class ProjectItemRepositoryImpl
  extends BaseRepository<ProjectItem>
  implements ProjectItemRepository
{
  constructor(pool: Pool) {
    super(pool, ProjectItemCompanion);
  }

  async create(params: CreateProjectItemParams): Promise<ProjectItem> {
    console.debug("Create method received params:", params);

    const itemDetails = {
      githubOwnerId: null as number | null,
      githubOwnerLogin: null as string | null,
      githubRepositoryId: null as number | null,
      githubRepositoryName: null as string | null,
      urlValue: null as string | null,
    };

    switch (params.projectItemType) {
      case ProjectItemType.GITHUB_REPOSITORY:
        console.debug("Processing ProjectItemType: GITHUB_REPOSITORY");
        const repo = params.sourceIdentifier as RepositoryId;
        if (repo && typeof repo === "object" && repo.ownerId && repo.githubId) {
          console.debug("Condition for Repository met.");
          itemDetails.githubOwnerId = repo.ownerId.githubId || null;
          itemDetails.githubOwnerLogin = repo.ownerId.login || null;
          itemDetails.githubRepositoryId = repo.githubId || null;
          itemDetails.githubRepositoryName = repo.name || null;
        } else {
          console.debug(
            "Condition for Repository NOT met. SourceIdentifier:",
            params.sourceIdentifier,
          );
        }
        break;
      case ProjectItemType.GITHUB_OWNER:
        console.debug("Processing ProjectItemType: GITHUB_OWNER");
        const owner = params.sourceIdentifier as OwnerId;
        if (owner && typeof owner === "object" && owner.githubId) {
          console.debug("Condition for Owner met.");
          itemDetails.githubOwnerId = owner.githubId || null;
          itemDetails.githubOwnerLogin = owner.login || null;
        } else {
          console.debug(
            "Condition for Owner NOT met. SourceIdentifier:",
            params.sourceIdentifier,
          );
        }
        break;
      case ProjectItemType.URL:
        console.debug("Processing ProjectItemType: URL");
        if (typeof params.sourceIdentifier === "string") {
          console.debug("Condition for URL met.");
          itemDetails.urlValue = params.sourceIdentifier;
        } else {
          console.debug(
            "Condition for URL NOT met. SourceIdentifier:",
            params.sourceIdentifier,
          );
        }
        break;
    }

    console.debug("Final itemDetails before insert:", itemDetails);

    const query = `
      INSERT INTO project_item (
        project_item_type,
        github_owner_id,
        github_owner_login,
        github_repository_id,
        github_repository_name,
        url
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      params.projectItemType,
      itemDetails.githubOwnerId,
      itemDetails.githubOwnerLogin,
      itemDetails.githubRepositoryId,
      itemDetails.githubRepositoryName,
      itemDetails.urlValue,
    ];

    const result = await this.pool.query(query, values);
    return this.getOne(result.rows);
  }

  async delete(id: ProjectItemId): Promise<void> {
    await this.pool.query(`DELETE FROM project_item WHERE id = $1`, [id.uuid]);
  }

  async getById(id: ProjectItemId): Promise<ProjectItem | null> {
    const result = await this.pool.query(
      `SELECT * FROM project_item WHERE id = $1`,
      [id.uuid],
    );
    return this.getOptional(result.rows);
  }

  async getByProjectId(
    projectItemId: ProjectItemId,
  ): Promise<ProjectItem | null> {
    // Changed type to ProjectItemId
    const result = await this.pool.query(
      `SELECT * FROM project_item WHERE id = $1 ORDER BY created_at DESC`,
      [projectItemId.uuid], // Access uuid property
    );
    return this.getOptional(result.rows);
  }

  async getByGithubRepository(
    repositoryId: RepositoryId,
  ): Promise<ProjectItem | null> {
    const result = await this.pool.query(
      `SELECT * FROM project_item
       WHERE github_owner_id = $1 AND github_repository_id = $2`,
      [repositoryId.ownerId.githubId, repositoryId.githubId],
    );
    return this.getOptional(result.rows);
  }

  async getByGithubOwner(ownerId: OwnerId): Promise<ProjectItem[]> {
    const result = await this.pool.query(
      `SELECT * FROM project_item
       WHERE github_owner_id = $1
       ORDER BY created_at DESC`,
      [ownerId.githubId],
    );
    return this.getList(result.rows);
  }

  async getByUrl(url: string): Promise<ProjectItem | null> {
    const result = await this.pool.query(
      `SELECT * FROM project_item WHERE project_item_type = $1 AND url = $2`,
      [ProjectItemType.URL, url],
    );
    return this.getOptional(result.rows);
  }

  /**
   * Retrieves a project item based on its type and source identifier.
   *
   * @param projectItemType - The type of the project item (e.g., GITHUB_REPOSITORY, GITHUB_OWNER, URL).
   * @param sourceIdentifier - The unique identifier of the project item, which can be an OwnerId, RepositoryId, or a string (URL).
   * @returns A promise that resolves to the ProjectItem if found, otherwise null.
   */
  async getBySourceIdentifier(
    projectItemType: ProjectItemType,
    sourceIdentifier: SourceIdentifier,
  ): Promise<ProjectItem | null> {
    switch (projectItemType) {
      case ProjectItemType.GITHUB_REPOSITORY:
        if (!(sourceIdentifier instanceof RepositoryId)) {
          throw new Error(
            `getBySourceIdentifier: sourceIdentifier must be a RepositoryId object for GITHUB_REPOSITORY type. Received type: ${typeof sourceIdentifier}, with value: ${JSON.stringify(sourceIdentifier)}`,
          );
        }
        return await this.getByGithubRepository(sourceIdentifier);

      case ProjectItemType.GITHUB_OWNER:
        if (!(sourceIdentifier instanceof OwnerId)) {
          throw new Error(
            `getBySourceIdentifier: sourceIdentifier must be an OwnerId object for GITHUB_OWNER type. Received type: ${typeof sourceIdentifier}, with value: ${JSON.stringify(sourceIdentifier)}`,
          );
        }
        const ownerItems = await this.getByGithubOwner(sourceIdentifier);
        return ownerItems.length > 0 ? ownerItems[0] : null;

      case ProjectItemType.URL:
        if (typeof sourceIdentifier !== "string") {
          throw new Error(
            `getBySourceIdentifier: sourceIdentifier must be a string (URL) for URL type. Received type: ${typeof sourceIdentifier}, with value: ${JSON.stringify(sourceIdentifier)}`,
          );
        }
        return await this.getByUrl(sourceIdentifier);

      default:
        throw new Error(
          `getBySourceIdentifier: Unsupported project item type for retrieval: ${projectItemType}.`,
        );
    }
  }

  /**
   * Retrieves all project items with their associated Owner, Repository (if exists),
   * and a list of developers with their profiles, project items associations, and owner info.
   */
  async getAllWithDetails(options?: {
    sortBy?: dto.ProjectItemSortField;
    sortOrder?: dto.SortOrder;
    limit?: number;
  }): Promise<{
    projectItems: ProjectItemWithDetails[];
    total: number;
  }> {
    console.log("Starting getAllWithDetails query with options:", options);

    const sortBy = options?.sortBy;
    const sortOrder = options?.sortOrder || dto.SortOrder.DESC;
    const limit = options?.limit;

    // Define table prefixes for clarity and maintainability
    const PREFIX = {
      projectItem: "pi_",
      owner: "", // No prefix for project item's owner
      repository: "repo_",
      developerProfile: "dp_",
      developerProjectItem: "dpi_",
      developerOwner: "devo_", // Changed from 'dev_' to avoid 'do' alias conflict with PostgreSQL reserved keyword
    };

    // Build ORDER BY clause
    let orderByClause = "";
    if (sortBy) {
      switch (sortBy) {
        case dto.ProjectItemSortField.STARS:
        case dto.ProjectItemSortField.STARGAZERS:
          orderByClause = `r.github_stargazers_count ${sortOrder.toUpperCase()} NULLS LAST, pi.created_at DESC`;
          break;
        case dto.ProjectItemSortField.FORKS:
          orderByClause = `r.github_forks_count ${sortOrder.toUpperCase()} NULLS LAST, pi.created_at DESC`;
          break;
        case dto.ProjectItemSortField.MAINTAINERS:
          orderByClause = `maintainers_count ${sortOrder.toUpperCase()}, pi.created_at DESC`;
          break;
        case dto.ProjectItemSortField.CREATED_AT:
          orderByClause = `pi.created_at ${sortOrder.toUpperCase()}`;
          break;
        case dto.ProjectItemSortField.UPDATED_AT:
          orderByClause = `pi.updated_at ${sortOrder.toUpperCase()}`;
          break;
        default:
          orderByClause = "pi.created_at DESC, dp.created_at ASC";
      }
    } else {
      orderByClause = "pi.created_at DESC, dp.created_at ASC";
    }

    // For maintainers sorting, we need to sort in memory
    const needsMaintainersCount =
      sortBy === dto.ProjectItemSortField.MAINTAINERS;

    // First, get the total count
    const countQuery = `
      SELECT COUNT(DISTINCT pi.id) as total
      FROM project_item pi
      LEFT JOIN github_owner o ON pi.github_owner_id = o.github_id
      LEFT JOIN github_repository r ON pi.github_repository_id = r.github_id
    `;
    const countResult = await this.pool.query(countQuery);
    const total = parseInt(countResult.rows[0]?.total || "0");

    // When sorting by maintainers, we can't use LIMIT in SQL, so we'll limit in memory
    // For other sorts, we use a subquery to limit project items before joining developers
    const limitedProjectItemsSubquery =
      !needsMaintainersCount && limit
        ? `
        (SELECT pi2.*
         FROM project_item pi2
         LEFT JOIN github_repository r2 ON pi2.github_repository_id = r2.github_id
         ORDER BY ${orderByClause}
         LIMIT ${limit}) pi
      `
        : "project_item pi";

    const query = `
      SELECT 
        -- Project item columns (prefix: ${PREFIX.projectItem})
        pi.id AS ${PREFIX.projectItem}id,
        pi.project_item_type AS ${PREFIX.projectItem}project_item_type,
        pi.github_owner_id AS ${PREFIX.projectItem}github_owner_id,
        pi.github_owner_login AS ${PREFIX.projectItem}github_owner_login,
        pi.github_repository_id AS ${PREFIX.projectItem}github_repository_id,
        pi.github_repository_name AS ${PREFIX.projectItem}github_repository_name,
        pi.url AS ${PREFIX.projectItem}url,
        pi.created_at AS ${PREFIX.projectItem}created_at,
        pi.updated_at AS ${PREFIX.projectItem}updated_at,
        
        -- Owner columns (for project item) - no prefix
        o.github_id AS ${PREFIX.owner}github_id,
        o.github_type AS ${PREFIX.owner}github_type,
        o.github_login AS ${PREFIX.owner}github_login,
        o.github_html_url AS ${PREFIX.owner}github_html_url,
        o.github_avatar_url AS ${PREFIX.owner}github_avatar_url,
        o.github_followers AS ${PREFIX.owner}github_followers,
        o.github_following AS ${PREFIX.owner}github_following,
        o.github_public_repos AS ${PREFIX.owner}github_public_repos,
        o.github_public_gists AS ${PREFIX.owner}github_public_gists,
        o.github_name AS ${PREFIX.owner}github_name,
        o.github_twitter_username AS ${PREFIX.owner}github_twitter_username,
        o.github_company AS ${PREFIX.owner}github_company,
        o.github_blog AS ${PREFIX.owner}github_blog,
        o.github_location AS ${PREFIX.owner}github_location,
        o.github_email AS ${PREFIX.owner}github_email,
        
        -- Repository columns (prefix: ${PREFIX.repository})
        r.github_id AS ${PREFIX.repository}github_id,
        r.github_owner_id AS ${PREFIX.repository}github_owner_id,
        r.github_owner_login AS ${PREFIX.repository}github_owner_login,
        r.github_name AS ${PREFIX.repository}github_name,
        r.github_html_url AS ${PREFIX.repository}github_html_url,
        r.github_description AS ${PREFIX.repository}github_description,
        r.github_homepage AS ${PREFIX.repository}github_homepage,
        r.github_language AS ${PREFIX.repository}github_language,
        r.github_forks_count AS ${PREFIX.repository}github_forks_count,
        r.github_stargazers_count AS ${PREFIX.repository}github_stargazers_count,
        r.github_watchers_count AS ${PREFIX.repository}github_watchers_count,
        r.github_full_name AS ${PREFIX.repository}github_full_name,
        r.github_fork AS ${PREFIX.repository}github_fork,
        r.github_topics AS ${PREFIX.repository}github_topics,
        r.github_open_issues_count AS ${PREFIX.repository}github_open_issues_count,
        r.github_visibility AS ${PREFIX.repository}github_visibility,
        r.github_subscribers_count AS ${PREFIX.repository}github_subscribers_count,
        r.github_network_count AS ${PREFIX.repository}github_network_count,
        
        -- Developer profile columns (prefix: ${PREFIX.developerProfile})
        dp.id AS ${PREFIX.developerProfile}id,
        dp.user_id AS ${PREFIX.developerProfile}user_id,
        dp.contact_email AS ${PREFIX.developerProfile}contact_email,
        dp.onboarding_completed AS ${PREFIX.developerProfile}onboarding_completed,
        dp.created_at AS ${PREFIX.developerProfile}created_at,
        dp.updated_at AS ${PREFIX.developerProfile}updated_at,
        
        -- Developer project item columns (prefix: ${PREFIX.developerProjectItem})
        dpi.id AS ${PREFIX.developerProjectItem}id,
        dpi.developer_profile_id AS ${PREFIX.developerProjectItem}developer_profile_id,
        dpi.project_item_id AS ${PREFIX.developerProjectItem}project_item_id,
        dpi.merge_rights::text[] AS ${PREFIX.developerProjectItem}merge_rights,
        dpi.roles::text[] AS ${PREFIX.developerProjectItem}roles,
        dpi.comment AS ${PREFIX.developerProjectItem}comment,
        dpi.created_at AS ${PREFIX.developerProjectItem}created_at,
        dpi.updated_at AS ${PREFIX.developerProjectItem}updated_at,
        
        -- Developer owner columns (prefix: ${PREFIX.developerOwner})
        devo.github_id AS ${PREFIX.developerOwner}github_id,
        devo.github_type AS ${PREFIX.developerOwner}github_type,
        devo.github_login AS ${PREFIX.developerOwner}github_login,
        devo.github_html_url AS ${PREFIX.developerOwner}github_html_url,
        devo.github_avatar_url AS ${PREFIX.developerOwner}github_avatar_url,
        devo.github_followers AS ${PREFIX.developerOwner}github_followers,
        devo.github_following AS ${PREFIX.developerOwner}github_following,
        devo.github_public_repos AS ${PREFIX.developerOwner}github_public_repos,
        devo.github_public_gists AS ${PREFIX.developerOwner}github_public_gists,
        devo.github_name AS ${PREFIX.developerOwner}github_name,
        devo.github_twitter_username AS ${PREFIX.developerOwner}github_twitter_username,
        devo.github_company AS ${PREFIX.developerOwner}github_company,
        devo.github_blog AS ${PREFIX.developerOwner}github_blog,
        devo.github_location AS ${PREFIX.developerOwner}github_location,
        devo.github_email AS ${PREFIX.developerOwner}github_email
        
      FROM ${limitedProjectItemsSubquery}
      
      -- LEFT JOIN to get the project item's owner (if it's a GitHub type)
      LEFT JOIN github_owner o 
        ON pi.github_owner_id = o.github_id
      
      -- LEFT JOIN to get the project item's repository (if it's a GITHUB_REPOSITORY)
      LEFT JOIN github_repository r 
        ON pi.github_repository_id = r.github_id
      
      -- LEFT JOIN to get all developers associated with this project item
      LEFT JOIN developer_project_items dpi 
        ON pi.id = dpi.project_item_id
      
      -- LEFT JOIN to get developer profile information
      LEFT JOIN developer_profile dp 
        ON dpi.developer_profile_id = dp.id
      
      -- LEFT JOIN to get the developer's GitHub owner information
      LEFT JOIN app_user au 
        ON dp.user_id = au.id
      LEFT JOIN github_owner devo 
        ON au.github_owner_id = devo.github_id
      
      ${
        !needsMaintainersCount && !limit
          ? `ORDER BY ${orderByClause}`
          : needsMaintainersCount
            ? "ORDER BY pi.created_at DESC, dp.created_at ASC"
            : "ORDER BY dp.created_at ASC"
      }
    `;

    const result = await this.pool.query(query);

    console.log(`Query returned ${result.rows.length} rows`);

    // Group the results by project item
    const projectItemsMap = new Map<string, ProjectItemWithDetails>();
    let skippedDevelopersCount = 0;
    let processedDevelopersCount = 0;

    for (const row of result.rows) {
      const projectItemId = row[`${PREFIX.projectItem}id`];

      // Get or create the project item entry
      if (!projectItemsMap.has(projectItemId)) {
        // Parse project item
        const projectItem = ProjectItemCompanion.fromBackend(
          row,
          PREFIX.projectItem,
        );
        if (projectItem instanceof Error) {
          throw projectItem;
        }

        // Parse owner (if exists)
        let owner: Owner | null = null;
        if (row[`${PREFIX.owner}github_id`]) {
          const ownerResult = OwnerCompanion.fromBackend(row, PREFIX.owner);
          if (ownerResult instanceof Error) {
            throw ownerResult;
          }
          owner = ownerResult;
        }

        // Parse repository (if exists)
        let repository: Repository | null = null;
        if (row[`${PREFIX.repository}github_id`]) {
          const repoResult = RepositoryCompanion.fromBackend(
            row,
            PREFIX.repository,
          );
          if (repoResult instanceof Error) {
            throw repoResult;
          }
          repository = repoResult;
        }

        projectItemsMap.set(projectItemId, {
          projectItem,
          owner,
          repository,
          developers: [],
        });
      }

      // Add developer info if present
      if (row[`${PREFIX.developerProfile}id`]) {
        const projectItemDetails = projectItemsMap.get(projectItemId)!;

        // Skip developers without a GitHub owner (not yet linked)
        if (!row[`${PREFIX.developerOwner}github_id`]) {
          skippedDevelopersCount++;
          console.warn(`Skipping developer without GitHub owner:`, {
            developerProfileId: row[`${PREFIX.developerProfile}id`],
            userId: row[`${PREFIX.developerProfile}user_id`],
            contactEmail: row[`${PREFIX.developerProfile}contact_email`],
            projectItemId: row[`${PREFIX.projectItem}id`],
            projectItemType: row[`${PREFIX.projectItem}project_item_type`],
            reason: "No GitHub owner linked to user account",
            devOwnerGithubId: row[`${PREFIX.developerOwner}github_id`],
            allDeveloperOwnerFields: Object.keys(row).filter((key) =>
              key.startsWith(PREFIX.developerOwner),
            ),
          });
          continue;
        }

        processedDevelopersCount++;

        // Parse developer profile
        const developerProfile = DeveloperProfileCompanion.fromBackend(
          row,
          PREFIX.developerProfile,
        );
        if (developerProfile instanceof Error) {
          throw developerProfile;
        }

        // Parse developer project item
        const developerProjectItem = DeveloperProjectItemCompanion.fromBackend(
          row,
          PREFIX.developerProjectItem,
        );
        if (developerProjectItem instanceof Error) {
          throw developerProjectItem;
        }

        // Parse developer owner
        const developerOwner = OwnerCompanion.fromBackend(
          row,
          PREFIX.developerOwner,
        );
        if (developerOwner instanceof Error) {
          throw developerOwner;
        }

        projectItemDetails.developers.push({
          developerProfile,
          developerProjectItem,
          developerOwner,
        });
      }
    }

    let projectItems = Array.from(projectItemsMap.values());

    // If sorting by maintainers, we need to sort in memory since we have the count
    if (sortBy === dto.ProjectItemSortField.MAINTAINERS) {
      projectItems.sort((a, b) => {
        const countA = a.developers.length;
        const countB = b.developers.length;
        const comparison = countA - countB;
        return sortOrder === dto.SortOrder.ASC ? comparison : -comparison;
      });

      // Apply limit after sorting
      if (limit) {
        projectItems = projectItems.slice(0, limit);
      }
    }
    // For other sorts, apply limit via SQL (already handled in query)
    else if (limit && !needsMaintainersCount) {
      // Limit was already applied in SQL
    }

    console.log("getAllWithDetails query completed:", {
      totalRows: result.rows.length,
      projectItemsCount: projectItems.length,
      total,
      processedDevelopers: processedDevelopersCount,
      skippedDevelopers: skippedDevelopersCount,
      totalDevelopersInResult: projectItems.reduce(
        (sum, item) => sum + item.developers.length,
        0,
      ),
      sortBy,
      sortOrder,
      limit,
    });

    return {
      projectItems,
      total,
    };
  }
}
