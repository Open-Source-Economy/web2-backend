import { Currency, StripeCustomerId, StripeInvoice, StripeInvoiceId } from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";

export namespace StripeInvoiceCompanion {
  export function fromBackend(row: any, table_prefix: string = ""): StripeInvoice | ValidationError {
    const validator = new Validator(row);
    const stripeId = validator.requiredString(`${table_prefix}stripe_id`);
    const customerId = validator.requiredString(`${table_prefix}customer_id`);
    const paid = validator.requiredBoolean(`${table_prefix}paid`);
    const accountCountry = validator.requiredString(`${table_prefix}account_country`);
    const currency = validator.requiredEnum(`${table_prefix}currency`, Object.values(Currency) as Currency[]);
    const total = validator.requiredNumber(`${table_prefix}total`);
    const totalExclTax = validator.requiredNumber(`${table_prefix}total_excl_tax`);
    const subtotal = validator.requiredNumber(`${table_prefix}subtotal`);
    const subtotalExclTax = validator.requiredNumber(`${table_prefix}subtotal_excl_tax`);
    const hostedInvoiceUrl = validator.requiredString(`${table_prefix}hosted_invoice_url`);
    const invoicePdf = validator.requiredString(`${table_prefix}invoice_pdf`);
    const number = validator.optionalString(`${table_prefix}number`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      stripeId: stripeId as StripeInvoiceId,
      customerId: customerId as StripeCustomerId,
      paid,
      accountCountry,
      currency,
      total,
      totalExclTax,
      subtotal,
      subtotalExclTax,
      hostedInvoiceUrl,
      invoicePdf,
      number: number ?? null,
    } as StripeInvoice;
  }
}
