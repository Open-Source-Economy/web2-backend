import { Currency, StripeCustomer, StripeCustomerId } from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";

export namespace StripeCustomerCompanion {
  export function fromBackend(row: any, table_prefix: string = ""): StripeCustomer | ValidationError {
    const validator = new Validator(row);
    const stripeId = validator.requiredString(`${table_prefix}stripe_id`);
    const currency = validator.optionalEnum(`${table_prefix}currency`, Object.values(Currency) as Currency[]);
    const email = validator.optionalString(`${table_prefix}email`);
    const name = validator.optionalString(`${table_prefix}name`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      stripeId: stripeId as StripeCustomerId,
      currency,
      email,
      name,
    } as StripeCustomer;
  }
}
