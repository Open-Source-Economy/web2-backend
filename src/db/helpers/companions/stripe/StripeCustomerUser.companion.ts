import { StripeCustomerId, UserId } from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";

/**
 * Local definition of StripeCustomerUser (join between stripe customer and user).
 * This type was renamed/removed from api-types but the backend still needs it.
 */
export interface StripeCustomerUser {
  stripeCustomerId: StripeCustomerId;
  userId: UserId;
}

export namespace StripeCustomerUserCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): StripeCustomerUser | ValidationError {
    const validator = new Validator(row);
    const stripeCustomerId = validator.requiredString(
      `${table_prefix}stripe_customer_id`,
    );
    const userId = validator.requiredString(`${table_prefix}user_id`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      stripeCustomerId: stripeCustomerId as StripeCustomerId,
      userId: userId as UserId,
    } as StripeCustomerUser;
  }
}
