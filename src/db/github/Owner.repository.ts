import { Pool } from "pg";
import { Owner, OwnerId } from "../../api/model";
import { pool } from "../../dbPool";
import { encryptToken, decryptToken, EncryptedData } from "../../utils/crypto";

export function getOwnerRepository(): OwnerRepository {
  return new OwnerRepositoryImpl(pool);
}

export interface GitHubTokenData {
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  expiresAt?: Date;
}

export interface OwnerRepository {
  insertOrUpdate(owner: Owner): Promise<Owner>;
  getById(id: OwnerId): Promise<Owner | null>;
  getAll(): Promise<Owner[]>;
  updateTokens(githubId: number, tokens: GitHubTokenData): Promise<void>;
  getTokenByUserId(userId: string): Promise<string | null>;
  getTokenByGithubId(githubId: number): Promise<GitHubTokenData | null>;
  insertOrUpdateWithTokens(
    owner: Owner,
    tokens: GitHubTokenData,
  ): Promise<Owner>;
}

class OwnerRepositoryImpl implements OwnerRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneOwner(rows: any[]): Owner {
    const owner = this.getOptionalOwner(rows);
    if (owner === null) {
      throw new Error("Owner not found");
    } else {
      return owner;
    }
  }

  private getOptionalOwner(rows: any[]): Owner | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple owners found");
    } else {
      const owner = Owner.fromBackend(rows[0]);
      if (owner instanceof Error) {
        throw owner;
      }
      return owner;
    }
  }

  private getOwnerList(rows: any[]): Owner[] {
    return rows.map((r) => {
      const owner = Owner.fromBackend(r);
      if (owner instanceof Error) {
        throw owner;
      }
      return owner;
    });
  }

  async getAll(): Promise<Owner[]> {
    const result = await this.pool.query(`
            SELECT github_id, github_type, github_login, github_html_url, github_avatar_url 
            FROM github_owner
        `);

    return this.getOwnerList(result.rows);
  }

  async getById(id: OwnerId): Promise<Owner | null> {
    const query = `SELECT * FROM github_owner WHERE github_login = $1`;
    const result = await this.pool.query(query, [id.login]);

    return this.getOptionalOwner(result.rows);
  }

  async insertOrUpdate(owner: Owner): Promise<Owner> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
            INSERT INTO github_owner (github_id, github_login, github_type, github_html_url, github_avatar_url)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (github_login) DO UPDATE
                SET github_id         = EXCLUDED.github_id,
                    github_type       = EXCLUDED.github_type,
                    github_html_url   = EXCLUDED.github_html_url,
                    github_avatar_url = EXCLUDED.github_avatar_url,
                    updated_at        = NOW()
            RETURNING github_id, github_login, github_type, github_html_url, github_avatar_url
        `,
        [
          owner.id.githubId,
          owner.id.login,
          owner.type,
          owner.htmlUrl,
          owner.avatarUrl,
        ],
      );

      return this.getOneOwner(result.rows);
    } finally {
      client.release();
    }
  }

  async updateTokens(githubId: number, tokens: GitHubTokenData): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Encrypt the access token
      const encryptedAccess = encryptToken(tokens.accessToken);

      // Encrypt refresh token if provided
      let encryptedRefresh: EncryptedData | null = null;
      if (tokens.refreshToken) {
        encryptedRefresh = encryptToken(tokens.refreshToken);
      }

      await client.query(
        `
        UPDATE github_owner 
        SET access_token_encrypted = $1, 
            access_token_iv = $2,
            access_token_auth_tag = $3,
            refresh_token_encrypted = $4,
            refresh_token_iv = $5,
            refresh_token_auth_tag = $6,
            token_scope = $7,
            token_expires_at = $8,
            token_updated_at = now(),
            updated_at = now()
        WHERE github_id = $9
        `,
        [
          encryptedAccess.encrypted,
          encryptedAccess.iv,
          encryptedAccess.authTag,
          encryptedRefresh?.encrypted || null,
          encryptedRefresh?.iv || null,
          encryptedRefresh?.authTag || null,
          tokens.scope || null,
          tokens.expiresAt || null,
          githubId,
        ],
      );
    } finally {
      client.release();
    }
  }

  async getTokenByUserId(userId: string): Promise<string | null> {
    const result = await this.pool.query(
      `
      SELECT go.access_token_encrypted, go.access_token_iv, go.access_token_auth_tag
      FROM github_owner go
      JOIN app_user au ON au.github_owner_id = go.github_id
      WHERE au.id = $1 AND go.access_token_encrypted IS NOT NULL
      `,
      [userId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    try {
      return decryptToken({
        encrypted: row.access_token_encrypted,
        iv: row.access_token_iv,
        authTag: row.access_token_auth_tag,
      });
    } catch (error) {
      console.error("Failed to decrypt access token:", error);
      return null;
    }
  }

  async getTokenByGithubId(githubId: number): Promise<GitHubTokenData | null> {
    const result = await this.pool.query(
      `
      SELECT access_token_encrypted, access_token_iv, access_token_auth_tag,
             refresh_token_encrypted, refresh_token_iv, refresh_token_auth_tag,
             token_scope, token_expires_at
      FROM github_owner
      WHERE github_id = $1 AND access_token_encrypted IS NOT NULL
      `,
      [githubId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    try {
      const accessToken = decryptToken({
        encrypted: row.access_token_encrypted,
        iv: row.access_token_iv,
        authTag: row.access_token_auth_tag,
      });

      let refreshToken: string | undefined;
      if (row.refresh_token_encrypted && row.refresh_token_iv) {
        refreshToken = decryptToken({
          encrypted: row.refresh_token_encrypted,
          iv: row.refresh_token_iv,
          authTag: row.refresh_token_auth_tag,
        });
      }

      return {
        accessToken,
        refreshToken,
        scope: row.token_scope,
        expiresAt: row.token_expires_at,
      };
    } catch (error) {
      console.error("Failed to decrypt tokens:", error);
      return null;
    }
  }

  async insertOrUpdateWithTokens(
    owner: Owner,
    tokens: GitHubTokenData,
  ): Promise<Owner> {
    const client = await this.pool.connect();

    try {
      // Encrypt the access token
      const encryptedAccess = encryptToken(tokens.accessToken);

      // Encrypt refresh token if provided
      let encryptedRefresh: EncryptedData | null = null;
      if (tokens.refreshToken) {
        encryptedRefresh = encryptToken(tokens.refreshToken);
      }

      const result = await client.query(
        `
        INSERT INTO github_owner (
          github_id, github_login, github_type, github_html_url, github_avatar_url,
          access_token_encrypted, access_token_iv, access_token_auth_tag,
          refresh_token_encrypted, refresh_token_iv, refresh_token_auth_tag,
          token_scope, token_expires_at, token_updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
        ON CONFLICT (github_login) DO UPDATE
            SET github_id = EXCLUDED.github_id,
                github_type = EXCLUDED.github_type,
                github_html_url = EXCLUDED.github_html_url,
                github_avatar_url = EXCLUDED.github_avatar_url,
                access_token_encrypted = EXCLUDED.access_token_encrypted,
                access_token_iv = EXCLUDED.access_token_iv,
                access_token_auth_tag = EXCLUDED.access_token_auth_tag,
                refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                refresh_token_iv = EXCLUDED.refresh_token_iv,
                refresh_token_auth_tag = EXCLUDED.refresh_token_auth_tag,
                token_scope = EXCLUDED.token_scope,
                token_expires_at = EXCLUDED.token_expires_at,
                token_updated_at = now(),
                updated_at = now()
        RETURNING github_id, github_login, github_type, github_html_url, github_avatar_url
        `,
        [
          owner.id.githubId,
          owner.id.login,
          owner.type,
          owner.htmlUrl,
          owner.avatarUrl,
          encryptedAccess.encrypted,
          encryptedAccess.iv,
          encryptedAccess.authTag,
          encryptedRefresh?.encrypted || null,
          encryptedRefresh?.iv || null,
          encryptedRefresh?.authTag || null,
          tokens.scope || null,
          tokens.expiresAt || null,
        ],
      );

      return this.getOneOwner(result.rows);
    } finally {
      client.release();
    }
  }
}
