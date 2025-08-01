import { Pool } from "pg";
import {
  DeveloperProject,
  DeveloperProjectId,
} from "../../api/model/onboarding";
import { AddProjectDto, UpdateProjectDto } from "../../api/dto";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export function getDeveloperProjectRepository(): DeveloperProjectRepository {
  return new DeveloperProjectRepositoryImpl(pool);
}

export interface DeveloperProjectRepository {
  create(project: AddProjectDto, profileId: string): Promise<DeveloperProject>;
  update(
    projectId: string,
    updates: UpdateProjectDto,
  ): Promise<DeveloperProject>;
  delete(projectId: string): Promise<void>;
  getByProfileId(profileId: string): Promise<DeveloperProject[]>;
  getById(projectId: string): Promise<DeveloperProject | null>;
}

class DeveloperProjectRepositoryImpl implements DeveloperProjectRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneDeveloperProject(rows: any[]): DeveloperProject {
    const project = this.getOptionalDeveloperProject(rows);
    if (project === null) {
      throw new Error("Developer project not found");
    }
    return project;
  }

  private getOptionalDeveloperProject(rows: any[]): DeveloperProject | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple developer projects found");
    } else {
      const project = DeveloperProject.fromBackend(rows[0]);
      if (project instanceof Error) {
        throw project;
      }
      return project;
    }
  }

  private getDeveloperProjectList(rows: any[]): DeveloperProject[] {
    return rows.map((r) => {
      const project = DeveloperProject.fromBackend(r);
      if (project instanceof Error) {
        throw project;
      }
      return project;
    });
  }

  async create(
    project: AddProjectDto,
    profileId: string,
  ): Promise<DeveloperProject> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        INSERT INTO developer_project (
          developer_profile_id, project_type, github_org, github_repo, 
          project_name, project_url, role, merge_rights
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
        `,
        [
          profileId,
          project.projectType,
          project.githubOrg || null,
          project.githubRepo || null,
          project.projectName || null,
          project.projectUrl || null,
          project.role,
          project.mergeRights,
        ],
      );

      return this.getOneDeveloperProject(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    projectId: string,
    updates: UpdateProjectDto,
  ): Promise<DeveloperProject> {
    const client = await this.pool.connect();

    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.role !== undefined) {
        setParts.push(`role = $${paramIndex}`);
        values.push(updates.role);
        paramIndex++;
      }

      if (updates.mergeRights !== undefined) {
        setParts.push(`merge_rights = $${paramIndex}`);
        values.push(updates.mergeRights);
        paramIndex++;
      }

      setParts.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      paramIndex++;

      values.push(projectId);

      const result = await client.query(
        `
        UPDATE developer_project
        SET ${setParts.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *
        `,
        values,
      );

      return this.getOneDeveloperProject(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(projectId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `
        DELETE FROM developer_project
        WHERE id = $1
        `,
        [projectId],
      );
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async getByProfileId(profileId: string): Promise<DeveloperProject[]> {
    logger.debug(`Getting developer projects by profile id:`, profileId);
    const result = await this.pool.query(
      `
      SELECT *
      FROM developer_project
      WHERE developer_profile_id = $1
      ORDER BY created_at DESC
      `,
      [profileId],
    );

    return this.getDeveloperProjectList(result.rows);
  }

  async getById(projectId: string): Promise<DeveloperProject | null> {
    logger.debug(`Getting developer project by id:`, projectId);
    const result = await this.pool.query(
      `
      SELECT *
      FROM developer_project
      WHERE id = $1
      `,
      [projectId],
    );

    return this.getOptionalDeveloperProject(result.rows);
  }
}
