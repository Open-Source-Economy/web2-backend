import { Pool } from "pg";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export interface PasswordResetToken {
  id: string;
  userEmail: string;
  token: string;
  expiresAt: Date;
  hasBeenUsed: boolean;
  createdAt: Date;
}

export interface CreatePasswordResetTokenBody {
  userEmail: string;
  token: string;
  expiresAt: Date;
}

export function getPasswordResetTokenRepository(): PasswordResetTokenRepository {
  return new PasswordResetTokenRepositoryImpl(pool);
}

export interface PasswordResetTokenRepository {
  create(token: CreatePasswordResetTokenBody): Promise<PasswordResetToken>;
  getByToken(token: string): Promise<PasswordResetToken | null>;
  use(token: string): Promise<void>;
  delete(token: string): Promise<void>;
}

class PasswordResetTokenRepositoryImpl implements PasswordResetTokenRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private mapRow(row: any): PasswordResetToken {
    return {
      id: row.id,
      userEmail: row.user_email,
      token: row.token,
      expiresAt: new Date(row.expires_at),
      hasBeenUsed: row.has_been_used,
      createdAt: new Date(row.created_at),
    };
  }

  async create(
    token: CreatePasswordResetTokenBody,
  ): Promise<PasswordResetToken> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO password_reset_token (user_email, token, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [token.userEmail, token.token, token.expiresAt],
      );
      return this.mapRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getByToken(token: string): Promise<PasswordResetToken | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM password_reset_token
      WHERE token = $1
      `,
      [token],
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async use(token: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE password_reset_token
        SET has_been_used = TRUE
        WHERE token = $1
        `,
        [token],
      );
      logger.debug(`Password reset token ${token} marked as used.`);
    } finally {
      client.release();
    }
  }

  async delete(token: string): Promise<void> {
    await this.pool.query(
      `
      DELETE FROM password_reset_token
      WHERE token = $1
      `,
      [token],
    );
  }
}
