import { ValidationError, Validator } from "../error";
import { DeveloperProfileId } from "./DeveloperProfile";

export class DeveloperAvailabilityId {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export type LargerOpportunities = 'yes' | 'maybe' | 'no';

export class DeveloperAvailability {
  id: DeveloperAvailabilityId;
  developerProfileId: DeveloperProfileId;
  weeklyCommitment: number;
  largerOpportunities: LargerOpportunities;
  hourlyRate: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: DeveloperAvailabilityId,
    developerProfileId: DeveloperProfileId,
    weeklyCommitment: number,
    largerOpportunities: LargerOpportunities,
    hourlyRate: number,
    currency: string,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.developerProfileId = developerProfileId;
    this.weeklyCommitment = weeklyCommitment;
    this.largerOpportunities = largerOpportunities;
    this.hourlyRate = hourlyRate;
    this.currency = currency;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromBackend(row: any): DeveloperAvailability | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const developerProfileId = validator.requiredString("developer_profile_id");
    const weeklyCommitment = validator.requiredNumber("weekly_commitment");
    const largerOpportunities = validator.requiredString("larger_opportunities") as LargerOpportunities;
    const hourlyRate = validator.requiredNumber("hourly_rate");
    const currency = validator.requiredString("currency");
    const createdAt = validator.requiredDate("created_at");
    const updatedAt = validator.requiredDate("updated_at");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new DeveloperAvailability(
      new DeveloperAvailabilityId(id),
      new DeveloperProfileId(developerProfileId),
      weeklyCommitment,
      largerOpportunities,
      hourlyRate,
      currency,
      createdAt,
      updatedAt,
    );
  }
}