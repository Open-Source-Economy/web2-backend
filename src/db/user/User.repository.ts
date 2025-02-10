import { Pool } from "pg";
import {
  Currency,
  LocalUser,
  Owner,
  Provider,
  ThirdPartyUser,
  ThirdPartyUserId,
  User,
  UserId,
  UserRole,
} from "../../model";
import { pool } from "../../dbPool";
import { encrypt } from "../../utils";

export function getUserRepository(): UserRepository {
  return new UserRepositoryImpl(pool);
}

export interface CreateUser {
  name: string | null;
  data: LocalUser | ThirdPartyUser;
  role: UserRole;
  preferredCurrency?: Currency;
}

export interface UserRepository {
  insert(user: CreateUser): Promise<User>;
  validateEmail(email: string): Promise<User | null>;
  getById(id: UserId): Promise<User | null>;
  getAll(): Promise<User[]>;
  findOne(email: string): Promise<User | null>;
  findByThirdPartyId(
    thirdPartyId: ThirdPartyUserId,
    provider: Provider,
  ): Promise<User | null>;
  setPreferredCurrency(userId: UserId, currency: Currency): Promise<void>;
}

class UserRepositoryImpl implements UserRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneUser(rows: any[], owner: Owner | null = null): User {
    const user = this.getOptionalUser(rows, owner);
    if (user === null) {
      throw new Error("User not found");
    } else {
      return user;
    }
  }

  private getOptionalUser(
    rows: any[],
    owner: Owner | null = null,
  ): User | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple users found");
    } else {
      const user = User.fromRaw(rows[0], owner);
      if (user instanceof Error) {
        throw user;
      }
      return user;
    }
  }

  private getUserList(rows: any[]): User[] {
    return rows.map((r) => {
      const user = User.fromRaw(r);
      if (user instanceof Error) {
        throw user;
      }
      return user;
    });
  }

  async validateEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      `
                UPDATE app_user
                SET is_email_verified = TRUE
                WHERE email = $1
                RETURNING *
            `,
      [email],
    );

    return this.getOptionalUser(result.rows);
  }

  async getAll(): Promise<User[]> {
    const result = await this.pool.query(
      `
                SELECT au.*,
                       go.github_id,
                       go.github_type,
                       go.github_login,
                       go.github_html_url,
                       go.github_avatar_url
                FROM app_user au
                         LEFT JOIN github_owner go ON au.github_owner_id = go.github_id
            `,
      [],
    );
    return this.getUserList(result.rows);
  }

  async getById(id: UserId): Promise<User | null> {
    const result = await this.pool.query(
      `
                SELECT au.*,
                       go.github_id,
                       go.github_type,
                       go.github_login,
                       go.github_html_url,
                       go.github_avatar_url
                FROM app_user au
                         LEFT JOIN github_owner go ON au.github_owner_id = go.github_id
                WHERE au.id = $1
            `,
      [id.uuid],
    );
    return this.getOptionalUser(result.rows);
  }

  async insert(user: CreateUser): Promise<User> {
    const client = await this.pool.connect();

    if (user.data instanceof LocalUser) {
      const hashedPassword = await encrypt.hashPassword(user.data.password);
      try {
        const result = await client.query(
          `
          INSERT INTO app_user (name, email, is_email_verified, hashed_password, role, preferred_currency)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `,
          [
            user.name,
            user.data.email,
            false,
            hashedPassword,
            user.role,
            user.preferredCurrency,
          ],
        );

        return this.getOneUser(result.rows);
      } finally {
        client.release();
      }
    } else if (user.data.provider === Provider.Github) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN"); // Start a transaction

        const owner = user.data.providerData.owner;

        // Insert or update the Github owner
        const ownerResult = await client.query(
          `
          INSERT INTO github_owner (github_id, github_type, github_login, github_html_url, github_avatar_url)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (github_id) DO UPDATE
              SET github_type       = EXCLUDED.github_type,
                  github_login      = EXCLUDED.github_login,
                  github_html_url   = EXCLUDED.github_html_url,
                  github_avatar_url = EXCLUDED.github_avatar_url
          RETURNING *
        `,
          [
            owner.id.githubId,
            owner.type,
            owner.id.login,
            owner.htmlUrl,
            owner.avatarUrl,
          ],
        );

        const githubOwner = Owner.fromBackend(ownerResult.rows[0]);
        if (githubOwner instanceof Error) {
          throw githubOwner;
        }

        // Insert or update the ThirdPartyUser
        const userResult = await client.query(
          `
          INSERT INTO app_user (provider, third_party_id, name, email, is_email_verified, role, github_owner_id, github_owner_login, preferred_currency)
          VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, $8)
          ON CONFLICT (third_party_id) DO UPDATE
              SET provider           = EXCLUDED.provider,
                  name               = EXCLUDED.name,
                  email              = EXCLUDED.email,
                  role               = EXCLUDED.role,
                  github_owner_id    = EXCLUDED.github_owner_id,
                  github_owner_login = EXCLUDED.github_owner_login,
                  preferred_currency = EXCLUDED.preferred_currency
          RETURNING *
        `,
          [
            user.data.provider,
            user.data.id.id,
            user.name,
            user.data.email,
            UserRole.USER,
            githubOwner.id.githubId,
            githubOwner.id.login,
            user.preferredCurrency,
          ],
        );

        const insertedUser = this.getOneUser(userResult.rows, githubOwner);
        await client.query("COMMIT"); // Commit the transaction if everything is successful
        return insertedUser;
      } catch (error) {
        await client.query("ROLLBACK"); // Rollback the transaction if there's an error
        throw error;
      } finally {
        client.release(); // Release the client back to the pool
      }
    } else {
      throw new Error("Invalid provider, was expecting Github");
    }
  }

  async findOne(email: string): Promise<User | null> {
    const result = await this.pool.query(
      `
                SELECT au.id,
                       au.name,
                       au.email,
                       au.is_email_verified,
                       au.hashed_password,
                       au.role,
                       au.provider,
                       au.third_party_id,
                       go.github_id,
                       go.github_type,
                       go.github_login,
                       go.github_html_url,
                       go.github_avatar_url
                FROM app_user au
                         LEFT JOIN github_owner go ON au.github_owner_id = go.github_id
                WHERE au.email = $1
            `,
      [email],
    );
    return this.getOptionalUser(result.rows);
  }

  async findByThirdPartyId(
    id: ThirdPartyUserId,
    provider: Provider,
  ): Promise<User | null> {
    const result = await this.pool.query(
      `
                SELECT au.id,
                       au.name,
                       au.email,
                       au.is_email_verified,
                       au.hashed_password,
                       au.role,
                       au.provider,
                       au.third_party_id,
                       go.github_id,
                       go.github_type,
                       go.github_login,
                       go.github_html_url,
                       go.github_avatar_url
                FROM app_user au
                         LEFT JOIN github_owner go ON au.github_owner_id = go.github_id
                WHERE au.third_party_id = $1
                  AND au.provider = $2
            `,
      [id.id, provider],
    );
    return this.getOptionalUser(result.rows);
  }

  async setPreferredCurrency(
    userId: UserId,
    currency: Currency,
  ): Promise<void> {
    const result = await this.pool.query(
      `
      UPDATE app_user
      SET preferred_currency = $1
      WHERE id = $2
    `,
      [currency, userId.uuid],
    );

    if (result.rowCount === 0) {
      throw new Error(`User with id ${userId.uuid} not found`);
    }
  }
}
