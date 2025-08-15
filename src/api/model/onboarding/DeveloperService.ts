import { ValidationError, Validator } from "../error";
import { DeveloperProfileId } from "./DeveloperProfile";
import { CurrencyType } from "./DeveloperSettings";

export class DeveloperServiceId {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export class ServiceId {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export class ProjectItemId {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export class DeveloperService {
  id: DeveloperServiceId;
  developerProfileId: DeveloperProfileId;
  projectItemId: ProjectItemId;
  serviceId: ServiceId;
  hourlyRate: number;
  currency: CurrencyType;
  responseTimeHours: number | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: DeveloperServiceId,
    developerProfileId: DeveloperProfileId,
    projectItemId: ProjectItemId,
    serviceId: ServiceId,
    hourlyRate: number,
    currency: CurrencyType,
    responseTimeHours: number | null,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.developerProfileId = developerProfileId;
    this.projectItemId = projectItemId;
    this.serviceId = serviceId;
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
    const projectItemId = validator.requiredString("project_item_id");
    const serviceId = validator.requiredString("service_id");
    const hourlyRate = validator.requiredNumber("hourly_rate");
    const currency = validator.requiredString("currency") as CurrencyType;
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
      new ProjectItemId(projectItemId),
      new ServiceId(serviceId),
      hourlyRate,
      currency,
      responseTimeHours ?? null,
      createdAt,
      updatedAt,
    );
  }
}