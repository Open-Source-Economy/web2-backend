import {
  stripeCustomerRepo,
  stripeInvoiceLineRepo,
  stripeInvoiceRepo,
  stripePriceRepo,
  stripeProductRepo,
} from "../../../db";
import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import { StripeInvoiceLineId } from "../../../model";

describe("StripeInvoiceLineRepository", () => {
  setupTestDB();

  const validCustomerId = Fixture.stripeCustomerId();
  const validProductId = Fixture.stripeProductId();
  const validPriceId = Fixture.stripePriceId();
  const validInvoiceId = Fixture.stripeInvoiceId();

  beforeEach(async () => {
    const stripeCustomer = Fixture.stripeCustomer(validCustomerId);
    await stripeCustomerRepo.insert(stripeCustomer);
    await stripeInvoiceRepo.insert(
      Fixture.stripeInvoice(validInvoiceId, validCustomerId, []),
    );

    const product = Fixture.stripeProduct(validProductId, null);
    await stripeProductRepo.insert(product);
    const price = Fixture.stripePrice(validPriceId, validProductId);
    await stripePriceRepo.insert(price);
  });

  describe("create", () => {
    it("should work", async () => {
      const invoiceLineId = Fixture.stripeInvoiceLineId();
      const invoiceLine = Fixture.stripeInvoiceLine(
        invoiceLineId,
        validInvoiceId,
        validCustomerId,
        validProductId,
        validPriceId,
      );
      const created = await stripeInvoiceLineRepo.insert(invoiceLine);
      expect(created).toEqual(invoiceLine);

      const found = await stripeInvoiceLineRepo.getById(invoiceLine.stripeId);
      expect(found).toEqual(invoiceLine);
      expect(true).toEqual(true);
    });

    it("should fail with foreign key constraint error if invoice or customer is not inserted", async () => {
      const customerId = Fixture.stripeCustomerId();
      const invoiceId = Fixture.stripeInvoiceId();
      const productId = Fixture.stripeProductId();

      await stripeProductRepo.insert(Fixture.stripeProduct(productId, null));

      const invoiceLineId = Fixture.stripeInvoiceLineId();
      const invoiceLine = Fixture.stripeInvoiceLine(
        invoiceLineId,
        invoiceId,
        customerId,
        productId,
        validPriceId,
      );

      try {
        await stripeInvoiceLineRepo.insert(invoiceLine);
        // If the insertion doesn't throw, fail the test
        fail(
          "Expected foreign key constraint violation, but no error was thrown.",
        );
      } catch (error: any) {
        // Check if the error is related to foreign key constraint
        expect(error.message).toMatch(/violates foreign key constraint/);
      }
    });
  });

  describe("getById", () => {
    it("should return null if invoice line not found", async () => {
      const nonExistentInvoiceLineId = new StripeInvoiceLineId(
        "non-existent-id",
      );
      const found = await stripeInvoiceLineRepo.getById(
        nonExistentInvoiceLineId,
      );

      expect(found).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return all invoice lines", async () => {
      const invoiceLineId1 = Fixture.stripeInvoiceLineId();
      const invoiceLineId2 = Fixture.stripeInvoiceLineId();
      const invoiceLine1 = Fixture.stripeInvoiceLine(
        invoiceLineId1,
        validInvoiceId,
        validCustomerId,
        validProductId,
        validPriceId,
      );
      const invoiceLine2 = Fixture.stripeInvoiceLine(
        invoiceLineId2,
        validInvoiceId,
        validCustomerId,
        validProductId,
        validPriceId,
      );

      await stripeInvoiceLineRepo.insert(invoiceLine1);
      await stripeInvoiceLineRepo.insert(invoiceLine2);

      const allInvoiceLines = await stripeInvoiceLineRepo.getAll();

      expect(allInvoiceLines).toHaveLength(2);
      expect(allInvoiceLines).toContainEqual(invoiceLine1);
      expect(allInvoiceLines).toContainEqual(invoiceLine2);
    });

    it("should return an empty array if no invoice lines exist", async () => {
      const allInvoiceLines = await stripeInvoiceLineRepo.getAll();
      expect(allInvoiceLines).toEqual([]);
    });
  });
});
