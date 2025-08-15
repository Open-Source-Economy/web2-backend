import { Pool } from "pg";
import {
  DeveloperProfile,
  DeveloperProfileId,
} from "../../api/model/onboarding";
import { UserId } from "../../api/model";
import {
  CreateDeveloperProfileDto,
  UpdateDeveloperProfileDto,
} from "../../api/dto";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export function getDeveloperProfileRepository(): DeveloperProfileRepository {
  return new DeveloperProfileRepositoryImpl(pool);
}

export interface DeveloperProfileRepository {
  create(
    profile: CreateDeveloperProfileDto,
    userId: string,
  ): Promise<DeveloperProfile>;
  update(
    profileId: string,
    updates: UpdateDeveloperProfileDto,
  ): Promise<DeveloperProfile>;
  getByUserId(userId: string): Promise<DeveloperProfile | null>;
  getById(profileId: string): Promise<DeveloperProfile | null>;
  markCompleted(profileId: string): Promise<void>;
}

class DeveloperProfileRepositoryImpl implements DeveloperProfileRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneDeveloperProfile(rows: any[]): DeveloperProfile {
    const profile = this.getOptionalDeveloperProfile(rows);
    if (profile === null) {
      throw new Error("Developer profile not found");
    }
    return profile;
  }

  private getOptionalDeveloperProfile(rows: any[]): DeveloperProfile | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple developer profiles found");
    } else {
      const profile = DeveloperProfile.fromBackend(rows[0]);
      if (profile instanceof Error) {
        throw profile;
      }
      return profile;
    }
  }

  async create(
    profile: CreateDeveloperProfileDto,
    userId: string,
  ): Promise<DeveloperProfile> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        INSERT INTO developer_profile (user_id)
        VALUES ($1) 
        RETURNING *
        `,
        [userId],
      );

      return this.getOneDeveloperProfile(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    profileId: string,
    updates: UpdateDeveloperProfileDto,
  ): Promise<DeveloperProfile> {
    const client = await this.pool.connect();

    try {
      // Since all user fields moved to app_user, only update timestamp
      const result = await client.query(
        `
        UPDATE developer_profile
        SET updated_at = $1
        WHERE id = $2
        RETURNING *
        `,
        [new Date(), profileId],
      );

      return this.getOneDeveloperProfile(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async getByUserId(userId: string): Promise<DeveloperProfile | null> {
    logger.debug(`Getting developer profile by user id:`, userId);
    const result = await this.pool.query(
      `
      SELECT *
      FROM developer_profile
      WHERE user_id = $1
      `,
      [userId],
    );

    return this.getOptionalDeveloperProfile(result.rows);
  }

  async getById(profileId: string): Promise<DeveloperProfile | null> {
    logger.debug(`Getting developer profile by id:`, profileId);
    const result = await this.pool.query(
      `
      SELECT *
      FROM developer_profile
      WHERE id = $1
      `,
      [profileId],
    );

    return this.getOptionalDeveloperProfile(result.rows);
  }

  async markCompleted(profileId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `
        UPDATE developer_profile
        SET onboarding_completed = true, updated_at = $1
        WHERE id = $2
        `,
        [new Date(), profileId],
      );
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
}
