import { ValidationError, Validator } from "./Validator";

/**
 * Local definition of NewsletterSubscription since it was removed from api-types.
 */
export interface NewsletterSubscription {
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export namespace NewsletterSubscriptionCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): NewsletterSubscription | ValidationError {
    const validator = new Validator(row);
    const email = validator.requiredString(`${table_prefix}email`);
    const createdAt = validator.optionalString(`${table_prefix}created_at`);
    const updatedAt = validator.optionalString(`${table_prefix}updated_at`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return { email, createdAt, updatedAt };
  }
}
