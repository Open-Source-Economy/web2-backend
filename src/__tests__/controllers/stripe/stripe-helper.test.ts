import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import {
  getStripePriceRepository,
  getStripeProductRepository,
  ownerRepo,
  repositoryRepo,
} from "../../../db";
import { StripeHelper } from "../../../controllers";

import {
  Currency,
  PriceType,
  ProductType,
  StripeProductId,
} from "../../../model";
import { Price } from "../../../dtos";

const currencyPriceConfigs: Record<
  Currency,
  [number, Record<ProductType, Record<PriceType, string>>][]
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
            Object.values(PriceType).map((priceType) => [priceType, "label"]),
          ),
        ]),
      ),
    ]) as [number, Record<ProductType, Record<PriceType, string>>][],
  ]),
) as Record<
  Currency,
  [number, Record<ProductType, Record<PriceType, string>>][]
>;

describe("StripeHelper.getPrices", () => {
  setupTestDB();

  const ownerId = Fixture.ownerId();
  const repositoryId = Fixture.repositoryId(ownerId);

  const productRepo = getStripeProductRepository();
  const priceRepo = getStripePriceRepository();

  beforeEach(async () => {
    await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));
    await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));
  });

  it("should return prices for products", async () => {
    const product = Fixture.stripeProduct(
      new StripeProductId("product-1"),
      repositoryId,
      ProductType.credit,
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
});
