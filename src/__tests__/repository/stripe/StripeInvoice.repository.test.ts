import { setupTestDB } from "../../jest.setup";
import {
  CompanyId,
  StripeCustomer,
  StripeCustomerId,
  StripeInvoiceId,
  StripeInvoiceLine,
  StripeInvoiceLineId,
  StripeProductId,
  UserId,
} from "../../../model";
import { Fixture } from "../Fixture";
import {
  getCompanyRepository,
  getStripeCustomerRepository,
  getStripeInvoiceLineRepository,
  getStripeInvoiceRepository,
  getStripeProductRepository,
  getUserRepository,
} from "../../../db";
import { CreateCompanyDto } from "../../../dtos";

describe("StripeInvoiceRepository", () => {
  setupTestDB();

  const userRepo = getUserRepository();
  const companyRepo = getCompanyRepository();
  const customerRepo = getStripeCustomerRepository();
  const productRepo = getStripeProductRepository();
  const invoiceRepo = getStripeInvoiceRepository();
  const invoiceLineRepo = getStripeInvoiceLineRepository();

  describe("create", () => {
    it("should insert an invoice with lines", async () => {
      const userId = new UserId(1);
      const companyId = new CompanyId(1);

      const customerId = "customerId";
      const invoiceId = "invoiceId";
      const productId = "productId";

      const stripeId1 = "stripeId1";
      const stripeId2 = "stripeId2";

      // Insert user, company and customer before inserting the customer
      await userRepo.insertLocal(Fixture.createUserDto());
      await companyRepo.insert({} as CreateCompanyDto);
      const customer = new StripeCustomer(
        new StripeCustomerId(customerId),
        userId,
        companyId,
      );
      await customerRepo.insert(customer);
      await productRepo.insert(Fixture.stripeProduct(productId));

      const lines = [
        Fixture.stripeInvoiceLine(stripeId1, invoiceId, customerId, productId),
        Fixture.stripeInvoiceLine(stripeId2, invoiceId, customerId, productId),
      ];

      const invoice = Fixture.stripeInvoice(invoiceId, customerId, lines);
      const created = await invoiceRepo.insert(invoice);
      expect(created).toEqual(invoice);

      const found = await invoiceRepo.getById(new StripeInvoiceId(invoiceId));
      expect(found).toEqual(invoice);
    });

    it("should rollback transaction if inserting lines fails", async () => {
      const userId = new UserId(1);
      const companyId = new CompanyId(1);

      const customerId = "customerId";
      const invoiceId = "invoiceId";
      const productId = "productId";

      const stripeId1 = "stripeId1";
      const stripeId2 = "stripeId2";

      // Insert user, company and customer before inserting the customer
      await userRepo.insertLocal(Fixture.createUserDto());
      await companyRepo.insert({} as CreateCompanyDto);
      const customer = new StripeCustomer(
        new StripeCustomerId(customerId),
        userId,
        companyId,
      );
      await customerRepo.insert(customer);
      await productRepo.insert(Fixture.stripeProduct(productId));

      const lines = [
        Fixture.stripeInvoiceLine(stripeId1, invoiceId, customerId, productId),
        // @ts-ignore
        new StripeInvoiceLine(
          new StripeInvoiceLineId(stripeId2),
          new StripeInvoiceId(invoiceId),
          new StripeCustomerId(customerId),
          new StripeProductId(productId),
          "priceId",
          -1, // This should cause an error
        ),
      ];

      const invoice = Fixture.stripeInvoice(invoiceId, customerId, lines);
      await expect(invoiceRepo.insert(invoice)).rejects.toThrow(Error);

      const found = await invoiceRepo.getById(new StripeInvoiceId(invoiceId));
      expect(found).toBeNull();
    });
  });
});
