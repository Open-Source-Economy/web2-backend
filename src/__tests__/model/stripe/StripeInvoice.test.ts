import {
  StripeCustomerId,
  StripeInvoice,
  StripeInvoiceId,
} from "@open-source-economy/api-types";
import * as fs from "fs";
import { requireCurrency } from "../../../utils/enum-utils";

// Local parsing helper (replaces the old static StripeInvoice.fromStripeApi method)
function parseStripeInvoiceFromStripeApi(json: any): StripeInvoice | Error {
  if (!json || !json.id) {
    return new Error("Invalid Stripe invoice data: missing id field");
  }
  return {
    stripeId: json.id as StripeInvoiceId,
    customerId: (typeof json.customer === "string"
      ? json.customer
      : json.customer?.id) as StripeCustomerId,
    paid: json.paid ?? false,
    accountCountry: json.account_country ?? "",
    currency: requireCurrency(json.currency, "test stripe invoice"),
    total: json.total ?? 0,
    totalExclTax: json.total_excluding_tax ?? 0,
    subtotal: json.subtotal ?? 0,
    subtotalExclTax: json.subtotal_excluding_tax ?? 0,
    hostedInvoiceUrl: json.hosted_invoice_url ?? "",
    invoicePdf: json.invoice_pdf ?? "",
    number: json.number ?? null,
  } as StripeInvoice;
}

describe("StripeInvoice", () => {
  it("fromStripeApi does not throw an error", () => {
    const issueData = fs.readFileSync(
      `src/__tests__/__data__/stripe/webhook/invoice-paid.json`,
      "utf8",
    );
    const invoice = parseStripeInvoiceFromStripeApi(
      JSON.parse(issueData).data.object,
    );
    if (invoice instanceof Error) {
      throw invoice;
    }

    expect(invoice.stripeId).toEqual("in_1Qg18GP1IOinjlLpJ2bfQQEE");
  });
});
