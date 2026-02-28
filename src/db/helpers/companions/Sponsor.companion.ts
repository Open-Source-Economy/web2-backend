import { Sponsor, SponsorId, StripeCustomerId } from "@open-source-economy/api-types";
import { ValidationError, Validator } from "./Validator";
import { OwnerIdCompanion } from "./github";

export namespace SponsorCompanion {
  /**
   * Creates a `Sponsor` instance from a raw backend JSON object, typically retrieved from a SQL query.
   *
   * @param row - The raw backend data object containing sponsor fields.
   * @param table_prefix - Optional prefix used to avoid column name conflicts when SQL joins are performed.
   * @returns A new `Sponsor` instance if validation succeeds, or a `ValidationError` otherwise.
   */
  export function fromBackend(row: any, table_prefix: string = ""): Sponsor | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const stripeCustomerId = validator.requiredString(`${table_prefix}stripe_customer_id`);
    const isPublic = validator.requiredBoolean(`${table_prefix}is_public`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    const ownerId = OwnerIdCompanion.fromBackendForeignKey(row, table_prefix);
    if (ownerId instanceof ValidationError) {
      return ownerId;
    }

    return {
      id: id as SponsorId,
      stripeCustomerId: stripeCustomerId as StripeCustomerId,
      ownerId,
      isPublic,
    } as Sponsor;
  }
}
