import { Pool } from "pg";
import {
  DeveloperSettings,
  IncomeStreamType,
  OpenToOtherOpportunityType,
  CurrencyType,
} from "../../api/model/onboarding/DeveloperSettings";
import { DeveloperProfileId } from "../../api/model/onboarding";

export class DeveloperSettingsRepository {
  private dbPool: Pool;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
  }

  async create(
    developerProfileId: string,
    incomeStreams: IncomeStreamType[],
    hourlyWeeklyCommitment: number,
    openToOtherOpportunity: OpenToOtherOpportunityType,
    hourlyRate: number,
    currency: CurrencyType,
  ): Promise<DeveloperSettings> {
    const query = `
      INSERT INTO developer_settings (
        developer_profile_id,
        income_streams,
        hourly_weekly_commitment,
        open_to_other_opportunity,
        hourly_rate,
        currency
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      developerProfileId,
      incomeStreams,
      hourlyWeeklyCommitment,
      openToOtherOpportunity,
      hourlyRate,
      currency,
    ];

    const result = await this.dbPool.query(query, values);
    return this.mapToDeveloperSettings(result.rows[0]);
  }

  async update(
    developerProfileId: string,
    incomeStreams: IncomeStreamType[],
    hourlyWeeklyCommitment: number,
    openToOtherOpportunity: OpenToOtherOpportunityType,
    hourlyRate: number,
    currency: CurrencyType,
  ): Promise<DeveloperSettings> {
    const query = `
      UPDATE developer_settings
      SET 
        income_streams = $2,
        hourly_weekly_commitment = $3,
        open_to_other_opportunity = $4,
        hourly_rate = $5,
        currency = $6,
        updated_at = now()
      WHERE developer_profile_id = $1
      RETURNING *
    `;

    const values = [
      developerProfileId,
      incomeStreams,
      hourlyWeeklyCommitment,
      openToOtherOpportunity,
      hourlyRate,
      currency,
    ];

    const result = await this.dbPool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(
        `DeveloperSettings not found for profile ${developerProfileId}`,
      );
    }
    return this.mapToDeveloperSettings(result.rows[0]);
  }

  async findByProfileId(
    developerProfileId: string,
  ): Promise<DeveloperSettings | null> {
    const query = `
      SELECT * FROM developer_settings
      WHERE developer_profile_id = $1
    `;

    const result = await this.dbPool.query(query, [developerProfileId]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToDeveloperSettings(result.rows[0]);
  }

  async upsert(
    developerProfileId: string,
    incomeStreams: IncomeStreamType[],
    hourlyWeeklyCommitment: number,
    openToOtherOpportunity: OpenToOtherOpportunityType,
    hourlyRate: number,
    currency: CurrencyType,
  ): Promise<DeveloperSettings> {
    const query = `
      INSERT INTO developer_settings (
        developer_profile_id,
        income_streams,
        hourly_weekly_commitment,
        open_to_other_opportunity,
        hourly_rate,
        currency
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (developer_profile_id) 
      DO UPDATE SET
        income_streams = EXCLUDED.income_streams,
        hourly_weekly_commitment = EXCLUDED.hourly_weekly_commitment,
        open_to_other_opportunity = EXCLUDED.open_to_other_opportunity,
        hourly_rate = EXCLUDED.hourly_rate,
        currency = EXCLUDED.currency,
        updated_at = now()
      RETURNING *
    `;

    const values = [
      developerProfileId,
      incomeStreams,
      hourlyWeeklyCommitment,
      openToOtherOpportunity,
      hourlyRate,
      currency,
    ];

    const result = await this.dbPool.query(query, values);
    return this.mapToDeveloperSettings(result.rows[0]);
  }

  private mapToDeveloperSettings(row: any): DeveloperSettings {
    return new DeveloperSettings({
      id: row.id,
      developerProfileId: row.developer_profile_id,
      incomeStreams: row.income_streams,
      hourlyWeeklyCommitment: row.hourly_weekly_commitment,
      openToOtherOpportunity: row.open_to_other_opportunity,
      hourlyRate: parseFloat(row.hourly_rate),
      currency: row.currency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
