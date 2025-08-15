import { Pool } from "pg";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export enum ProjectItemType {
  GITHUB_REPOSITORY = "GITHUB_REPOSITORY",
  GITHUB_OWNER = "GITHUB_OWNER",
  URL = "URL",
}

export interface ProjectItem {
  id: string;
  projectId: string | null;
  projectItemType: ProjectItemType;
  githubOwnerId?: number | null;
  githubOwnerLogin?: string | null;
  githubRepositoryId?: number | null;
  githubRepositoryName?: string | null;
  url?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function getProjectItemRepository(): ProjectItemRepository {
  return new ProjectItemRepositoryImpl(pool);
}

export interface ProjectItemRepository {
  create(item: Omit<ProjectItem, "id" | "createdAt" | "updatedAt">): Promise<ProjectItem>;
  update(id: string, item: Partial<ProjectItem>): Promise<ProjectItem>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<ProjectItem | null>;
  getByProjectId(projectId: string): Promise<ProjectItem[]>;
  getByGithubRepository(ownerId: number, repositoryId: number): Promise<ProjectItem | null>;
  getByGithubOwner(ownerId: number): Promise<ProjectItem[]>;
  createGithubRepositoryItem(
    projectId: string | null,
    ownerId: number,
    ownerLogin: string,
    repositoryId: number,
    repositoryName: string
  ): Promise<ProjectItem>;
  createGithubOwnerItem(
    projectId: string | null,
    ownerId: number,
    ownerLogin: string
  ): Promise<ProjectItem>;
  createUrlItem(projectId: string | null, url: string): Promise<ProjectItem>;
}

class ProjectItemRepositoryImpl implements ProjectItemRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async create(item: Omit<ProjectItem, "id" | "createdAt" | "updatedAt">): Promise<ProjectItem> {
    const query = `
      INSERT INTO project_item (
        project_id,
        project_item_type,
        github_owner_id,
        github_owner_login,
        github_repository_id,
        github_repository_name,
        url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      item.projectId,
      item.projectItemType,
      item.githubOwnerId || null,
      item.githubOwnerLogin || null,
      item.githubRepositoryId || null,
      item.githubRepositoryName || null,
      item.url || null,
    ];

    const result = await this.pool.query(query, values);
    return this.mapToProjectItem(result.rows[0]);
  }

  async update(id: string, item: Partial<ProjectItem>): Promise<ProjectItem> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (item.projectId !== undefined) {
      setParts.push(`project_id = $${paramIndex}`);
      values.push(item.projectId);
      paramIndex++;
    }

    setParts.push(`updated_at = now()`);
    values.push(id);

    const query = `
      UPDATE project_item
      SET ${setParts.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`ProjectItem not found with id ${id}`);
    }
    return this.mapToProjectItem(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM project_item WHERE id = $1`, [id]);
  }

  async getById(id: string): Promise<ProjectItem | null> {
    const result = await this.pool.query(
      `SELECT * FROM project_item WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToProjectItem(result.rows[0]);
  }

  async getByProjectId(projectId: string): Promise<ProjectItem[]> {
    const result = await this.pool.query(
      `SELECT * FROM project_item WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId]
    );
    return result.rows.map(row => this.mapToProjectItem(row));
  }

  async getByGithubRepository(ownerId: number, repositoryId: number): Promise<ProjectItem | null> {
    const result = await this.pool.query(
      `SELECT * FROM project_item 
       WHERE github_owner_id = $1 AND github_repository_id = $2`,
      [ownerId, repositoryId]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToProjectItem(result.rows[0]);
  }

  async getByGithubOwner(ownerId: number): Promise<ProjectItem[]> {
    const result = await this.pool.query(
      `SELECT * FROM project_item 
       WHERE github_owner_id = $1 
       ORDER BY created_at DESC`,
      [ownerId]
    );
    return result.rows.map(row => this.mapToProjectItem(row));
  }

  async createGithubRepositoryItem(
    projectId: string | null,
    ownerId: number,
    ownerLogin: string,
    repositoryId: number,
    repositoryName: string
  ): Promise<ProjectItem> {
    logger.debug(`Creating GitHub repository project item: ${ownerLogin}/${repositoryName}`);
    
    return this.create({
      projectId,
      projectItemType: ProjectItemType.GITHUB_REPOSITORY,
      githubOwnerId: ownerId,
      githubOwnerLogin: ownerLogin,
      githubRepositoryId: repositoryId,
      githubRepositoryName: repositoryName,
    });
  }

  async createGithubOwnerItem(
    projectId: string | null,
    ownerId: number,
    ownerLogin: string
  ): Promise<ProjectItem> {
    logger.debug(`Creating GitHub owner project item: ${ownerLogin}`);
    
    return this.create({
      projectId,
      projectItemType: ProjectItemType.GITHUB_OWNER,
      githubOwnerId: ownerId,
      githubOwnerLogin: ownerLogin,
    });
  }

  async createUrlItem(projectId: string | null, url: string): Promise<ProjectItem> {
    logger.debug(`Creating URL project item: ${url}`);
    
    return this.create({
      projectId,
      projectItemType: ProjectItemType.URL,
      url,
    });
  }

  private mapToProjectItem(row: any): ProjectItem {
    return {
      id: row.id,
      projectId: row.project_id,
      projectItemType: row.project_item_type as ProjectItemType,
      githubOwnerId: row.github_owner_id,
      githubOwnerLogin: row.github_owner_login,
      githubRepositoryId: row.github_repository_id,
      githubRepositoryName: row.github_repository_name,
      url: row.url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}