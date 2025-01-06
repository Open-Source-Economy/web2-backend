import { ValidationError, Validator } from "../error";

export class StripeProductId {
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  static fromJson(json: any): StripeProductId | ValidationError {
    const validator = new Validator(json);
    validator.requiredString("id");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new StripeProductId(json.id);
  }

  toString(): string {
    return this.id;
  }
}

export enum ProductType {
  milliDow = "milli_dow",
  donation = "donation",
}

export class StripeProduct {
  stripeId: StripeProductId;
  type: ProductType;

  constructor(stripeId: StripeProductId, type: ProductType) {
    this.stripeId = stripeId;
    this.type = type;
  }

  // Method to create a StripeProduct from a JSON response from the Stripe API
  static fromStripeApi(json: any): StripeProduct | ValidationError {
    // TODO: Implement this method
    // const validator = new Validator(json);
    // validator.requiredString("id");
    // validator.requiredString("unit");
    // validator.requiredNumber("unit_amount");
    // validator.requiredBoolean("recurring");
    //
    // const error = validator.getFirstError();
    // if (error) {
    //   return error;
    // }
    //
    // return new StripeProduct(
    //   new StripeProductId(json.id),
    //   json.unit,
    //   json.unit_amount,
    //   json.recurring,
    // );
    return new StripeProduct(
      new StripeProductId(json.id),
      ProductType.milliDow,
    );
  }

  // Method to create a StripeProduct from a database row
  static fromBackend(row: any): StripeProduct | ValidationError {
    const validator = new Validator(row);
    const stripeId = validator.requiredString("stripe_id");
    const type = validator.requiredEnum(
      "type",
      Object.values(ProductType) as ProductType[],
    );

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new StripeProduct(new StripeProductId(stripeId), type);
  }
}
