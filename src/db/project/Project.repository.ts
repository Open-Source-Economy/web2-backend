import { Pool } from "pg";
import {
  Project,
  ProjectEcosystem,
  ProjectId,
  ProjectUtils,
  ValidationError,
} from "@open-source-economy/api-types";
import { pool } from "../../dbPool";

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
            FROM project_old p
                     JOIN github_owner o ON p.github_owner_login = o.github_login
                     LEFT JOIN github_repository r ON p.github_repository_name = r.github_name
                AND p.github_owner_login = r.github_owner_login;
        `;

    const result = await this.pool.query(query);
    return this.getProjectList(result.rows);
  }

  async getByEcosystem(ecosystem: ProjectEcosystem): Promise<Project[]> {
    const query = `
            SELECT p.*,
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
            FROM project_old p
                     JOIN github_owner o ON p.github_owner_login = o.github_login
                     LEFT JOIN github_repository r ON p.github_repository_name = r.github_name AND
                                                      p.github_owner_login = r.github_owner_login
            WHERE p.ecosystem = $1;
        `;
    const result = await this.pool.query(query, [ecosystem]);

    return this.getProjectList(result.rows);
  }

  async getById(id: ProjectId): Promise<Project | null> {
    const params = ProjectUtils.getDBParams(id);

    let query = `
            SELECT p.*,
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
            FROM project_old p
                     JOIN github_owner o ON p.github_owner_login = o.github_login
                     LEFT JOIN github_repository r ON p.github_repository_name = r.github_name AND
                                                      p.github_owner_login = r.github_owner_login
            WHERE p.github_owner_login = $1
        `;

    const queryParams = [params.ownerLogin];

    if (params.repoName) {
      query += ` AND p.github_repository_name = $2`;
      queryParams.push(params.repoName);
    } else {
      query += ` AND p.github_repository_name IS NULL`;
    }

    const result = await this.pool.query(query, queryParams);

    return this.getOptionalProject(result.rows);
  }

  async createOrUpdate(project: Project): Promise<Project> {
    const client = await this.pool.connect();

    try {
      const params = ProjectUtils.getDBParams(project.id);

      const query = `
                INSERT INTO project_old (github_owner_id,
                                     github_owner_login,
                                     github_repository_id,
                                     github_repository_name,
                                     ecosystem)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (github_owner_login, COALESCE(github_repository_name, '')) DO UPDATE
                    SET github_owner_id      = EXCLUDED.github_owner_id,
                        github_repository_id = EXCLUDED.github_repository_id,
                        ecosystem            = EXCLUDED.ecosystem,
                        updated_at           = NOW()
                RETURNING *;
            `;

      await client.query(query, [
        params.ownerId,
        params.ownerLogin,
        params.repoId,
        params.repoName,
        project.projectEcosystem,
      ]);

      // Fetch and return the full project
      return (await this.getById(project.id)) as Project;
    } finally {
      client.release();
    }
  }
}
