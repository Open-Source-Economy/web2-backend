import {
  stripeCustomerRepo,
  stripeInvoiceRepo,
  stripeMiscellaneousRepository,
  stripePriceRepo,
  stripeProductRepo,
} from "../../../db";
import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import { Currency } from "../../../model";
import { ownerRepo, repoRepo } from "../github";

describe("StripeMiscellaneousRepository", () => {
  setupTestDB();

  const validOwnerId = Fixture.ownerId();
  const validRepositoryId = Fixture.repositoryId(validOwnerId);

  const validCustomerId = Fixture.stripeCustomerId();
  const validProductId = Fixture.stripeProductId();
  const validPriceId = Fixture.stripePriceId();
  const validInvoiceId = Fixture.stripeInvoiceId();

  beforeEach(async () => {
    await ownerRepo.insertOrUpdate(Fixture.owner(validOwnerId));
    await repoRepo.insertOrUpdate(Fixture.repository(validRepositoryId));

    const stripeCustomer = Fixture.stripeCustomer(validCustomerId);
    await stripeCustomerRepo.insert(stripeCustomer);
    const product = Fixture.stripeProduct(validProductId, validRepositoryId);
    await stripeProductRepo.insert(product);
    const price = Fixture.stripePrice(validPriceId, validProductId);
    await stripePriceRepo.insert(price);
  });

  describe("getRaisedAmountPerCurrency", () => {
    it("should work", async () => {
      const invoiceLineId = Fixture.stripeInvoiceLineId();
      const invoiceLine = Fixture.stripeInvoiceLine(
        invoiceLineId,
        validInvoiceId,
        validCustomerId,
        validProductId,
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
          validRepositoryId,
        );

      expect(raisedAmount[Currency.USD]).toEqual(1000);
    });
  });
});
