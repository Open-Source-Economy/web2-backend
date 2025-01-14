import { Pool } from "pg";
import {
  CompanyId,
  CompanyUserPermissionToken,
  CompanyUserPermissionTokenId,
} from "../model";
import { pool } from "../dbPool";
import { CreateCompanyUserPermissionTokenBody } from "../dtos";
import { logger } from "../config";

export function getCompanyUserPermissionTokenRepository(): CompanyUserPermissionTokenRepository {
  return new CompanyUserPermissionTokenRepositoryImpl(pool);
}

export interface CompanyUserPermissionTokenRepository {
  create(
    token: CreateCompanyUserPermissionTokenBody,
  ): Promise<CompanyUserPermissionToken>;

  update(
    token: CompanyUserPermissionToken,
  ): Promise<CompanyUserPermissionToken>;

  getById(
    id: CompanyUserPermissionTokenId,
  ): Promise<CompanyUserPermissionToken | null>;

  getByUserEmail(
    userEmail: string,
    companyId: CompanyId,
  ): Promise<CompanyUserPermissionToken[]>;

  getByToken(token: string): Promise<CompanyUserPermissionToken | null>;

  getAll(): Promise<CompanyUserPermissionToken[]>;

  delete(token: string): Promise<void>;

  setHasBeenUsed(token: string): Promise<void>;
}

class CompanyUserPermissionTokenRepositoryImpl
  implements CompanyUserPermissionTokenRepository
{
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneToken(rows: any[]): CompanyUserPermissionToken {
    const token = this.getOptionalToken(rows);
    if (token === null) {
      throw new Error("CompanyUserPermissionToken not found");
    } else {
      return token;
    }
  }

  private getOptionalToken(rows: any[]): CompanyUserPermissionToken | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple tokens found");
    } else {
      const token = CompanyUserPermissionToken.fromBackend(rows[0]);
      if (token instanceof Error) {
        throw token;
      }
      return token;
    }
  }

  private getTokenList(rows: any[]): CompanyUserPermissionToken[] {
    return rows.map((r) => {
      const token = CompanyUserPermissionToken.fromBackend(r);
      if (token instanceof Error) {
        throw token;
      }
      return token;
    });
  }

  async create(
    token: CreateCompanyUserPermissionTokenBody,
  ): Promise<CompanyUserPermissionToken> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                    INSERT INTO company_user_permission_token (user_name, user_email, token, company_id, company_user_role, expires_at, has_been_used)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `,
        [
          token.userName,
          token.userEmail,
          token.token,
          token.companyId.uuid.toString(),
          token.companyUserRole,
          token.expiresAt,
          false, // Default value for hasBeenUsed
        ],
      );

      return this.getOneToken(result.rows);
    } finally {
      client.release();
    }
  }

  async update(
    token: CompanyUserPermissionToken,
  ): Promise<CompanyUserPermissionToken> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                    UPDATE company_user_permission_token
                    SET user_name        = $1,
                        user_email        = $2,
                        token             = $3,
                        company_id        = $4,
                        company_user_role = $5,
                        expires_at        = $6,
                        has_been_used     = $7
                    WHERE id = $8
                    RETURNING *
                `,
        [
          token.userName,
          token.userEmail,
          token.token,
          token.companyId.toString(),
          token.companyUserRole,
          token.expiresAt,
          token.hasBeenUsed,
          token.id.toString(),
        ],
      );

      return this.getOneToken(result.rows);
    } finally {
      client.release();
    }
  }

  async getById(
    id: CompanyUserPermissionTokenId,
  ): Promise<CompanyUserPermissionToken | null> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM company_user_permission_token
                WHERE id = $1
            `,
      [id.toString()],
    );

    return this.getOptionalToken(result.rows);
  }

  async getByUserEmail(
    userEmail: string,
    companyId: CompanyId,
  ): Promise<CompanyUserPermissionToken[]> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM company_user_permission_token
                WHERE user_email = $1
                  AND company_id = $2
            `,
      [userEmail, companyId.uuid.toString()],
    );

    return this.getTokenList(result.rows);
  }

  async getByToken(token: string): Promise<CompanyUserPermissionToken | null> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM company_user_permission_token
                WHERE token = $1
            `,
      [token],
    );

    return this.getOptionalToken(result.rows);
  }

  async getAll(): Promise<CompanyUserPermissionToken[]> {
    const result = await this.pool.query(`
            SELECT *
            FROM company_user_permission_token
        `);

    return this.getTokenList(result.rows);
  }

  async delete(token: string): Promise<void> {
    await this.pool.query(
      `
                DELETE
                FROM company_user_permission_token
                WHERE token = $1
            `,
      [token],
    );
    logger.debug("Deleting permission token: ", token);
  }

  async setHasBeenUsed(token: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
          UPDATE company_user_permission_token
          SET has_been_used = TRUE
          WHERE token = $1
          RETURNING *
        `,
        [token],
      );

      if (result.rows.length === 0) {
        throw new Error(`Token not found: ${token}`);
      }

      logger.debug(`Token ${token} has been marked as used.`);
    } finally {
      client.release();
    }
  }
}
