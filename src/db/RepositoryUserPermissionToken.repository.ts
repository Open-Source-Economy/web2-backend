import { Pool } from "pg";
import {
  Currency,
  RepositoryId,
  RepositoryUserPermissionToken,
  RepositoryUserPermissionTokenId,
  RepositoryUserRole,
} from "../model";
import { pool } from "../dbPool";
import { logger } from "../config";
import Decimal from "decimal.js";

export function getRepositoryUserPermissionTokenRepository(): RepositoryUserPermissionTokenRepository {
  return new RepositoryUserPermissionTokenRepositoryImpl(pool);
}

export interface CreateRepositoryUserPermissionTokenDto {
  userName: string | null;
  userEmail: string | null;
  userGithubOwnerLogin: string;
  token: string;
  repositoryId: RepositoryId;
  repositoryUserRole: RepositoryUserRole;
  dowRate: Decimal | null;
  dowCurrency: Currency | null;
  expiresAt: Date;
}

export interface RepositoryUserPermissionTokenRepository {
  create(
    token: CreateRepositoryUserPermissionTokenDto,
  ): Promise<RepositoryUserPermissionToken>;

  update(
    token: RepositoryUserPermissionToken,
  ): Promise<RepositoryUserPermissionToken>;

  getById(
    id: RepositoryUserPermissionTokenId,
  ): Promise<RepositoryUserPermissionToken | null>;

  getByUserGithubOwnerLogin(
    userGithubOwnerLogin: string,
  ): Promise<RepositoryUserPermissionToken | null>;

  getByUserGithubOwnerLoginAndRepository(
    userGithubOwnerLogin: string,
    repositoryId: RepositoryId,
  ): Promise<RepositoryUserPermissionToken[]>;

  getByRepositoryId(
    repositoryId: RepositoryId,
  ): Promise<RepositoryUserPermissionToken[]>;

  getByToken(token: string): Promise<RepositoryUserPermissionToken | null>;

  getAll(): Promise<RepositoryUserPermissionToken[]>;

  delete(token: string): Promise<void>;

  use(token: string): Promise<void>;
}

class RepositoryUserPermissionTokenRepositoryImpl
  implements RepositoryUserPermissionTokenRepository
{
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneToken(rows: any[]): RepositoryUserPermissionToken {
    const token = this.getOptionalToken(rows);
    if (token === null) {
      logger.error("RepositoryUserPermissionToken not found");
      throw new Error("RepositoryUserPermissionToken not found");
    } else {
      logger.debug("RepositoryUserPermissionToken retrieved successfully");
      return token;
    }
  }

  private getOptionalToken(rows: any[]): RepositoryUserPermissionToken | null {
    if (rows.length === 0) {
      logger.debug("No RepositoryUserPermissionToken found");
      return null;
    } else if (rows.length > 1) {
      logger.error("Multiple tokens found");
      throw new Error("Multiple tokens found");
    } else {
      const token = RepositoryUserPermissionToken.fromBackend(rows[0]);
      if (token instanceof Error) {
        logger.error(
          "Error creating RepositoryUserPermissionToken from backend data",
          token,
        );
        throw token;
      }
      logger.debug(
        "RepositoryUserPermissionToken created successfully from backend data",
      );
      return token;
    }
  }

  private getTokenList(rows: any[]): RepositoryUserPermissionToken[] {
    return rows.map((r) => {
      const token = RepositoryUserPermissionToken.fromBackend(r);
      if (token instanceof Error) {
        logger.error(
          "Error creating RepositoryUserPermissionToken from backend data",
          token,
        );
        throw token;
      }
      logger.debug(
        "RepositoryUserPermissionToken created successfully from backend data",
      );
      return token;
    });
  }

  async create(
    token: CreateRepositoryUserPermissionTokenDto,
  ): Promise<RepositoryUserPermissionToken> {
    const client = await this.pool.connect();
    try {
      logger.debug("Creating RepositoryUserPermissionToken with data: ", token);
      const result = await client.query(
        `
          INSERT INTO repository_user_permission_token (
            user_name,
            user_email,
            user_github_owner_login,
            token,
            github_owner_id,
            github_owner_login,
            github_repository_id,
            github_repository_name,
            repository_user_role,
            dow_rate,
            dow_currency,
            expires_at,
            has_been_used
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `,
        [
          token.userName,
          token.userEmail,
          token.userGithubOwnerLogin,
          token.token,
          token.repositoryId.ownerId.githubId,
          token.repositoryId.ownerId.login,
          token.repositoryId.githubId,
          token.repositoryId.name,
          token.repositoryUserRole,
          token.dowRate ? token.dowRate.toString() : null,
          token.dowCurrency,
          token.expiresAt,
          false, // Default for has_been_used
        ],
      );

      logger.debug("RepositoryUserPermissionToken created successfully");
      return this.getOneToken(result.rows);
    } finally {
      client.release();
    }
  }

  async update(
    token: RepositoryUserPermissionToken,
  ): Promise<RepositoryUserPermissionToken> {
    const client = await this.pool.connect();

    try {
      logger.debug(
        "Updating RepositoryUserPermissionToken with ID: {}",
        token.id,
      );
      const result = await client.query(
        `
                    UPDATE repository_user_permission_token
                    SET user_name = $1,
                        user_github_owner_login = $2,
                        token = $3,
                        github_owner_id = $4,
                        github_owner_login = $5,
                        github_repository_id = $6,
                        github_repository_name = $7,
                        repository_user_role = $8,
                        dow_rate = $9,
                        dow_currency = $10,
                        expires_at = $11,
                        updated_at = now()
                    WHERE id = $12
                    RETURNING *
                `,
        [
          token.userName,
          token.userGithubOwnerLogin,
          token.token,
          token.repositoryId.ownerId.githubId,
          token.repositoryId.ownerId.login,
          token.repositoryId.githubId,
          token.repositoryId.name,
          token.repositoryUserRole,
          token.dowRate ? token.dowRate.toString() : null,
          token.dowCurrency,
          token.expiresAt,
          token.id.uuid,
        ],
      );

      logger.debug("RepositoryUserPermissionToken updated successfully");
      return this.getOneToken(result.rows);
    } finally {
      client.release();
    }
  }

  async getById(
    id: RepositoryUserPermissionTokenId,
  ): Promise<RepositoryUserPermissionToken | null> {
    logger.debug("Retrieving RepositoryUserPermissionToken by ID: ", id);
    const result = await this.pool.query(
      `
                SELECT *
                FROM repository_user_permission_token
                WHERE id = $1
            `,
      [id.uuid],
    );

    return this.getOptionalToken(result.rows);
  }

  async getByRepositoryId(
    repositoryId: RepositoryId,
  ): Promise<RepositoryUserPermissionToken[]> {
    logger.debug(
      "Retrieving RepositoryUserPermissionTokens by repository ID: ",
      repositoryId,
    );
    const result = await this.pool.query(
      `
                SELECT *
                FROM repository_user_permission_token
                WHERE github_owner_login = $1
                  AND github_repository_name = $2
            `,
      [repositoryId.ownerLogin(), repositoryId.name],
    );

    return this.getTokenList(result.rows);
  }

  async getByUserGithubOwnerLogin(
    userGithubOwnerLogin: string,
  ): Promise<RepositoryUserPermissionToken | null> {
    logger.debug(
      "Retrieving RepositoryUserPermissionToken by userGithubOwnerLogin: {}",
      userGithubOwnerLogin,
    );
    const result = await this.pool.query(
      `
                SELECT *
                FROM repository_user_permission_token
                WHERE user_github_owner_login = $1
            `,
      [userGithubOwnerLogin],
    );

    return this.getOptionalToken(result.rows);
  }

  async getByUserGithubOwnerLoginAndRepository(
    userGithubOwnerLogin: string,
    repositoryId: RepositoryId,
  ): Promise<RepositoryUserPermissionToken[]> {
    logger.debug(
      "Retrieving RepositoryUserPermissionToken by userGithubOwnerLogin: {}",
      userGithubOwnerLogin,
    );
    const result = await this.pool.query(
      `
                SELECT *
                FROM repository_user_permission_token
                WHERE user_github_owner_login = $1
                  AND    github_owner_login = $2
                  AND github_repository_name = $3
            `,
      [userGithubOwnerLogin, repositoryId.ownerLogin(), repositoryId.name],
    );

    return this.getTokenList(result.rows);
  }

  async getByToken(
    token: string,
  ): Promise<RepositoryUserPermissionToken | null> {
    logger.debug(
      "Retrieving RepositoryUserPermissionToken by token: {}",
      token,
    );
    const result = await this.pool.query(
      `
                SELECT *
                FROM repository_user_permission_token
                WHERE token = $1
            `,
      [token],
    );

    return this.getOptionalToken(result.rows);
  }

  async getAll(): Promise<RepositoryUserPermissionToken[]> {
    logger.debug("Retrieving all RepositoryUserPermissionTokens");
    const result = await this.pool.query(
      `
                SELECT *
                FROM repository_user_permission_token
            `,
    );

    return this.getTokenList(result.rows);
  }

  async delete(token: string): Promise<void> {
    logger.debug("Deleting permission token: {}", token);
    await this.pool.query(
      `
                DELETE FROM repository_user_permission_token
                WHERE token = $1
            `,
      [token],
    );
  }

  async use(token: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      logger.debug(`Marking token as used: ${token}`);
      const result = await client.query(
        `
          UPDATE repository_user_permission_token
          SET has_been_used = TRUE
          WHERE token = $1
          RETURNING *
        `,
        [token],
      );

      if (result.rows.length === 0) {
        throw new Error(`Token not found: ${token}`);
      }

      logger.debug(`Token ${token} marked as used successfully.`);
    } finally {
      client.release();
    }
  }
}
