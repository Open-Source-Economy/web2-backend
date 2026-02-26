import type {
  Service,
  ServiceId,
  ServiceType,
} from "@open-source-economy/api-types";
import { toISODateTimeString } from "../../../utils/date.utils";

export function mapServiceFromRow(row: Record<string, any>): Service {
  const id = row.id;
  if (!id) throw new Error("Missing service id");

  const createdAt = row.created_at;
  if (!createdAt) throw new Error("Missing created_at");
  const updatedAt = row.updated_at;
  if (!updatedAt) throw new Error("Missing updated_at");

  return {
    id: id as ServiceId,
    serviceType: row.service_type as ServiceType,
    name: row.name,
    description: row.description ?? undefined,
    isCustom: row.is_custom,
    hasResponseTime: row.has_response_time,
    createdAt: toISODateTimeString(new Date(createdAt)),
    updatedAt: toISODateTimeString(new Date(updatedAt)),
  };
}
