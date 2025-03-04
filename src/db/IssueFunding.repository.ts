import { Pool, QueryResult } from "pg";
import { IssueFunding, IssueFundingId, IssueId } from "../api/model";
import { pool } from "../dbPool";
import { CreateIssueFundingBody } from "../api/dto";
import { logger } from "../config";

export function getIssueFundingRepository(): IssueFundingRepository {
  return new IssueFundingRepositoryImpl(pool);
}

export interface IssueFundingRepository {
  create(issueFunding: CreateIssueFundingBody): Promise<IssueFunding>;

  getById(id: IssueFundingId): Promise<IssueFunding | null>;

  getAll(issueId?: IssueId): Promise<IssueFunding[]>;
}

class IssueFundingRepositoryImpl implements IssueFundingRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneIssueFunding(rows: any[]): IssueFunding {
    const issueFunding = this.getOptionalIssueFunding(rows);
    if (issueFunding === null) {
      throw new Error("IssueFunding not found");
    } else {
      return issueFunding;
    }
  }

  private getOptionalIssueFunding(rows: any[]): IssueFunding | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple issue fundings found");
    } else {
      const issueFunding = IssueFunding.fromBackend(rows[0]);
      if (issueFunding instanceof Error) {
        throw issueFunding;
      }
      return issueFunding;
    }
  }

  private getIssueFundingList(rows: any[]): IssueFunding[] {
    return rows.map((r) => {
      const issueFunding = IssueFunding.fromBackend(r);
      if (issueFunding instanceof Error) {
        throw issueFunding;
      }
      return issueFunding;
    });
  }

  async create(issueFunding: CreateIssueFundingBody): Promise<IssueFunding> {
    const client = await this.pool.connect();

    logger.debug(`Creating issue funding: ${JSON.stringify(issueFunding)}`);
    try {
      const result = await client.query(
        `
                    INSERT INTO issue_funding (github_owner_id,
                                               github_owner_login,
                                               github_repository_id,
                                               github_repository_name,
                                               github_issue_id,
                                               github_issue_number,
                                               user_id,
                                               credit_amount)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id,
                        github_owner_id,
                        github_owner_login,
                        github_repository_id,
                        github_repository_name,
                        github_issue_id,
                        github_issue_number,
                        user_id,
                        credit_amount
                `,
        [
          issueFunding.githubIssueId.repositoryId.ownerId.githubId,
          issueFunding.githubIssueId.repositoryId.ownerId.login,
          issueFunding.githubIssueId.repositoryId.githubId,
          issueFunding.githubIssueId.repositoryId.name,
          issueFunding.githubIssueId.githubId,
          issueFunding.githubIssueId.number,
          issueFunding.userId.uuid,
          issueFunding.creditAmount,
        ],
      );

      return this.getOneIssueFunding(result.rows);
    } finally {
      client.release();
    }
  }

  async getById(id: IssueFundingId): Promise<IssueFunding | null> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM issue_funding
                WHERE id = $1
            `,
      [id.uuid],
    );

    return this.getOptionalIssueFunding(result.rows);
  }

  async getAll(issueId?: IssueId): Promise<IssueFunding[]> {
    let result: QueryResult<any>;

    if (issueId) {
      result = await this.pool.query(
        `
                SELECT *
                FROM issue_funding
                WHERE github_owner_login = $1 AND github_repository_name = $2 AND github_issue_number = $3
            `,
        [
          issueId.repositoryId.ownerId.login,
          issueId.repositoryId.name,
          issueId.number,
        ],
      );
    } else {
      result = await this.pool.query(`
            SELECT *
            FROM issue_funding
        `);
    }
    return this.getIssueFundingList(result.rows);
  }
}
