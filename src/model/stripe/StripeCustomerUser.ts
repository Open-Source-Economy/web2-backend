import { ValidationError, Validator } from "../error";
import { UserId } from "../user";
import { CompanyId } from "../Company";
import { StripeCustomerId } from "./StripeCustomer";

export class StripeCustomerUser {
  stripeCustomerId: StripeCustomerId;
  userId: UserId;
  companyId?: CompanyId;

  constructor(
    stripeId: StripeCustomerId,
    userId: UserId,
    companyId?: CompanyId,
  ) {
    this.stripeCustomerId = stripeId;
    this.userId = userId;
    this.companyId = companyId;
  }

  static fromBackend(row: any): StripeCustomerUser | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("stripe_customer_id");
    const userId = validator.requiredString("user_id");
    const companyId = validator.optionalString("company_id");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new StripeCustomerUser(
      new StripeCustomerId(id),
      new UserId(userId),
      companyId ? new CompanyId(companyId) : undefined,
    );
  }
}
