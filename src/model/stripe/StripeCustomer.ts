import { ValidationError, Validator } from "../error";

export class StripeCustomerId {
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  static fromJson(json: any): StripeCustomerId | ValidationError {
    const validator = new Validator(json);
    validator.requiredString("id");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new StripeCustomerId(json.id);
  }

  toString(): string {
    return this.id;
  }
}
