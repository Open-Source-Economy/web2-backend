import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import {
  getStripePriceRepository,
  getStripeProductRepository,
  ownerRepo,
  repositoryRepo,
} from "../../../db";

import {
  CampaignPriceType,
  CampaignProductType,
  Currency,
  Price,
  PriceType,
  ProductType,
  productTypeUtils,
  StripeProductId,
} from "@open-source-economy/api-types";
import { CampaignHelper } from "../../../controllers/campaign/campaign.helper";

const currencyPriceConfigs: Record<
  Currency,
  [number, Record<ProductType, Record<CampaignPriceType, string>>][]
> = Object.fromEntries(
  Object.entries({
    [Currency.USD]: [500, 1000],
    [Currency.EUR]: [800, 1600],
    [Currency.GBP]: [700, 1400],
    [Currency.CHF]: [700, 1400],
  }).map(([currency, amounts]) => [
    currency as Currency,
    amounts.map((amount) => [
      amount,
      Object.fromEntries(
        Object.values(ProductType).map((productType) => [
          productType,
          Object.fromEntries(
            Object.values(CampaignPriceType).map((priceType) => [
              priceType,
              "label",
            ]),
          ),
        ]),
      ),
    ]) as [number, Record<ProductType, Record<CampaignPriceType, string>>][],
  ]),
) as Record<
  Currency,
  [number, Record<ProductType, Record<CampaignPriceType, string>>][]
>;

describe("CampaignHelper.getPrices", () => {
  setupTestDB();

  const ownerId = Fixture.ownerId();
  const repositoryId = Fixture.repositoryId(ownerId);

  const productRepo = getStripeProductRepository();
  const priceRepo = getStripePriceRepository();

  beforeEach(async () => {
    await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));
    await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));
  });

  it("should return an error is the DB is missing a product type", async () => {
    const campaignProductType = CampaignProductType.CREDIT;
    const product = Fixture.stripeProduct(
      new StripeProductId("product-1"),
      repositoryId,
      productTypeUtils.toProductType(campaignProductType),
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
        PriceType.ONE_TIME,
      );

      await priceRepo.createOrUpdate(price1);
      await priceRepo.createOrUpdate(price2);
    }

    try {
      const prices: Record<
        CampaignPriceType,
        Record<Currency, Record<CampaignProductType, Price[]>>
      > = await CampaignHelper.getPrices(repositoryId, currencyPriceConfigs);

      // If we reach here, the test failed because no error was thrown
      fail("Expected an error to be thrown");
    } catch (error) {
      // Test passes if an error is thrown
      expect(error).toBeDefined();
    }
  });

  it("should return an error is the DB is missing a price type", async () => {
    for (const productType of Object.values(CampaignProductType)) {
      const campaignProductType = productType as CampaignProductType;
      const product = Fixture.stripeProduct(
        Fixture.stripeProductId(),
        repositoryId,
        productTypeUtils.toProductType(campaignProductType),
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
      const prices: Record<
        CampaignPriceType,
        Record<Currency, Record<CampaignProductType, Price[]>>
      > = await CampaignHelper.getPrices(repositoryId, currencyPriceConfigs);

      // If we reach here, the test failed because no error was thrown
      fail("Expected an error to be thrown");
    } catch (error) {
      // Test passes if an error is thrown
      expect(error).toBeDefined();
    }
  });

  it("should return prices for products", async () => {
    for (const productType of Object.values(CampaignProductType)) {
      const campaignProductType = productType as CampaignProductType;
      const product = Fixture.stripeProduct(
        Fixture.stripeProductId(),
        repositoryId,
        productTypeUtils.toProductType(campaignProductType),
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
          PriceType.ONE_TIME,
        );

        await priceRepo.createOrUpdate(price1);
        await priceRepo.createOrUpdate(price2);
      }
    }

    const prices: Record<
      CampaignPriceType,
      Record<Currency, Record<CampaignProductType, Price[]>>
    > = await CampaignHelper.getPrices(repositoryId, currencyPriceConfigs);

    expect(
      prices[CampaignPriceType.MONTHLY][Currency.USD][
        CampaignProductType.CREDIT
      ],
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ totalAmount: 500, quantity: 5 }),
        expect.objectContaining({ totalAmount: 1000, quantity: 10 }),
      ]),
    );

    Object.values(Currency).forEach((currency) => {
      Object.values(CampaignProductType).forEach((campaignProductType) => {
        expect(
          prices[CampaignPriceType.MONTHLY][currency][campaignProductType],
        ).toHaveLength(2);
        expect(
          prices[CampaignPriceType.ONE_TIME][currency][campaignProductType],
        ).toHaveLength(2);
      });
    });
  });
});
