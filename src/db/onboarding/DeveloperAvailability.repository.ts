import { Pool } from "pg";
import { DeveloperAvailability, DeveloperAvailabilityId } from "../../api/model/onboarding";
import { SetAvailabilityDto, UpdateAvailabilityDto } from "../../api/dto";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export function getDeveloperAvailabilityRepository(): DeveloperAvailabilityRepository {
  return new DeveloperAvailabilityRepositoryImpl(pool);
}

export interface DeveloperAvailabilityRepository {
  createOrUpdate(availability: SetAvailabilityDto, profileId: string): Promise<DeveloperAvailability>;
  update(profileId: string, updates: UpdateAvailabilityDto): Promise<DeveloperAvailability>;
  getByProfileId(profileId: string): Promise<DeveloperAvailability | null>;
  delete(profileId: string): Promise<void>;
}

class DeveloperAvailabilityRepositoryImpl implements DeveloperAvailabilityRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneDeveloperAvailability(rows: any[]): DeveloperAvailability {
    const availability = this.getOptionalDeveloperAvailability(rows);
    if (availability === null) {
      throw new Error("Developer availability not found");
    }
    return availability;
  }

  private getOptionalDeveloperAvailability(rows: any[]): DeveloperAvailability | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple developer availabilities found");
    } else {
      const availability = DeveloperAvailability.fromBackend(rows[0]);
      if (availability instanceof Error) {
        throw availability;
      }
      return availability;
    }
  }

  async createOrUpdate(availability: SetAvailabilityDto, profileId: string): Promise<DeveloperAvailability> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        INSERT INTO developer_availability (
          developer_profile_id, weekly_commitment, larger_opportunities, 
          hourly_rate, currency
        )
        VALUES ($1, $2, $3, $4, $5) 
        ON CONFLICT (developer_profile_id) 
        DO UPDATE SET 
          weekly_commitment = EXCLUDED.weekly_commitment,
          larger_opportunities = EXCLUDED.larger_opportunities,
          hourly_rate = EXCLUDED.hourly_rate,
          currency = EXCLUDED.currency,
          updated_at = now()
        RETURNING *
        `,
        [
          profileId,
          availability.weeklyCommitment,
          availability.largerOpportunities,
          availability.hourlyRate,
          availability.currency,
        ],
      );

      return this.getOneDeveloperAvailability(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async update(profileId: string, updates: UpdateAvailabilityDto): Promise<DeveloperAvailability> {
    const client = await this.pool.connect();

    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.weeklyCommitment !== undefined) {
        setParts.push(`weekly_commitment = $${paramIndex}`);
        values.push(updates.weeklyCommitment);
        paramIndex++;
      }

      if (updates.largerOpportunities !== undefined) {
        setParts.push(`larger_opportunities = $${paramIndex}`);
        values.push(updates.largerOpportunities);
        paramIndex++;
      }

      if (updates.hourlyRate !== undefined) {
        setParts.push(`hourly_rate = $${paramIndex}`);
        values.push(updates.hourlyRate);
        paramIndex++;
      }

      if (updates.currency !== undefined) {
        setParts.push(`currency = $${paramIndex}`);
        values.push(updates.currency);
        paramIndex++;
      }

      setParts.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      paramIndex++;

      values.push(profileId);

      const result = await client.query(
        `
        UPDATE developer_availability
        SET ${setParts.join(', ')}
        WHERE developer_profile_id = $${paramIndex}
        RETURNING *
        `,
        values,
      );

      return this.getOneDeveloperAvailability(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async getByProfileId(profileId: string): Promise<DeveloperAvailability | null> {
    logger.debug(`Getting developer availability by profile id:`, profileId);
    const result = await this.pool.query(
      `
      SELECT *
      FROM developer_availability
      WHERE developer_profile_id = $1
      `,
      [profileId],
    );

    return this.getOptionalDeveloperAvailability(result.rows);
  }

  async delete(profileId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `
        DELETE FROM developer_availability
        WHERE developer_profile_id = $1
        `,
        [profileId],
      );
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
}