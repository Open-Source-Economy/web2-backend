import {
  StripeCustomerId,
  StripeInvoiceId,
  StripeInvoiceLine,
  StripeInvoiceLineId,
  StripePriceId,
  StripeProductId,
} from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";

export namespace StripeInvoiceLineCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): StripeInvoiceLine | ValidationError {
    const validator = new Validator(row);
    const stripeId = validator.requiredString(`${table_prefix}stripe_id`);
    const invoiceId = validator.requiredString(`${table_prefix}invoice_id`);
    const customerId = validator.requiredString(`${table_prefix}customer_id`);
    const productId = validator.requiredString(`${table_prefix}product_id`);
    const priceId = validator.requiredString(`${table_prefix}price_id`);
    const quantity = validator.requiredNumber(`${table_prefix}quantity`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      stripeId: stripeId as StripeInvoiceLineId,
      invoiceId: invoiceId as StripeInvoiceId,
      customerId: customerId as StripeCustomerId,
      productId: productId as StripeProductId,
      priceId: priceId as StripePriceId,
      quantity,
    } as StripeInvoiceLine;
  }
}
