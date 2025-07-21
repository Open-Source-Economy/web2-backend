import { ValidationError, Validator } from "../error";
import { DeveloperProfileId } from "./DeveloperProfile";

export class DeveloperIncomePreferenceId {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export type IncomeType = 'royalties' | 'services' | 'donations';

export class DeveloperIncomePreference {
  id: DeveloperIncomePreferenceId;
  developerProfileId: DeveloperProfileId;
  incomeType: IncomeType;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: DeveloperIncomePreferenceId,
    developerProfileId: DeveloperProfileId,
    incomeType: IncomeType,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.developerProfileId = developerProfileId;
    this.incomeType = incomeType;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromBackend(row: any): DeveloperIncomePreference | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const developerProfileId = validator.requiredString("developer_profile_id");
    const incomeType = validator.requiredString("income_type") as IncomeType;
    const createdAt = validator.requiredDate("created_at");
    const updatedAt = validator.requiredDate("updated_at");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new DeveloperIncomePreference(
      new DeveloperIncomePreferenceId(id),
      new DeveloperProfileId(developerProfileId),
      incomeType,
      createdAt,
      updatedAt,
    );
  }
}