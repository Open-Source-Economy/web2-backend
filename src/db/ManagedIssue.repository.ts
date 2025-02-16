import { Pool } from "pg";
import { IssueId, ManagedIssue, ManagedIssueId } from "../model";
import { pool } from "../dbPool";
import { CreateManagedIssueBody } from "../dtos";

export function getManagedIssueRepository(): ManagedIssueRepository {
  return new ManagedIssueRepositoryImpl(pool);
}

export interface ManagedIssueRepository {
  create(managedIssue: CreateManagedIssueBody): Promise<ManagedIssue>;

  update(managedIssue: ManagedIssue): Promise<ManagedIssue>;

  getById(id: ManagedIssueId): Promise<ManagedIssue | null>;

  getByIssueId(issueId: IssueId): Promise<ManagedIssue | null>;

  getAll(): Promise<ManagedIssue[]>;
}

class ManagedIssueRepositoryImpl implements ManagedIssueRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneManagedIssue(rows: any[]): ManagedIssue {
    const managedIssue = this.getOptionalManagedIssue(rows);
    if (managedIssue === null) {
      throw new Error("ManagedIssue not found");
    } else {
      return managedIssue;
    }
  }

  private getOptionalManagedIssue(rows: any[]): ManagedIssue | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple managed issues found");
    } else {
      const managedIssue = ManagedIssue.fromBackend(rows[0]);
      if (managedIssue instanceof Error) {
        throw managedIssue;
      }
      return managedIssue;
    }
  }

  private getManagedIssueList(rows: any[]): ManagedIssue[] {
    return rows.map((r) => {
      const managedIssue = ManagedIssue.fromBackend(r);
      if (managedIssue instanceof Error) {
        throw managedIssue;
      }
      return managedIssue;
    });
  }

  async create(managedIssue: CreateManagedIssueBody): Promise<ManagedIssue> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                    INSERT INTO managed_issue (github_owner_id,
                                               github_owner_login,
                                               github_repository_id,
                                               github_repository_name,
                                               github_issue_id,
                                               github_issue_number,
                                               requested_credit_amount,
                                               manager_id,
                                               contributor_visibility,
                                               state)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id,
                        github_owner_id,
                        github_owner_login,
                        github_repository_id,
                        github_repository_name,
                        github_issue_id,
                        github_issue_number,
                        requested_credit_amount,
                        manager_id,
                        contributor_visibility,
                        state
                `,
        [
          managedIssue.githubIssueId.repositoryId.ownerId.githubId,
          managedIssue.githubIssueId.repositoryId.ownerId.login,
          managedIssue.githubIssueId.repositoryId.githubId,
          managedIssue.githubIssueId.repositoryId.name,
          managedIssue.githubIssueId.githubId,
          managedIssue.githubIssueId.number,
          managedIssue.requestedCreditAmount,
          managedIssue.managerId.uuid,
          managedIssue.contributorVisibility,
          managedIssue.state,
        ],
      );

      return this.getOneManagedIssue(result.rows);
    } finally {
      client.release();
    }
  }

  async update(managedIssue: ManagedIssue): Promise<ManagedIssue> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                    UPDATE managed_issue
                    SET github_owner_id            = $1,
                        github_owner_login         = $2,
                        github_repository_id       = $3,
                        github_repository_name     = $4,
                        github_issue_id            = $5,
                        github_issue_number        = $6,
                        requested_credit_amount = $7,
                        manager_id                 = $8,
                        contributor_visibility     = $9,
                        state                      = $10
                    WHERE id = $11
                    RETURNING id,
                        github_owner_id,
                        github_owner_login,
                        github_repository_id,
                        github_repository_name,
                        github_issue_id,
                        github_issue_number,
                        requested_credit_amount,
                        manager_id,
                        contributor_visibility,
                        state
                `,
        [
          managedIssue.githubIssueId.repositoryId.ownerId.githubId,
          managedIssue.githubIssueId.repositoryId.ownerId.login,
          managedIssue.githubIssueId.repositoryId.githubId,
          managedIssue.githubIssueId.repositoryId.name,
          managedIssue.githubIssueId.githubId,
          managedIssue.githubIssueId.number,
          managedIssue.requestedCreditAmount,
          managedIssue.managerId.uuid,
          managedIssue.contributorVisibility,
          managedIssue.state,
          managedIssue.id.uuid,
        ],
      );

      return this.getOneManagedIssue(result.rows);
    } finally {
      client.release();
    }
  }

  async getById(id: ManagedIssueId): Promise<ManagedIssue | null> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM managed_issue
                WHERE id = $1
            `,
      [id.uuid],
    );

    return this.getOptionalManagedIssue(result.rows);
  }

  async getByIssueId(issueId: IssueId): Promise<ManagedIssue | null> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM managed_issue
                WHERE github_owner_login = $1
                  AND github_repository_name = $2
                  AND github_issue_number = $3
            `,
      [
        issueId.repositoryId.ownerId.login,
        issueId.repositoryId.name,
        issueId.number,
      ],
    );

    return this.getOptionalManagedIssue(result.rows);
  }

  async getAll(): Promise<ManagedIssue[]> {
    const result = await this.pool.query(`
            SELECT *
            FROM managed_issue
        `);

    return this.getManagedIssueList(result.rows);
  }
}
