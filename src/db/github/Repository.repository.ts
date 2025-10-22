import { Pool } from "pg";
import {
  Repository,
  RepositoryId,
  ValidationError,
} from "@open-source-economy/api-types";
import { pool } from "../../dbPool";
import { RepositoryCompanion } from "../helpers/companions";

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
      const repository = RepositoryCompanion.fromBackend(rows[0]);
      if (repository instanceof ValidationError) {
        throw repository;
      }
      return repository;
    }
  }

  private getRepositoryList(rows: any[]): Repository[] {
    return rows.map((r) => {
      const repository = RepositoryCompanion.fromBackend(r);
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
            INSERT INTO github_repository (
              github_id, github_owner_id, github_owner_login, github_name, github_html_url, github_description,
              github_homepage, github_language, github_forks_count, github_stargazers_count, github_watchers_count,
              github_full_name, github_fork, github_topics, github_open_issues_count,
              github_visibility, github_subscribers_count, github_network_count
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (github_id) DO UPDATE
              SET github_owner_id = EXCLUDED.github_owner_id,
                  github_owner_login = EXCLUDED.github_owner_login,
                  github_name = EXCLUDED.github_name,
                  github_html_url = EXCLUDED.github_html_url,
                  github_description = EXCLUDED.github_description,
                  github_homepage = EXCLUDED.github_homepage,
                  github_language = EXCLUDED.github_language,
                  github_forks_count = EXCLUDED.github_forks_count,
                  github_stargazers_count = EXCLUDED.github_stargazers_count,
                  github_watchers_count = EXCLUDED.github_watchers_count,
                  github_full_name = EXCLUDED.github_full_name,
                  github_fork = EXCLUDED.github_fork,
                  github_topics = EXCLUDED.github_topics,
                  github_open_issues_count = EXCLUDED.github_open_issues_count,
                  github_visibility = EXCLUDED.github_visibility,
                  github_subscribers_count = EXCLUDED.github_subscribers_count,
                  github_network_count = EXCLUDED.github_network_count,
                  updated_at = NOW()
            RETURNING *
          `,
        [
          repository.id.githubId,
          repository.id.ownerId.githubId,
          repository.id.ownerId.login,
          repository.id.name,
          repository.htmlUrl,
          repository.description,
          repository.homepage,
          repository.language,
          repository.forksCount,
          repository.stargazersCount,
          repository.watchersCount,
          repository.fullName,
          repository.fork,
          repository.topics,
          repository.openIssuesCount,
          repository.visibility,
          repository.subscribersCount,
          repository.networkCount,
        ],
      );

      return this.getOneRepository(result.rows);
    } finally {
      client.release();
    }
  }
}
