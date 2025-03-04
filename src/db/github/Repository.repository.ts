import { Pool } from "pg";
import { Repository, RepositoryId } from "../../api/model";
import { pool } from "../../dbPool";
import { ValidationError } from "../../api/model/error";

export function getRepositoryRepository(): RepositoryRepository {
  return new RepositoryRepositoryImpl(pool);
}

export interface RepositoryRepository {
  insertOrUpdate(repository: Repository): Promise<Repository>;
  getById(id: RepositoryId): Promise<Repository | null>;
  getAll(): Promise<Repository[]>;
}

class RepositoryRepositoryImpl implements RepositoryRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneRepository(rows: any[]): Repository {
    const repository = this.getOptionalRepository(rows);
    if (repository === null) {
      throw new Error("Repository not found");
    } else {
      return repository;
    }
  }

  private getOptionalRepository(rows: any[]): Repository | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple repositories found");
    } else {
      const repository = Repository.fromBackend(rows[0]);
      if (repository instanceof ValidationError) {
        throw repository;
      }
      return repository;
    }
  }

  private getRepositoryList(rows: any[]): Repository[] {
    return rows.map((r) => {
      const repository = Repository.fromBackend(r);
      if (repository instanceof ValidationError) {
        throw repository;
      }
      return repository;
    });
  }

  async getAll(): Promise<Repository[]> {
    const query = `SELECT * FROM github_repository`;
    const result = await this.pool.query(query);

    return this.getRepositoryList(result.rows);
  }

  async getById(id: RepositoryId): Promise<Repository | null> {
    const query = `SELECT * FROM github_repository WHERE github_owner_login = $1 AND github_name = $2;`;
    const result = await this.pool.query(query, [id.ownerId.login, id.name]);

    return this.getOptionalRepository(result.rows);
  }

  async insertOrUpdate(repository: Repository): Promise<Repository> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
            INSERT INTO github_repository (github_id, github_owner_id, github_owner_login, github_name, github_html_url, github_description)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (github_id) DO UPDATE
              SET github_owner_id = EXCLUDED.github_owner_id,
                  github_owner_login = EXCLUDED.github_owner_login,
                  github_name = EXCLUDED.github_name,
                  github_html_url = EXCLUDED.github_html_url,
                  github_description = EXCLUDED.github_description,
                  updated_at = NOW()
            RETURNING github_id, github_owner_id, github_owner_login, github_name, github_html_url, github_description
          `,
        [
          repository.id.githubId,
          repository.id.ownerId.githubId,
          repository.id.ownerId.login,
          repository.id.name,
          repository.htmlUrl,
          repository.description,
        ],
      );

      return this.getOneRepository(result.rows);
    } finally {
      client.release();
    }
  }
}
