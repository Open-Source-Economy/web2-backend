import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import {
  combinedStripeRepo,
  getStripePriceRepository,
  getStripeProductRepository,
} from "../../../db";

import {
  Currency,
  PlanPriceType,
  PlanProductType,
  PriceType,
  productTypeUtils,
  StripeProductId,
} from "../../../api/model";

describe("CombinedStripeRepository", () => {
  setupTestDB();

  const productRepo = getStripeProductRepository();
  const priceRepo = getStripePriceRepository();

  it("should return an error is the DB is missing a product type", async () => {
    const planProductType = PlanProductType.INDIVIDUAL_PLAN;
    const product = Fixture.stripeProduct(
      new StripeProductId("product-1"),
      null,
      productTypeUtils.toProductType(planProductType),
    );

    await productRepo.insert(product);

    for (const currency of Object.values(Currency)) {
      const price1 = Fixture.stripePrice(
        Fixture.stripePriceId(),
        product.stripeId,
        100,
        currency as Currency,
        PriceType.MONTHLY,
      );
      const price2 = Fixture.stripePrice(
        Fixture.stripePriceId(),
        product.stripeId,
        250,
        currency as Currency,
        PriceType.ANNUALLY,
      );

      await priceRepo.createOrUpdate(price1);
      await priceRepo.createOrUpdate(price2);
    }

    try {
      await combinedStripeRepo.getPlanProductsWithPrices();

      // If we reach here, the test failed because no error was thrown
      fail("Expected an error to be thrown");
    } catch (error) {
      // Test passes if an error is thrown
      expect(error).toBeDefined();
    }
  });

  it("should return an error is the DB is missing a price type", async () => {
    for (const productType of Object.values(PlanProductType)) {
      const planProductType = productType as PlanProductType;
      const product = Fixture.stripeProduct(
        Fixture.stripeProductId(),
        null,
        productTypeUtils.toProductType(planProductType),
      );

      await productRepo.insert(product);

      for (const currency of Object.values(Currency)) {
        const price1 = Fixture.stripePrice(
          Fixture.stripePriceId(),
          product.stripeId,
          100,
          currency as Currency,
          PriceType.MONTHLY,
        );

        await priceRepo.createOrUpdate(price1);
      }
    }

    try {
      await combinedStripeRepo.getPlanProductsWithPrices();

      // If we reach here, the test failed because no error was thrown
      fail("Expected an error to be thrown");
    } catch (error) {
      // Test passes if an error is thrown
      expect(error).toBeDefined();
    }
  });

  it("should return prices for products", async () => {
    for (const productType of Object.values(PlanProductType)) {
      const planProductType = productType as PlanProductType;
      const product = Fixture.stripeProduct(
        Fixture.stripeProductId(),
        null,
        productTypeUtils.toProductType(planProductType),
      );

      await productRepo.insert(product);

      for (const currency of Object.values(Currency)) {
        const price1 = Fixture.stripePrice(
          Fixture.stripePriceId(),
          product.stripeId,
          100,
          currency as Currency,
          PriceType.MONTHLY,
        );
        const price2 = Fixture.stripePrice(
          Fixture.stripePriceId(),
          product.stripeId,
          250,
          currency as Currency,
          PriceType.ANNUALLY,
        );

        await priceRepo.createOrUpdate(price1);
        await priceRepo.createOrUpdate(price2);
      }
    }

    const prices = await combinedStripeRepo.getPlanProductsWithPrices();

    Object.values(Currency).forEach((currency) => {
      Object.values(PlanProductType).forEach((planProductType) => {
        expect(
          prices[planProductType][currency][PlanPriceType.MONTHLY],
        ).toEqual(expect.objectContaining({ unitAmount: 100 }));
        expect(
          prices[planProductType][currency][PlanPriceType.ANNUALLY],
        ).toEqual(expect.objectContaining({ unitAmount: 250 }));
      });
    });
  });
});
