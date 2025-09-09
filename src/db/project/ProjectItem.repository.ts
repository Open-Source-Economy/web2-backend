import { Pool } from "pg";
import { pool } from "../../dbPool";
import {
  OwnerId,
  ProjectItem,
  ProjectItemId,
  ProjectItemType,
  RepositoryId,
  SourceIdentifier,
} from "@open-source-economy/api-types";
import { BaseRepository } from "../helpers";
import { ProjectItemCompanion } from "../helpers/companions";

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
}
