import { Pool } from "pg";
import { Issue, IssueId } from "../../api/model";
import { pool } from "../../dbPool";
import { ValidationError } from "../../api/model/error";

export function getIssueRepository(): IssueRepository {
  return new IssueRepositoryImpl(pool);
}

export interface IssueRepository {
  createOrUpdate(issue: Issue): Promise<Issue>;

  getById(id: IssueId): Promise<Issue | null>;

  getAll(): Promise<Issue[]>;
}

class IssueRepositoryImpl implements IssueRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneIssue(rows: any[]): Issue {
    const issue = this.getOptionalIssue(rows);
    if (issue === null) {
      throw new Error("Issue not found");
    } else {
      return issue;
    }
  }

  private getOptionalIssue(rows: any[]): Issue | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple issues found");
    } else {
      const issue = Issue.fromBackend(rows[0]);
      if (issue instanceof ValidationError) {
        throw issue;
      }
      return issue;
    }
  }

  private getIssueList(rows: any[]): Issue[] {
    return rows.map((r) => {
      const issue = Issue.fromBackend(r);
      if (issue instanceof ValidationError) {
        throw issue;
      }
      return issue;
    });
  }

  async getAll(): Promise<Issue[]> {
    const query = `SELECT * FROM github_issue;`;
    const result = await this.pool.query(query);

    return this.getIssueList(result.rows);
  }

  async getById(id: IssueId): Promise<Issue | null> {
    const query = `SELECT *
                       FROM github_issue
                       WHERE github_owner_login = $1 AND github_repository_name = $2 AND github_number = $3;`;
    const result = await this.pool.query(query, [
      id.repositoryId.ownerId.login,
      id.repositoryId.name,
      id.number,
    ]);

    return this.getOptionalIssue(result.rows);
  }

  async createOrUpdate(issue: Issue): Promise<Issue> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO github_issue (
          github_id,
          github_owner_id,
          github_owner_login,
          github_repository_id,
          github_repository_name,
          github_number,
          github_title,
          github_html_url,
          github_created_at,
          github_closed_at,
          github_open_by_owner_id,
          github_open_by_owner_login,
          github_body
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (github_owner_login, github_repository_name, github_number) DO UPDATE
          SET
            github_id = EXCLUDED.github_id,
            github_owner_id = EXCLUDED.github_owner_id,
            github_owner_login = EXCLUDED.github_owner_login,
            github_repository_name = EXCLUDED.github_repository_name,
            github_title = EXCLUDED.github_title,
            github_html_url = EXCLUDED.github_html_url,
            github_created_at = EXCLUDED.github_created_at,
            github_closed_at = EXCLUDED.github_closed_at,
            github_open_by_owner_id = EXCLUDED.github_open_by_owner_id,
            github_open_by_owner_login = EXCLUDED.github_open_by_owner_login,
            github_body = EXCLUDED.github_body,
            updated_at = NOW()
        RETURNING *;
      `;

      const values = [
        issue.id.githubId,
        issue.id.repositoryId.ownerId.githubId,
        issue.id.repositoryId.ownerId.login,
        issue.id.repositoryId.githubId,
        issue.id.repositoryId.name,
        issue.id.number,
        issue.title,
        issue.htmlUrl,
        issue.createdAt.toISOString(),
        issue.closedAt ? issue.closedAt.toISOString() : null,
        issue.openBy?.githubId,
        issue.openBy.login,
        issue.body,
      ];

      const result = await client.query(query, values);

      return this.getOneIssue(result.rows);
    } finally {
      client.release();
    }
  }
}
