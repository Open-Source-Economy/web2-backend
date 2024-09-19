import {
  getStripeCustomerRepository,
  getStripeInvoiceLineRepository,
  getStripeInvoiceRepository,
  getStripeProductRepository,
  getUserRepository,
} from "../../../db";
import { setupTestDB } from "../../jest.setup";
import { Fixture } from "../Fixture";
import {
  StripeCustomer,
  StripeCustomerId,
  StripeInvoiceLineId,
  UserId,
} from "../../../model";

describe("StripeInvoiceLineRepository", () => {
  setupTestDB();

  const userRepo = getUserRepository();
  const productRepo = getStripeProductRepository();
  const invoiceLineRepo = getStripeInvoiceLineRepository();
  const invoiceRepo = getStripeInvoiceRepository();
  const customerRepo = getStripeCustomerRepository();

  describe("create", () => {
    it("should work", async () => {
      const userId = new UserId(1);
      const customerId = "123";
      const productId = "productId";
      const invoiceId = "invoiceId";

      await userRepo.insertLocal(Fixture.createUserDto());
      await customerRepo.insert(
        new StripeCustomer(new StripeCustomerId(customerId), userId),
      );
      await productRepo.insert(Fixture.stripeProduct(productId));
      await invoiceRepo.insert(
        Fixture.stripeInvoice(invoiceId, customerId, []),
      );

      const invoiceLine = Fixture.stripeInvoiceLine(
        "stripedId",
        invoiceId,
        customerId,
        productId,
      );
      const created = await invoiceLineRepo.insert(invoiceLine);
      expect(created).toEqual(invoiceLine);

      const found = await invoiceLineRepo.getById(invoiceLine.stripeId);
      expect(found).toEqual(invoiceLine);
      expect(true).toEqual(true);
    });

    it("should fail with foreign key constraint error if invoice or customer is not inserted", async () => {
      const userId = new UserId(1);
      const customerId = "123";
      const productId = "productId";
      const invoiceId = "invoiceId";

      await userRepo.insertLocal(Fixture.createUserDto());
      await customerRepo.insert(
        new StripeCustomer(new StripeCustomerId(customerId), userId),
      );
      await productRepo.insert(Fixture.stripeProduct(productId));

      const invoiceLine = Fixture.stripeInvoiceLine(
        "stripedId",
        invoiceId,
        customerId,
        productId,
      );

      try {
        await invoiceLineRepo.insert(invoiceLine);
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
      const found = await invoiceLineRepo.getById(nonExistentInvoiceLineId);

      expect(found).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return all invoice lines", async () => {
      const userId = new UserId(1);
      const customerId = "123";
      const productId = "productId";
      const invoiceId = "invoiceId";

      await userRepo.insertLocal(Fixture.createUserDto());
      await customerRepo.insert(
        new StripeCustomer(new StripeCustomerId(customerId), userId),
      );
      await productRepo.insert(Fixture.stripeProduct(productId));
      await invoiceRepo.insert(
        Fixture.stripeInvoice(invoiceId, customerId, []),
      );

      const invoiceLine1 = Fixture.stripeInvoiceLine(
        "stripedId1",
        invoiceId,
        customerId,
        productId,
      );
      const invoiceLine2 = Fixture.stripeInvoiceLine(
        "stripedId2",
        invoiceId,
        customerId,
        productId,
      );

      await invoiceLineRepo.insert(invoiceLine1);
      await invoiceLineRepo.insert(invoiceLine2);

      const allInvoiceLines = await invoiceLineRepo.getAll();

      expect(allInvoiceLines).toHaveLength(2);
      expect(allInvoiceLines).toContainEqual(invoiceLine1);
      expect(allInvoiceLines).toContainEqual(invoiceLine2);
    });

    it("should return an empty array if no invoice lines exist", async () => {
      const allInvoiceLines = await invoiceLineRepo.getAll();
      expect(allInvoiceLines).toEqual([]);
    });
  });
});
