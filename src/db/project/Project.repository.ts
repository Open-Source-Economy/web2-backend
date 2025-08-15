import { Pool } from "pg";
import {
  Project,
  ProjectEcosystem,
  ProjectId,
  ProjectUtils,
} from "../../api/model";
import { pool } from "../../dbPool";
import { ValidationError } from "../../api/model/error";

export function getProjectRepository(): ProjectRepository {
  return new ProjectRepositoryImpl(pool);
}

export interface ProjectRepository {
  createOrUpdate(project: Project): Promise<Project>;

  getById(id: ProjectId): Promise<Project | null>;

  getAll(): Promise<Project[]>;

  getByEcosystem(ecosystem: ProjectEcosystem): Promise<Project[]>;
}

class ProjectRepositoryImpl implements ProjectRepository {
  private pool: Pool;

  private ownerTablePrefix: string = "owner_";
  private repositoryTablePrefix: string = "repository_";

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneProject(rows: any[]): Project {
    const project = this.getOptionalProject(rows);
    if (project === null) {
      throw new Error("Project not found");
    } else {
      return project;
    }
  }

  private getOptionalProject(rows: any[]): Project | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple projects found");
    } else {
      const project = Project.fromBackend(
        rows[0],
        this.ownerTablePrefix,
        this.repositoryTablePrefix,
      );
      if (project instanceof ValidationError) {
        throw project;
      }
      return project;
    }
  }

  private getProjectList(rows: any[]): Project[] {
    return rows.map((r) => {
      const project = Project.fromBackend(
        r,
        this.ownerTablePrefix,
        this.repositoryTablePrefix,
      );
      if (project instanceof ValidationError) {
        throw project;
      }
      return project;
    });
  }

  async getPrefixedColumns(
    table: string,
    alias: string,
    prefix: string,
  ): Promise<string> {
    const res = await this.pool.query(
      `
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
            `,
      [table],
    );

    return res.rows
      .map(
        (row) => `${alias}.${row.column_name} AS ${prefix}_${row.column_name}`,
      )
      .join(",\n");
  }

  async getAll(): Promise<Project[]> {
    const query = `
            SELECT p.*,
                   pi.github_owner_id,
                   pi.github_owner_login,
                   pi.github_repository_id,
                   pi.github_repository_name,
                   pi.project_item_type,
                   o.github_id          as ${this.ownerTablePrefix}github_id,
                   o.github_login       as ${this.ownerTablePrefix}github_login,
                   o.github_type        as ${this.ownerTablePrefix}github_type,
                   o.github_html_url    as ${this.ownerTablePrefix}github_html_url,
                   o.github_avatar_url  as ${this.ownerTablePrefix}github_avatar_url,
                   o.email              as ${this.ownerTablePrefix}email,
                   r.github_id          as ${this.repositoryTablePrefix}github_id,
                   r.github_name        as ${this.repositoryTablePrefix}github_name,
                   r.github_html_url    as ${this.repositoryTablePrefix}github_html_url,
                   r.github_description as ${this.repositoryTablePrefix}github_description
            FROM project p
                     JOIN project_item pi ON p.id = pi.project_id
                     JOIN github_owner o ON pi.github_owner_login = o.github_login
                     LEFT JOIN github_repository r ON pi.github_repository_name = r.github_name
                AND pi.github_owner_login = r.github_owner_login;
        `;

    const result = await this.pool.query(query);
    return this.getProjectList(result.rows);
  }

  async getByEcosystem(ecosystem: ProjectEcosystem): Promise<Project[]> {
    const query = `
            SELECT p.*,
                   pi.github_owner_id,
                   pi.github_owner_login,
                   pi.github_repository_id,
                   pi.github_repository_name,
                   pi.project_item_type,
                   o.github_id          as ${this.ownerTablePrefix}github_id,
                   o.github_login       as ${this.ownerTablePrefix}github_login,
                   o.github_type        as ${this.ownerTablePrefix}github_type,
                   o.github_html_url    as ${this.ownerTablePrefix}github_html_url,
                   o.github_avatar_url  as ${this.ownerTablePrefix}github_avatar_url,
                   o.email              as ${this.ownerTablePrefix}email,
                   r.github_id          as ${this.repositoryTablePrefix}github_id,
                   r.github_name        as ${this.repositoryTablePrefix}github_name,
                   r.github_html_url    as ${this.repositoryTablePrefix}github_html_url,
                   r.github_description as ${this.repositoryTablePrefix}github_description
            FROM project p
                     JOIN project_item pi ON p.id = pi.project_id
                     JOIN github_owner o ON pi.github_owner_login = o.github_login
                     LEFT JOIN github_repository r ON pi.github_repository_name = r.github_name AND
                                                      pi.github_owner_login = r.github_owner_login
            WHERE p.ecosystem = $1;
        `;
    const result = await this.pool.query(query, [ecosystem]);

    return this.getProjectList(result.rows);
  }

  async getById(id: ProjectId): Promise<Project | null> {
    const params = ProjectUtils.getDBParams(id);

    let query = `
            SELECT p.*,
                   pi.github_owner_id,
                   pi.github_owner_login,
                   pi.github_repository_id,
                   pi.github_repository_name,
                   pi.project_item_type,
                   o.github_id          as ${this.ownerTablePrefix}github_id,
                   o.github_login       as ${this.ownerTablePrefix}github_login,
                   o.github_type        as ${this.ownerTablePrefix}github_type,
                   o.github_html_url    as ${this.ownerTablePrefix}github_html_url,
                   o.github_avatar_url  as ${this.ownerTablePrefix}github_avatar_url,
                   o.email              as ${this.ownerTablePrefix}email,
                   r.github_id          as ${this.repositoryTablePrefix}github_id,
                   r.github_name        as ${this.repositoryTablePrefix}github_name,
                   r.github_html_url    as ${this.repositoryTablePrefix}github_html_url,
                   r.github_description as ${this.repositoryTablePrefix}github_description
            FROM project p
                     JOIN project_item pi ON p.id = pi.project_id
                     JOIN github_owner o ON pi.github_owner_login = o.github_login
                     LEFT JOIN github_repository r ON pi.github_repository_name = r.github_name AND
                                                      pi.github_owner_login = r.github_owner_login
            WHERE pi.github_owner_login = $1
        `;

    const queryParams = [params.ownerLogin];

    if (params.repoName) {
      query += ` AND pi.github_repository_name = $2`;
      queryParams.push(params.repoName);
    } else {
      query += ` AND pi.github_repository_name IS NULL`;
    }

    const result = await this.pool.query(query, queryParams);

    return this.getOptionalProject(result.rows);
  }

  async createOrUpdate(project: Project): Promise<Project> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const params = ProjectUtils.getDBParams(project.id);

      // First, create or get the project container
      const projectName = params.repoName
        ? `${params.ownerLogin}/${params.repoName}`
        : params.ownerLogin;

      const projectQuery = `
        INSERT INTO project (name, ecosystem)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE 
        SET ecosystem = EXCLUDED.ecosystem,
            updated_at = NOW()
        RETURNING id;
      `;

      const projectResult = await client.query(projectQuery, [
        projectName,
        project.projectEcosystem || null,
      ]);
      const projectId = projectResult.rows[0].id;

      // Then, create or update the project_item
      const itemType = params.repoName ? "GITHUB_REPOSITORY" : "GITHUB_OWNER";

      // Check if project_item already exists
      const existingItemQuery = `
        SELECT id FROM project_item 
        WHERE project_id = $1 
          AND github_owner_login = $2 
          AND (github_repository_name = $3 OR (github_repository_name IS NULL AND $3 IS NULL))
      `;

      const existingItem = await client.query(existingItemQuery, [
        projectId,
        params.ownerLogin,
        params.repoName,
      ]);

      let itemQuery;
      let itemParams;

      if (existingItem.rows.length > 0) {
        // Update existing item
        itemQuery = `
          UPDATE project_item 
          SET github_owner_id = $1,
              github_repository_id = $2,
              updated_at = NOW()
          WHERE id = $3
          RETURNING *;
        `;
        itemParams = [params.ownerId, params.repoId, existingItem.rows[0].id];
      } else {
        // Insert new item
        itemQuery = `
          INSERT INTO project_item (
            project_id,
            project_item_type,
            github_owner_id,
            github_owner_login,
            github_repository_id,
            github_repository_name
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `;
        itemParams = [
          projectId,
          itemType,
          params.ownerId,
          params.ownerLogin,
          params.repoId,
          params.repoName,
        ];
      }

      await client.query(itemQuery, itemParams);

      await client.query("COMMIT");

      // Fetch and return the full project
      return (await this.getById(project.id)) as Project;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
