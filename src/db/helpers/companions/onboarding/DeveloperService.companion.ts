import {
  DeveloperService,
  DeveloperServiceId,
  DeveloperProfileId,
  ServiceId,
  ResponseTimeType,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";

export namespace DeveloperServiceCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): DeveloperService | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const developerProfileId = validator.requiredString(
      `${table_prefix}developer_profile_id`,
    );
    const serviceId = validator.requiredString(`${table_prefix}service_id`);
    const hourlyRate = validator.optionalNumber(`${table_prefix}hourly_rate`);
    const responseTimeHours = validator.optionalEnum(
      `${table_prefix}response_time_type`,
      Object.values(ResponseTimeType) as ResponseTimeType[],
    );
    const comment = validator.optionalString(`${table_prefix}comment`);
    const createdAt = validator.requiredDate(`${table_prefix}created_at`);
    const updatedAt = validator.requiredDate(`${table_prefix}updated_at`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    // The repository is responsible for fetching and populating the projectItemIds.
    // We initialize it as an empty array here as it's not present in the main
    // `developer_service_offering` table row.
    return {
      id: new DeveloperServiceId(id),
      developerProfileId: new DeveloperProfileId(developerProfileId),
      developerProjectItemIds: [],
      serviceId: new ServiceId(serviceId),
      hourlyRate,
      responseTimeHours: responseTimeHours,
      comment,
      createdAt,
      updatedAt,
    };
  }
}
