import type { DeveloperProfile, DeveloperProfileId, UserId } from "@open-source-economy/api-types";
import { toISODateTimeString } from "../../../utils/date.utils";

export function mapDeveloperProfileFromRow(row: Record<string, any>, prefix = ""): DeveloperProfile {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const userId = row[`${prefix}user_id`];
  if (!userId) throw new Error(`Missing ${prefix}user_id`);

  const contactEmail = row[`${prefix}contact_email`];
  if (!contactEmail) throw new Error(`Missing ${prefix}contact_email`);

  const createdAt = row[`${prefix}created_at`];
  if (!createdAt) throw new Error(`Missing ${prefix}created_at`);
  const updatedAt = row[`${prefix}updated_at`];
  if (!updatedAt) throw new Error(`Missing ${prefix}updated_at`);

  return {
    id: id as DeveloperProfileId,
    userId: userId as UserId,
    contactEmail,
    onboardingCompleted: row[`${prefix}onboarding_completed`],
    createdAt: toISODateTimeString(new Date(createdAt)),
    updatedAt: toISODateTimeString(new Date(updatedAt)),
  };
}
