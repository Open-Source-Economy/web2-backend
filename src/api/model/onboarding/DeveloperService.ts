import { ValidationError, Validator } from "../error";
import { DeveloperProfileId } from "./DeveloperProfile";
import { ServiceCategoryId } from "./ServiceCategory";

export class DeveloperServiceId {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export class DeveloperService {
  id: DeveloperServiceId;
  developerProfileId: DeveloperProfileId;
  serviceCategoryId: ServiceCategoryId;
  serviceName: string | null;
  hourlyRate: number;
  currency: string;
  responseTimeHours: number | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: DeveloperServiceId,
    developerProfileId: DeveloperProfileId,
    serviceCategoryId: ServiceCategoryId,
    serviceName: string | null,
    hourlyRate: number,
    currency: string,
    responseTimeHours: number | null,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.developerProfileId = developerProfileId;
    this.serviceCategoryId = serviceCategoryId;
    this.serviceName = serviceName;
    this.hourlyRate = hourlyRate;
    this.currency = currency;
    this.responseTimeHours = responseTimeHours;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromBackend(row: any): DeveloperService | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const developerProfileId = validator.requiredString("developer_profile_id");
    const serviceCategoryId = validator.requiredString("service_category_id");
    const serviceName = validator.optionalString("service_name");
    const hourlyRate = validator.requiredNumber("hourly_rate");
    const currency = validator.requiredString("currency");
    const responseTimeHours = validator.optionalNumber("response_time_hours");
    const createdAt = validator.requiredDate("created_at");
    const updatedAt = validator.requiredDate("updated_at");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new DeveloperService(
      new DeveloperServiceId(id),
      new DeveloperProfileId(developerProfileId),
      new ServiceCategoryId(serviceCategoryId),
      serviceName ?? null,
      hourlyRate,
      currency,
      responseTimeHours ?? null,
      createdAt,
      updatedAt,
    );
  }
}
