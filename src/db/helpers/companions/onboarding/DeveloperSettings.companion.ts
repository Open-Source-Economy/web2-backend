import {
  DeveloperSettings,
  DeveloperSettingsId,
  DeveloperProfileId,
  OpenToOtherOpportunityType,
  IncomeStreamType,
  Currency,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";

export namespace DeveloperSettingsCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): DeveloperSettings | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const developerProfileId = validator.requiredString(
      `${table_prefix}developer_profile_id`,
    );
    const incomeStreams = validator.optionalArrayOfEnums(
      `${table_prefix}income_streams`,
      Object.values(IncomeStreamType) as IncomeStreamType[],
    );
    const hourlyWeeklyCommitment = validator.optionalNumber(
      `${table_prefix}hourly_weekly_commitment`,
    );
    const hourlyWeeklyCommitmentComment = validator.optionalString(
      `${table_prefix}hourly_weekly_commitment_comment`,
    );
    const openToOtherOpportunity = validator.optionalEnum(
      `${table_prefix}open_to_other_opportunity`,
      Object.values(OpenToOtherOpportunityType) as OpenToOtherOpportunityType[],
    );
    const openToOtherOpportunityComment = validator.optionalString(
      `${table_prefix}open_to_other_opportunity_comment`,
    );
    const hourlyRate = validator.optionalNumber(`${table_prefix}hourly_rate`);
    const hourlyRateComment = validator.optionalString(
      `${table_prefix}hourly_rate_comment`,
    );
    const currency = validator.optionalEnum(
      `${table_prefix}currency`,
      Object.values(Currency) as Currency[],
    );
    const createdAt = validator.requiredDate(`${table_prefix}created_at`);
    const updatedAt = validator.requiredDate(`${table_prefix}updated_at`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    const success: DeveloperSettings = {
      id: new DeveloperSettingsId(id),
      developerProfileId: new DeveloperProfileId(developerProfileId),
      incomeStreams: incomeStreams,
      hourlyWeeklyCommitment,
      hourlyWeeklyCommitmentComment,
      openToOtherOpportunity,
      openToOtherOpportunityComment,
      hourlyRate,
      hourlyRateComment,
      currency,
      createdAt,
      updatedAt,
    };

    return success;
  }
}
