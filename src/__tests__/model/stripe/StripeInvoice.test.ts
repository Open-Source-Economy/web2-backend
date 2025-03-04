import { StripeInvoice } from "../../../api/model";
import * as fs from "fs";
import { ValidationError } from "../../../api/model/error";

describe("StripeInvoice", () => {
  it("fromStripeApi does not throw an error", () => {
    const issueData = fs.readFileSync(
      `src/__tests__/__data__/stripe/webhook/invoice-paid.json`,
      "utf8",
    );
    const invoice = StripeInvoice.fromStripeApi(
      JSON.parse(issueData).data.object,
    );
    if (invoice instanceof ValidationError) {
      throw invoice;
    }

    expect(invoice.id.id).toEqual("in_1Qg18GP1IOinjlLpJ2bfQQEE");
  });
});
