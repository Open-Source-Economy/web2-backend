import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import {
  getOwnerRepository,
  getRepositoryRepository,
  getStripePriceRepository,
  getStripeProductRepository,
} from "../../../db";
import { StripeHelper } from "../../../controllers";

import {
  Currency,
  PriceType,
  ProductType,
  StripeProductId,
} from "../../../model";
import { Price } from "../../../dtos";

const currencyPriceConfigs: Record<Currency, [number, string][]> = {
  [Currency.USD]: [
    [500, "10$"],
    [1000, "20$"],
  ],
  [Currency.EUR]: [
    [800, "8€"],
    [1600, "16€"],
  ],
  [Currency.GBP]: [
    [700, "7£"],
    [1400, "14£"],
  ],
  [Currency.CHF]: [
    [700, "7CHF"],
    [1400, "7CHF"],
  ],
};

describe("StripeHelper.getPrices", () => {
  setupTestDB();

  const ownerId = Fixture.ownerId();
  const repositoryId = Fixture.repositoryId(ownerId);

  const productRepo = getStripeProductRepository();
  const priceRepo = getStripePriceRepository();

  const ownerRepo = getOwnerRepository();
  const repoRepo = getRepositoryRepository();

  beforeEach(async () => {
    await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));
    await repoRepo.insertOrUpdate(Fixture.repository(repositoryId));
  });

  it("should return prices for products", async () => {
    const product = Fixture.stripeProduct(
      new StripeProductId("product-1"),
      repositoryId,
      ProductType.milliDow,
    );

    await productRepo.insert(product);

    Object.values(Currency).forEach(async (currency) => {
      const price1 = Fixture.stripePrice(
        Fixture.stripePriceId(),
        product.stripeId,
        100,
        currency as Currency,
        PriceType.RECURRING,
      );
      const price2 = Fixture.stripePrice(
        Fixture.stripePriceId(),
        product.stripeId,
        250,
        currency as Currency,
        PriceType.ONE_TIME,
      );

      await priceRepo.insert(price1);
      await priceRepo.insert(price2);
    });

    const prices: Record<
      PriceType,
      Record<Currency, Record<ProductType, Price[]>>
    > = await StripeHelper.getPrices(repositoryId, currencyPriceConfigs);

    expect(
      prices[PriceType.RECURRING][Currency.USD][product.type],
    ).toHaveLength(2);

    expect(prices[PriceType.RECURRING][Currency.USD][product.type]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ totalAmount: 500, quantity: 5 }),
        expect.objectContaining({ totalAmount: 1000, quantity: 10 }),
      ]),
    );

    Object.values(Currency).forEach((currency) => {
      expect(prices[PriceType.RECURRING][currency][product.type]).toHaveLength(
        2,
      );
      expect(prices[PriceType.ONE_TIME][currency][product.type]).toHaveLength(
        2,
      );
    });
  });

  it("should return an empty result if no products exist", async () => {
    const nonExistentRepositoryId = Fixture.repositoryId(Fixture.ownerId());
    const prices = await StripeHelper.getPrices(
      nonExistentRepositoryId,
      currencyPriceConfigs,
    );
    expect(prices).toEqual({});
  });
});
