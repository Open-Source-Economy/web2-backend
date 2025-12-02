import { Pool } from "pg";
import {
  ApiError,
  Currency,
  DeveloperProfileId,
  DeveloperSettings,
  PreferenceType,
  OpenToOtherOpportunityType,
} from "@open-source-economy/api-types";
import { pool } from "../../dbPool";
import { BaseRepository } from "../helpers";
import { DeveloperSettingsCompanion } from "../helpers/companions";
import { StatusCodes } from "http-status-codes";

export function getDeveloperSettingsRepository(): DeveloperSettingsRepository {
  return new DeveloperSettingsRepositoryImpl(pool);
}

export interface DeveloperSettingsRepository {
  /**
   * Creates new developer settings for a given developer profile.
   * @param developerProfileId The ID of the developer's profile.
   * @param royaltiesPreference Optional preference for royalties income stream.
   * @param servicesPreference Optional preference for services income stream.
   * @param communitySupporterPreference Optional preference for being a community supporter.
   * @returns A Promise that resolves to the newly created DeveloperSettings.
   */
  create(
    developerProfileId: DeveloperProfileId,
    royaltiesPreference?: PreferenceType | null,
    servicesPreference?: PreferenceType | null,
    communitySupporterPreference?: PreferenceType | null,
  ): Promise<DeveloperSettings>;

  /**
   * Updates existing developer settings for a given developer profile.
   * @param developerProfileId The ID of the developer's profile.
   * @param royaltiesPreference Optional preference for royalties income stream.
   * @param servicesPreference Optional preference for services income stream.
   * @param communitySupporterPreference Optional preference for being a community supporter.
   * @param hourlyWeeklyCommitment The developer's hourly/weekly commitment.
   * @param hourlyWeeklyCommitmentComment An optional comment for hourly/weekly commitment.
   * @param openToOtherOpportunity The developer's openness to other opportunities.
   * @param openToOtherOpportunityComment An optional comment for openness to other opportunities.
   * @param hourlyRate The developer's hourly rate.
   * @param hourlyRateComment An optional comment for the hourly rate.
   * @param currency The preferred currency.
   * @returns A Promise that resolves to the updated DeveloperSettings.
   * @throws Error if DeveloperSettings are not found for the given profile.
   */
  update(
    developerProfileId: DeveloperProfileId,
    royaltiesPreference: PreferenceType | null,
    servicesPreference: PreferenceType | null,
    communitySupporterPreference: PreferenceType | null,
    hourlyWeeklyCommitment: number,
    hourlyWeeklyCommitmentComment: string | null,
    openToOtherOpportunity: OpenToOtherOpportunityType,
    openToOtherOpportunityComment: string | null,
    hourlyRate: number,
    hourlyRateComment: string | null,
    currency: Currency,
  ): Promise<DeveloperSettings>;

  /**
   * Partially updates developer settings for a given developer profile.
   * Only the provided fields will be updated.
   * @param developerProfileId The ID of the developer's profile.
   * @param updates An object containing optional fields to update.
   * @returns A Promise that resolves to the updated DeveloperSettings.
   * @throws ApiError if no fields are provided for update or if settings are not found.
   */
  updatePartial(
    developerProfileId: DeveloperProfileId,
    updates: {
      royaltiesPreference?: PreferenceType | null;
      servicesPreference?: PreferenceType | null;
      communitySupporterPreference?: PreferenceType | null;
      hourlyWeeklyCommitment?: number;
      hourlyWeeklyCommitmentComment?: string | null;
      openToOtherOpportunity?: OpenToOtherOpportunityType;
      openToOtherOpportunityComment?: string | null;
      hourlyRate?: number;
      hourlyRateComment?: string | null;
      currency?: Currency;
    },
  ): Promise<DeveloperSettings>;

  /**
   * Finds developer settings by developer profile ID.
   * @param developerProfileId The ID of the developer's profile.
   * @returns A Promise that resolves to the DeveloperSettings or null if not found.
   */
  findByProfileId(
    developerProfileId: DeveloperProfileId,
  ): Promise<DeveloperSettings | null>;

  /**
   * Inserts new developer settings or updates existing ones if a conflict on developer_profile_id occurs.
   * @param developerProfileId The ID of the developer's profile.
   * @param royaltiesPreference Optional preference for royalties income stream.
   * @param servicesPreference Optional preference for services income stream.
   * @param communitySupporterPreference Optional preference for being a community supporter.
   * @param hourlyWeeklyCommitment The developer's hourly/weekly commitment.
   * @param hourlyWeeklyCommitmentComment An optional comment for hourly/weekly commitment.
   * @param openToOtherOpportunity The developer's openness to other opportunities.
   * @param openToOtherOpportunityComment An optional comment for openness to other opportunities.
   * @param hourlyRate The developer's hourly rate.
   * @param hourlyRateComment An optional comment for the hourly rate.
   * @param currency The preferred currency.
   * @returns A Promise that resolves to the created or updated DeveloperSettings.
   */
  upsert(
    developerProfileId: DeveloperProfileId,
    royaltiesPreference: PreferenceType | null,
    servicesPreference: PreferenceType | null,
    communitySupporterPreference: PreferenceType | null,
    hourlyWeeklyCommitment: number,
    hourlyWeeklyCommitmentComment: string | null,
    openToOtherOpportunity: OpenToOtherOpportunityType,
    openToOtherOpportunityComment: string | null,
    hourlyRate: number,
    hourlyRateComment: string | null,
    currency: Currency,
  ): Promise<DeveloperSettings>;
}

class DeveloperSettingsRepositoryImpl
  extends BaseRepository<DeveloperSettings>
  implements DeveloperSettingsRepository
{
  constructor(dbPool: Pool) {
    super(dbPool, DeveloperSettingsCompanion);
  }

  /**
   * Keep a single source of truth for selects.
   */
  private static readonly SELECT_COLUMNS = `
    id,
    developer_profile_id,
    royalties_preference,
    services_preference,
    community_supporter_preference,
    hourly_weekly_commitment,
    hourly_weekly_commitment_comment,
    open_to_other_opportunity,
    open_to_other_opportunity_comment,
    hourly_rate,
    hourly_rate_comment,
    currency,
    created_at,
    updated_at
  `;

  async create(
    developerProfileId: DeveloperProfileId,
    royaltiesPreference?: PreferenceType | null,
    servicesPreference?: PreferenceType | null,
    communitySupporterPreference?: PreferenceType | null,
  ): Promise<DeveloperSettings> {
    const query = `
      INSERT INTO developer_settings (
        developer_profile_id,
        royalties_preference,
        services_preference,
        community_supporter_preference
      ) VALUES ($1, $2, $3, $4)
      RETURNING ${DeveloperSettingsRepositoryImpl.SELECT_COLUMNS}
    `;

    const values = [
      developerProfileId.uuid,
      royaltiesPreference ?? null,
      servicesPreference ?? null,
      communitySupporterPreference ?? null,
    ];

    const result = await this.pool.query(query, values);
    return this.getOne(result.rows);
  }

  async update(
    developerProfileId: DeveloperProfileId,
    royaltiesPreference: PreferenceType | null,
    servicesPreference: PreferenceType | null,
    communitySupporterPreference: PreferenceType | null,
    hourlyWeeklyCommitment: number,
    hourlyWeeklyCommitmentComment: string | null,
    openToOtherOpportunity: OpenToOtherOpportunityType,
    openToOtherOpportunityComment: string | null,
    hourlyRate: number,
    hourlyRateComment: string | null,
    currency: Currency,
  ): Promise<DeveloperSettings> {
    const query = `
      UPDATE developer_settings
      SET
        royalties_preference = $2,
        services_preference = $3,
        community_supporter_preference = $4,
        hourly_weekly_commitment = $5,
        hourly_weekly_commitment_comment = $6,
        open_to_other_opportunity = $7,
        open_to_other_opportunity_comment = $8,
        hourly_rate = $9,
        hourly_rate_comment = $10,
        currency = $11,
        updated_at = now()
      WHERE developer_profile_id = $1
      RETURNING ${DeveloperSettingsRepositoryImpl.SELECT_COLUMNS}
    `;

    const values = [
      developerProfileId.uuid,
      royaltiesPreference,
      servicesPreference,
      communitySupporterPreference,
      hourlyWeeklyCommitment,
      hourlyWeeklyCommitmentComment,
      openToOtherOpportunity,
      openToOtherOpportunityComment,
      hourlyRate,
      hourlyRateComment,
      currency,
    ];

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(
        `DeveloperSettings not found for profile ${developerProfileId.uuid}`,
      );
    }
    return this.getOne(result.rows);
  }

  async updatePartial(
    developerProfileId: DeveloperProfileId,
    updates: {
      royaltiesPreference?: PreferenceType | null;
      servicesPreference?: PreferenceType | null;
      donationsPreference?: PreferenceType | null;
      communitySupporterPreference?: PreferenceType | null;
      hourlyWeeklyCommitment?: number;
      hourlyWeeklyCommitmentComment?: string | null;
      openToOtherOpportunity?: OpenToOtherOpportunityType;
      openToOtherOpportunityComment?: string | null;
      hourlyRate?: number;
      hourlyRateComment?: string | null;
      currency?: Currency;
    },
  ): Promise<DeveloperSettings> {
    const setParts: string[] = [];
    const values: any[] = [developerProfileId.uuid]; // $1 for WHERE clause
    let paramIndex = 2; // Start for dynamic parameters

    if (updates.royaltiesPreference !== undefined) {
      setParts.push(`royalties_preference = $${paramIndex}`);
      values.push(updates.royaltiesPreference);
      paramIndex++;
    }
    if (updates.servicesPreference !== undefined) {
      setParts.push(`services_preference = $${paramIndex}`);
      values.push(updates.servicesPreference);
      paramIndex++;
    }
    if (updates.communitySupporterPreference !== undefined) {
      setParts.push(`community_supporter_preference = $${paramIndex}`);
      values.push(updates.communitySupporterPreference);
      paramIndex++;
    }
    if (updates.hourlyWeeklyCommitment !== undefined) {
      setParts.push(`hourly_weekly_commitment = $${paramIndex}`);
      values.push(updates.hourlyWeeklyCommitment);
      paramIndex++;
    }
    if (updates.hourlyWeeklyCommitmentComment !== undefined) {
      setParts.push(`hourly_weekly_commitment_comment = $${paramIndex}`);
      values.push(updates.hourlyWeeklyCommitmentComment);
      paramIndex++;
    }
    if (updates.openToOtherOpportunity !== undefined) {
      setParts.push(`open_to_other_opportunity = $${paramIndex}`);
      values.push(updates.openToOtherOpportunity);
      paramIndex++;
    }
    if (updates.openToOtherOpportunityComment !== undefined) {
      setParts.push(`open_to_other_opportunity_comment = $${paramIndex}`);
      values.push(updates.openToOtherOpportunityComment);
      paramIndex++;
    }
    if (updates.hourlyRate !== undefined) {
      setParts.push(`hourly_rate = $${paramIndex}`);
      values.push(updates.hourlyRate);
      paramIndex++;
    }
    if (updates.hourlyRateComment !== undefined) {
      setParts.push(`hourly_rate_comment = $${paramIndex}`);
      values.push(updates.hourlyRateComment);
      paramIndex++;
    }
    if (updates.currency !== undefined) {
      setParts.push(`currency = $${paramIndex}`);
      values.push(updates.currency);
      paramIndex++;
    }

    if (setParts.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "No fields provided for partial update.",
      );
    }

    setParts.push(`updated_at = now()`);

    const query = `
      UPDATE developer_settings
      SET ${setParts.join(", ")}
      WHERE developer_profile_id = $1
      RETURNING ${DeveloperSettingsRepositoryImpl.SELECT_COLUMNS}
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `DeveloperSettings not found for profile ${developerProfileId.uuid}`,
      );
    }
    return this.getOne(result.rows);
  }

  async findByProfileId(
    developerProfileId: DeveloperProfileId,
  ): Promise<DeveloperSettings | null> {
    const query = `
      SELECT ${DeveloperSettingsRepositoryImpl.SELECT_COLUMNS}
      FROM developer_settings
      WHERE developer_profile_id = $1
    `;

    const result = await this.pool.query(query, [developerProfileId.uuid]);
    return this.getOptional(result.rows);
  }

  async upsert(
    developerProfileId: DeveloperProfileId,
    royaltiesPreference: PreferenceType | null,
    servicesPreference: PreferenceType | null,
    communitySupporterPreference: PreferenceType | null,
    hourlyWeeklyCommitment: number,
    hourlyWeeklyCommitmentComment: string | null,
    openToOtherOpportunity: OpenToOtherOpportunityType,
    openToOtherOpportunityComment: string | null,
    hourlyRate: number,
    hourlyRateComment: string | null,
    currency: Currency,
  ): Promise<DeveloperSettings> {
    const query = `
      INSERT INTO developer_settings (
        developer_profile_id,
        royalties_preference,
        services_preference,
        community_supporter_preference,
        hourly_weekly_commitment,
        hourly_weekly_commitment_comment,
        open_to_other_opportunity,
        open_to_other_opportunity_comment,
        hourly_rate,
        hourly_rate_comment,
        currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (developer_profile_id)
        DO UPDATE SET
                    royalties_preference = EXCLUDED.royalties_preference,
                    services_preference = EXCLUDED.services_preference,
                    community_supporter_preference = EXCLUDED.community_supporter_preference,
                    hourly_weekly_commitment = EXCLUDED.hourly_weekly_commitment,
                    hourly_weekly_commitment_comment = EXCLUDED.hourly_weekly_commitment_comment,
                    open_to_other_opportunity = EXCLUDED.open_to_other_opportunity,
                    open_to_other_opportunity_comment = EXCLUDED.open_to_other_opportunity_comment,
                    hourly_rate = EXCLUDED.hourly_rate,
                    hourly_rate_comment = EXCLUDED.hourly_rate_comment,
                    currency = EXCLUDED.currency,
                    updated_at = now()
      RETURNING ${DeveloperSettingsRepositoryImpl.SELECT_COLUMNS}
    `;

    const values = [
      developerProfileId.uuid,
      royaltiesPreference,
      servicesPreference,
      communitySupporterPreference,
      hourlyWeeklyCommitment,
      hourlyWeeklyCommitmentComment,
      openToOtherOpportunity,
      openToOtherOpportunityComment,
      hourlyRate,
      hourlyRateComment,
      currency,
    ];

    const result = await this.pool.query(query, values);
    return this.getOne(result.rows);
  }
}
