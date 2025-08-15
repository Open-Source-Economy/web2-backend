import { ValidationError, Validator } from "../error";

export class ServiceCategoryId {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export class ServiceCategory {
  id: ServiceCategoryId;
  name: string;
  parentCategory: string | null;
  hasResponseTime: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: ServiceCategoryId,
    name: string,
    parentCategory: string | null,
    hasResponseTime: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.name = name;
    this.parentCategory = parentCategory;
    this.hasResponseTime = hasResponseTime;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromBackend(row: any): ServiceCategory | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const name = validator.requiredString("name");
    const parentCategory = validator.optionalString("parent_category");
    const hasResponseTime = validator.requiredBoolean("has_response_time");
    const createdAt = validator.requiredDate("created_at");
    const updatedAt = validator.requiredDate("updated_at");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new ServiceCategory(
      new ServiceCategoryId(id),
      name,
      parentCategory ?? null,
      hasResponseTime,
      createdAt,
      updatedAt,
    );
  }
}
