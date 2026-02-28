import type { DeveloperSettings, DeveloperSettingsId, DeveloperProfileId } from "@open-source-economy/api-types";
import { PreferenceType, OpenToOtherOpportunityType } from "@open-source-economy/api-types";
import { toISODateTimeString } from "../../../utils/date.utils";
import { optionalEnum, parseCurrency } from "../../../utils/enum-utils";

export function mapDeveloperSettingsFromRow(row: Record<string, any>, prefix = ""): DeveloperSettings {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const developerProfileId = row[`${prefix}developer_profile_id`];
  if (!developerProfileId) throw new Error(`Missing ${prefix}developer_profile_id`);

  const createdAt = row[`${prefix}created_at`];
  if (!createdAt) throw new Error(`Missing ${prefix}created_at`);
  const updatedAt = row[`${prefix}updated_at`];
  if (!updatedAt) throw new Error(`Missing ${prefix}updated_at`);

  return {
    id: id as DeveloperSettingsId,
    developerProfileId: developerProfileId as DeveloperProfileId,
    royaltiesPreference: optionalEnum(row[`${prefix}royalties_preference`], Object.values(PreferenceType)),
    servicesPreference: optionalEnum(row[`${prefix}services_preference`], Object.values(PreferenceType)),
    communitySupporterPreference: optionalEnum(
      row[`${prefix}community_supporter_preference`],
      Object.values(PreferenceType)
    ),
    hourlyWeeklyCommitment: row[`${prefix}hourly_weekly_commitment`] ?? undefined,
    hourlyWeeklyCommitmentComment: row[`${prefix}hourly_weekly_commitment_comment`] ?? undefined,
    openToOtherOpportunity: optionalEnum(
      row[`${prefix}open_to_other_opportunity`],
      Object.values(OpenToOtherOpportunityType)
    ),
    openToOtherOpportunityComment: row[`${prefix}open_to_other_opportunity_comment`] ?? undefined,
    hourlyRate: row[`${prefix}hourly_rate`] ?? undefined,
    hourlyRateComment: row[`${prefix}hourly_rate_comment`] ?? undefined,
    currency: parseCurrency(row[`${prefix}currency`]) ?? undefined,
    createdAt: toISODateTimeString(new Date(createdAt)),
    updatedAt: toISODateTimeString(new Date(updatedAt)),
  };
}
