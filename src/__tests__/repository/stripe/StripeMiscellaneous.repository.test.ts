import {
  ownerRepo,
  repositoryRepo,
  stripeCustomerRepo,
  stripeInvoiceRepo,
  stripeMiscellaneousRepository,
  stripePriceRepo,
  stripeProductRepo,
} from "../../../db";
import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import { Currency } from "@open-source-economy/api-types";

describe("StripeMiscellaneousRepository", () => {
  setupTestDB();

  const validOwnerId = Fixture.ownerId();
  const validRepositoryId = Fixture.repositoryId(validOwnerId);

  const validCustomerId = Fixture.stripeCustomerId();
  const validPriceId = Fixture.stripePriceId();
  const validInvoiceId = Fixture.stripeInvoiceId();

  beforeEach(async () => {
    await ownerRepo.insertOrUpdate(Fixture.owner(validOwnerId));
    await repositoryRepo.insertOrUpdate(Fixture.repository(validRepositoryId));

    const stripeCustomer = Fixture.stripeCustomer(validCustomerId);
    await stripeCustomerRepo.insert(stripeCustomer);
  });

  describe("getRaisedAmountPerCurrency", () => {
    it("for the repository", async () => {
      const projectId = validRepositoryId;
      const productId = Fixture.stripeProductId();
      const product = Fixture.stripeProduct(productId, projectId);
      await stripeProductRepo.insert(product);
      const price = Fixture.stripePrice(validPriceId, productId);
      await stripePriceRepo.createOrUpdate(price);

      const invoiceLineId = Fixture.stripeInvoiceLineId();
      const invoiceLine = Fixture.stripeInvoiceLine(
        invoiceLineId,
        validInvoiceId,
        validCustomerId,
        productId,
        validPriceId,
      );
      await stripeInvoiceRepo.insert(
        Fixture.stripeInvoice(
          validInvoiceId,
          validCustomerId,
          [invoiceLine],
          Currency.USD,
          1000,
        ),
      );

      const raisedAmount =
        await stripeMiscellaneousRepository.getRaisedAmountPerCurrency(
          projectId,
        );

      expect(raisedAmount[Currency.USD]).toEqual(1000);
    });

    it("for the owner", async () => {
      const projectId = validOwnerId;
      const productId = Fixture.stripeProductId();
      const product = Fixture.stripeProduct(productId, projectId);
      await stripeProductRepo.insert(product);
      const price = Fixture.stripePrice(validPriceId, productId);
      await stripePriceRepo.createOrUpdate(price);

      const invoiceLineId = Fixture.stripeInvoiceLineId();
      const invoiceLine = Fixture.stripeInvoiceLine(
        invoiceLineId,
        validInvoiceId,
        validCustomerId,
        productId,
        validPriceId,
      );
      await stripeInvoiceRepo.insert(
        Fixture.stripeInvoice(
          validInvoiceId,
          validCustomerId,
          [invoiceLine],
          Currency.USD,
          1000,
        ),
      );

      const raisedAmount =
        await stripeMiscellaneousRepository.getRaisedAmountPerCurrency(
          projectId,
        );

      expect(raisedAmount[Currency.USD]).toEqual(1000);
    });
  });
});
