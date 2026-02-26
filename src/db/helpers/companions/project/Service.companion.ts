import {
  ISODateTimeString,
  Service,
  ServiceId,
  ServiceType,
} from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";

export namespace ServiceCompanion {
  export function fromBackend(row: any): Service | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const serviceType = validator.requiredEnum(
      "service_type",
      Object.values(ServiceType) as ServiceType[],
    );
    const name = validator.requiredString("name");
    const description = validator.optionalString("description");
    const isCustom = validator.requiredBoolean("is_custom");
    const hasResponseTime = validator.requiredBoolean("has_response_time");
    const createdAt = validator.requiredDate("created_at");
    const updatedAt = validator.requiredDate("updated_at");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      id: id as ServiceId,
      serviceType,
      name,
      description: description || undefined,
      isCustom,
      hasResponseTime,
      createdAt: createdAt as ISODateTimeString,
      updatedAt: updatedAt as ISODateTimeString,
    } as Service;
  }
}
