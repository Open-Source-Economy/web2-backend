import { Pool } from "pg";
import { RepositoryId, UserId, UserRepository } from "../../model";
import { pool } from "../../dbPool";

export function getUserRepositoryRepository(): UserRepositoryRepository {
  return new UserRepositoryRepositoryImpl(pool);
}

export interface UserRepositoryRepository {
  create(userRepository: UserRepository): Promise<UserRepository>;
  getById(
    userId: UserId,
    repositoryId: RepositoryId,
  ): Promise<UserRepository | null>;
  getAll(userId: UserId): Promise<UserRepository[]>;
  update(userRepository: UserRepository): Promise<UserRepository>;
  delete(userId: UserId, repositoryId: RepositoryId): Promise<void>;
}

class UserRepositoryRepositoryImpl implements UserRepositoryRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOne(rows: any[]): UserRepository {
    const issueFunding = this.getOptional(rows);
    if (issueFunding === null) {
      throw new Error("UserRepository not found");
    } else {
      return issueFunding;
    }
  }

  private getOptional(rows: any[]): UserRepository | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple issue fundings found");
    } else {
      const issueFunding = UserRepository.fromBackend(rows[0]);
      if (issueFunding instanceof Error) {
        throw issueFunding;
      }
      return issueFunding;
    }
  }

  private getList(rows: any[]): UserRepository[] {
    return rows.map((r) => {
      const issueFunding = UserRepository.fromBackend(r);
      if (issueFunding instanceof Error) {
        throw issueFunding;
      }
      return issueFunding;
    });
  }

  async create(userRepository: UserRepository): Promise<UserRepository> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
          INSERT INTO user_repository (
            user_id, github_owner_id, github_owner_login, github_repository_id, github_repository_name,
            repository_user_role, dow_rate, dow_currency
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `,
        [
          userRepository.userId.uuid,
          userRepository.repositoryId.ownerId.githubId,
          userRepository.repositoryId.ownerId.login,
          userRepository.repositoryId.githubId,
          userRepository.repositoryId.name,
          userRepository.repositoryUserRole,
          userRepository.dowRate ? userRepository.dowRate.toNumber() : null,
          userRepository.dowCurrency,
        ],
      );
      return this.getOne(result.rows);
    } finally {
      client.release();
    }
  }

  async getById(
    userId: UserId,
    repositoryId: RepositoryId,
  ): Promise<UserRepository | null> {
    const result = await this.pool.query(
      `
        SELECT * FROM user_repository WHERE user_id = $1 AND github_owner_login = $2 AND github_repository_name = $3
      `,
      [userId.uuid, repositoryId.ownerId.login, repositoryId.name],
    );
    return this.getOptional(result.rows);
  }

  async getAll(userId: UserId): Promise<UserRepository[]> {
    const result = await this.pool.query(
      `
            SELECT * FROM user_repository WHERE user_id = $1
        `,
      [userId.uuid],
    );
    return this.getList(result.rows);
  }

  async update(userRepository: UserRepository): Promise<UserRepository> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
          UPDATE user_repository
          SET repository_user_role = $1, dow_rate = $2, dow_currency = $3, updated_at = now()
          WHERE user_id = $4 AND github_owner_login = $5 AND github_repository_name = $6
          RETURNING *
        `,
        [
          userRepository.repositoryUserRole,
          userRepository.dowRate ? userRepository.dowRate.toNumber() : null,
          userRepository.dowCurrency,
          userRepository.userId.uuid,
          userRepository.repositoryId.ownerId.login,
          userRepository.repositoryId.name,
        ],
      );
      return this.getOne(result.rows);
    } finally {
      client.release();
    }
  }

  async delete(userId: UserId, repositoryId: RepositoryId): Promise<void> {
    await this.pool.query(
      `
        DELETE FROM user_repository WHERE user_id = $1 AND github_owner_login = $2 AND github_repository_name = $3
      `,
      [userId.uuid, repositoryId.ownerId.login, repositoryId.name],
    );
  }
}
