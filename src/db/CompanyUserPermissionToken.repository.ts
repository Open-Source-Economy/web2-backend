import { Pool } from "pg";
import {
  CompanyId,
  CompanyUserPermissionToken,
  CompanyUserPermissionTokenId,
} from "../model";
import { getPool } from "../dbPool";
import { CreateCompanyUserPermissionTokenDto } from "../dtos";

export function getCompanyUserPermissionTokenRepository(): CompanyUserPermissionTokenRepository {
  return new CompanyUserPermissionTokenRepositoryImpl(getPool());
}

export interface CompanyUserPermissionTokenRepository {
  create(
    token: CreateCompanyUserPermissionTokenDto,
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
    token: CreateCompanyUserPermissionTokenDto,
  ): Promise<CompanyUserPermissionToken> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                    INSERT INTO company_user_permission_token (user_email, token, company_id, company_user_role, expires_at)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, user_email, token, company_id, company_user_role, expires_at
                `,
        [
          token.userEmail,
          token.token,
          token.companyId.toString(),
          token.companyUserRole,
          token.expiresAt,
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
                    SET user_email        = $1,
                        token             = $2,
                        company_id        = $3,
                        company_user_role = $4,
                        expires_at        = $5
                    WHERE id = $6
                    RETURNING id, user_email, token, company_id, company_user_role, expires_at
                `,
        [
          token.userEmail,
          token.token,
          token.companyId.toString(),
          token.companyUserRole,
          token.expiresAt,
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
      [userEmail, companyId.toString()],
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
    const result = await this.pool.query(
      `
                    DELETE
                    FROM company_user_permission_token
                    WHERE token = $1
            `,
      [token],
    );
  }
}