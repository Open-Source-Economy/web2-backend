import {
  Currency,
  PriceType,
  StripePrice,
  StripePriceId,
  StripeProductId,
} from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";

export namespace StripePriceCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): StripePrice | ValidationError {
    const validator = new Validator(row);
    const stripeId = validator.requiredString(`${table_prefix}stripe_id`);
    const productId = validator.requiredString(`${table_prefix}product_id`);
    const unitAmount = validator.requiredNumber(`${table_prefix}unit_amount`);
    const currency = validator.requiredEnum(
      `${table_prefix}currency`,
      Object.values(Currency) as Currency[],
    );
    const active = validator.requiredBoolean(`${table_prefix}active`);
    const type = validator.requiredEnum(
      `${table_prefix}type`,
      Object.values(PriceType) as PriceType[],
    );

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      stripeId: stripeId as StripePriceId,
      productId: productId as StripeProductId,
      unitAmount,
      currency,
      active,
      type,
    } as StripePrice;
  }
}
