import { Pool } from "pg";
import { DeveloperIncomePreference, DeveloperIncomePreferenceId } from "../../api/model/onboarding";
import { SetIncomePreferenceDto } from "../../api/dto";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export function getDeveloperIncomePreferenceRepository(): DeveloperIncomePreferenceRepository {
  return new DeveloperIncomePreferenceRepositoryImpl(pool);
}

export interface DeveloperIncomePreferenceRepository {
  createOrUpdate(preference: SetIncomePreferenceDto, profileId: string): Promise<DeveloperIncomePreference>;
  getByProfileId(profileId: string): Promise<DeveloperIncomePreference | null>;
  delete(profileId: string): Promise<void>;
}

class DeveloperIncomePreferenceRepositoryImpl implements DeveloperIncomePreferenceRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneDeveloperIncomePreference(rows: any[]): DeveloperIncomePreference {
    const preference = this.getOptionalDeveloperIncomePreference(rows);
    if (preference === null) {
      throw new Error("Developer income preference not found");
    }
    return preference;
  }

  private getOptionalDeveloperIncomePreference(rows: any[]): DeveloperIncomePreference | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple developer income preferences found");
    } else {
      const preference = DeveloperIncomePreference.fromBackend(rows[0]);
      if (preference instanceof Error) {
        throw preference;
      }
      return preference;
    }
  }

  async createOrUpdate(preference: SetIncomePreferenceDto, profileId: string): Promise<DeveloperIncomePreference> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        INSERT INTO developer_income_preference (developer_profile_id, income_type)
        VALUES ($1, $2) 
        ON CONFLICT (developer_profile_id) 
        DO UPDATE SET 
          income_type = EXCLUDED.income_type,
          updated_at = now()
        RETURNING *
        `,
        [profileId, preference.incomeType],
      );

      return this.getOneDeveloperIncomePreference(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async getByProfileId(profileId: string): Promise<DeveloperIncomePreference | null> {
    logger.debug(`Getting developer income preference by profile id:`, profileId);
    const result = await this.pool.query(
      `
      SELECT *
      FROM developer_income_preference
      WHERE developer_profile_id = $1
      `,
      [profileId],
    );

    return this.getOptionalDeveloperIncomePreference(result.rows);
  }

  async delete(profileId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `
        DELETE FROM developer_income_preference
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