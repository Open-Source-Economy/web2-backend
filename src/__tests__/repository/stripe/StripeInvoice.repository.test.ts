import { setupTestDB } from "../../__helpers__/jest.setup";
import {
  StripeCustomerUser,
  StripeInvoiceLine,
  StripePriceId,
  UserId,
} from "../../../model";
import { Fixture } from "../../__helpers__/Fixture";
import {
  companyRepo,
  stripeCustomerUserRepo,
  stripeInvoiceRepo,
  stripePriceRepo,
  stripeProductRepo,
  userRepo,
} from "../../../db";

describe("StripeInvoiceRepository", () => {
  setupTestDB();

  let validUserId: UserId;

  beforeEach(async () => {
    const validUser = await userRepo.insert(
      Fixture.createUser(Fixture.localUser()),
    );
    validUserId = validUser.id;
  });

  describe("create", () => {
    it("should insert an invoice with lines", async () => {
      const customerId = Fixture.stripeCustomerUserId();
      const invoiceId = Fixture.stripeInvoiceId();
      const productId = Fixture.stripeProductId();
      const priceId = Fixture.stripePriceId();

      const stripeId1 = Fixture.stripeInvoiceLineId();
      const stripeId2 = Fixture.stripeInvoiceLineId();

      // Insert user, company and customer before inserting the customer
      await userRepo.insert(Fixture.createUser(Fixture.localUser()));
      await companyRepo.create(Fixture.createCompanyBody());
      const customer = new StripeCustomerUser(customerId, validUserId);
      await stripeCustomerUserRepo.insert(customer);
      await stripeProductRepo.insert(Fixture.stripeProduct(productId, null));
      await stripePriceRepo.insert(Fixture.stripePrice(priceId, productId));

      const lines = [
        Fixture.stripeInvoiceLine(
          stripeId1,
          invoiceId,
          customerId,
          productId,
          priceId,
        ),
        Fixture.stripeInvoiceLine(
          stripeId2,
          invoiceId,
          customerId,
          productId,
          priceId,
        ),
      ];

      const invoice = Fixture.stripeInvoice(invoiceId, customerId, lines);
      const created = await stripeInvoiceRepo.insert(invoice);
      expect(created).toEqual(invoice);

      const found = await stripeInvoiceRepo.getById(invoiceId);
      expect(found).toEqual(invoice);
    });

    it("should rollback transaction if inserting lines fails", async () => {
      const customerId = Fixture.stripeCustomerUserId();
      const invoiceId = Fixture.stripeInvoiceId();
      const productId = Fixture.stripeProductId();
      const priceId = Fixture.stripePriceId();

      const stripeId1 = Fixture.stripeInvoiceLineId();
      const stripeId2 = Fixture.stripeInvoiceLineId();

      // Insert user, company and customer before inserting the customer
      await userRepo.insert(Fixture.createUser(Fixture.localUser()));
      await companyRepo.create(Fixture.createCompanyBody());
      const customer = new StripeCustomerUser(customerId, validUserId);
      await stripeCustomerUserRepo.insert(customer);
      await stripeProductRepo.insert(Fixture.stripeProduct(productId, null));
      await stripePriceRepo.insert(Fixture.stripePrice(priceId, productId));

      const lines = [
        Fixture.stripeInvoiceLine(
          stripeId1,
          invoiceId,
          customerId,
          productId,
          priceId,
        ),
        // @ts-ignore
        new StripeInvoiceLine(
          stripeId2,
          invoiceId,
          customerId,
          productId,
          new StripePriceId("priceId"),
          -1, // This should cause an error
        ),
      ];

      const invoice = Fixture.stripeInvoice(invoiceId, customerId, lines);
      await expect(stripeInvoiceRepo.insert(invoice)).rejects.toThrow(Error);

      const found = await stripeInvoiceRepo.getById(invoiceId);
      expect(found).toBeNull();
    });
  });
});
