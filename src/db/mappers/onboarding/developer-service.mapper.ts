import type {
  DeveloperService,
  DeveloperServiceId,
  DeveloperProfileId,
  ServiceId,
  ResponseTimeType,
} from "@open-source-economy/api-types";
import { toISODateTimeString } from "../../../utils/date.utils";

export function mapDeveloperServiceFromRow(
  row: Record<string, any>,
  prefix = "",
): DeveloperService {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const developerProfileId = row[`${prefix}developer_profile_id`];
  if (!developerProfileId)
    throw new Error(`Missing ${prefix}developer_profile_id`);

  const serviceId = row[`${prefix}service_id`];
  if (!serviceId) throw new Error(`Missing ${prefix}service_id`);

  const createdAt = row[`${prefix}created_at`];
  if (!createdAt) throw new Error(`Missing ${prefix}created_at`);
  const updatedAt = row[`${prefix}updated_at`];
  if (!updatedAt) throw new Error(`Missing ${prefix}updated_at`);

  return {
    id: id as DeveloperServiceId,
    developerProfileId: developerProfileId as DeveloperProfileId,
    developerProjectItemIds: [],
    serviceId: serviceId as ServiceId,
    hourlyRate: row[`${prefix}hourly_rate`] ?? undefined,
    responseTimeHours:
      (row[`${prefix}response_time_type`] as ResponseTimeType) ?? undefined,
    comment: row[`${prefix}comment`] ?? undefined,
    createdAt: toISODateTimeString(new Date(createdAt)),
    updatedAt: toISODateTimeString(new Date(updatedAt)),
  };
}
