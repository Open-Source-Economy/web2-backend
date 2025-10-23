import { Pool } from "pg";
import {
  DeveloperProfile,
  DeveloperProfileId,
  UserId,
} from "@open-source-economy/api-types";
import { pool } from "../../dbPool";
import { logger } from "../../config";
import { BaseRepository } from "../helpers";
import { DeveloperProfileCompanion } from "../helpers/companions";

export function getDeveloperProfileRepository(): DeveloperProfileRepository {
  return new DeveloperProfileRepositoryImpl(pool);
}

export interface DeveloperProfileRepository {
  /**
   * Creates a new developer profile for a given user ID and contact email.
   * @param userId The ID of the user.
   * @param contactEmail The contact email for the developer profile.
   * @returns A promise that resolves to the newly created DeveloperProfile.
   */
  create(userId: UserId, contactEmail: string): Promise<DeveloperProfile>;

  /**
   * Retrieves a developer profile by its user ID.
   * @param userId The ID of the user.
   * @returns A promise that resolves to the DeveloperProfile or null if not found.
   */
  getByUserId(userId: UserId): Promise<DeveloperProfile | null>;

  /**
   * Retrieves a developer profile by its profile ID.
   * @param profileId The ID of the developer profile.
   * @returns A promise that resolves to the DeveloperProfile or null if not found.
   */
  getById(profileId: DeveloperProfileId): Promise<DeveloperProfile | null>;

  /**
   * Marks a developer's onboarding as completed.
   * @param profileId The ID of the developer profile.
   * @returns A promise that resolves when the update is complete.
   */
  markCompleted(profileId: DeveloperProfileId): Promise<void>;

  /**
   * Updates the contact email for a specific developer profile.
   * @param profileId The ID of the developer profile to update.
   * @param email The new contact email address.
   * @returns A promise that resolves to the updated DeveloperProfile.
   * @throws Error if the developer profile is not found.
   */
  updateEmail(
    profileId: DeveloperProfileId,
    email: string,
  ): Promise<DeveloperProfile>;
}

class DeveloperProfileRepositoryImpl
  extends BaseRepository<DeveloperProfile>
  implements DeveloperProfileRepository
{
  constructor(pool: Pool) {
    super(pool, DeveloperProfileCompanion);
  }

  async create(
    userId: UserId,
    contactEmail: string,
  ): Promise<DeveloperProfile> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
            INSERT INTO developer_profile (user_id, contact_email)
            VALUES ($1, $2)
            RETURNING *
          `,
        [userId.uuid, contactEmail],
      );

      return this.getOne(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async getByUserId(userId: UserId): Promise<DeveloperProfile | null> {
    logger.debug(`Getting developer profile by user id:`, userId.uuid);
    const result = await this.pool.query(
      `
          SELECT *
          FROM developer_profile
          WHERE user_id = $1
        `,
      [userId.uuid],
    );

    return this.getOptional(result.rows);
  }

  async getById(
    profileId: DeveloperProfileId,
  ): Promise<DeveloperProfile | null> {
    logger.debug(`Getting developer profile by id:`, profileId.uuid);
    const result = await this.pool.query(
      `
          SELECT *
          FROM developer_profile
          WHERE id = $1
        `,
      [profileId.uuid],
    );

    return this.getOptional(result.rows);
  }

  async markCompleted(profileId: DeveloperProfileId): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `
            UPDATE developer_profile
            SET onboarding_completed = true,
                updated_at           = $1
            WHERE id = $2
          `,
        [new Date(), profileId.uuid],
      );
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async updateEmail(
    profileId: DeveloperProfileId,
    email: string,
  ): Promise<DeveloperProfile> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                    UPDATE developer_profile
                    SET contact_email = $1,
                        updated_at = $2
                    WHERE user_id = $3
                    RETURNING *
                `,
        [email, new Date(), profileId.uuid],
      );

      if (result.rows.length === 0) {
        throw new Error(`DeveloperProfile not found with id ${profileId.uuid}`);
      }
      return this.getOne(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
}
