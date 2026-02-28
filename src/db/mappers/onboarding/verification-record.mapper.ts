import type {
  VerificationRecord,
  VerificationRecordId,
  UserId,
  VerificationEntityType,
  VerificationStatus,
} from "@open-source-economy/api-types";
import { toISODateTimeString } from "../../../utils/date.utils";

export function mapVerificationRecordFromRow(row: Record<string, any>, prefix = ""): VerificationRecord {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const createdAt = row[`${prefix}created_at`];
  if (!createdAt) throw new Error(`Missing ${prefix}created_at`);

  const developerRespondedAt = row[`${prefix}developer_responded_at`];

  return {
    id: id as VerificationRecordId,
    entityType: row[`${prefix}entity_type`] as VerificationEntityType,
    entityId: row[`${prefix}entity_id`],
    status: row[`${prefix}status`] as VerificationStatus,
    notes: row[`${prefix}notes`] ?? undefined,
    verifiedBy: row[`${prefix}verified_by`] ? (row[`${prefix}verified_by`] as UserId) : undefined,
    createdAt: toISODateTimeString(new Date(createdAt)),
    developerResponse: row[`${prefix}developer_response`] ?? undefined,
    developerRespondedAt: developerRespondedAt ? toISODateTimeString(new Date(developerRespondedAt)) : undefined,
  };
}
