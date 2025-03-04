import { setupTestDB } from "../../__helpers__/jest.setup";
import { stripePriceRepo, stripeProductRepo } from "../../../db";
import { Fixture } from "../../__helpers__/Fixture";
import { Currency, PriceType } from "../../../api/model";

describe("StripePriceRepository", () => {
  setupTestDB();

  const validProductId = Fixture.stripeProductId();

  beforeEach(async () => {
    const product = Fixture.stripeProduct(validProductId, null);
    await stripeProductRepo.insert(product);
  });

  describe("createOrUpdate and getById", () => {
    it("should insert a new price and retrieve it by ID", async () => {
      const id = Fixture.stripePriceId();
      const price = Fixture.stripePrice(id, validProductId);

      await stripePriceRepo.createOrUpdate(price);
      const fetched = await stripePriceRepo.getById(id);
      expect(fetched).toEqual(price);
    });

    it("should update an existing price when same ID is used", async () => {
      const id = Fixture.stripePriceId();
      const initialPrice = Fixture.stripePrice(id, validProductId, 1000);

      // First insert
      await stripePriceRepo.createOrUpdate(initialPrice);

      // Create updated price with same ID but different amount
      const updatedPrice = Fixture.stripePrice(id, validProductId, 2000);
      await stripePriceRepo.createOrUpdate(updatedPrice);

      // Verify the price was updated
      const fetched = await stripePriceRepo.getById(id);
      expect(fetched?.unitAmount).toEqual(2000);
      expect(fetched).toEqual(updatedPrice);
    });

    it("should update multiple fields of an existing price", async () => {
      const id = Fixture.stripePriceId();

      // Create initial price
      const initialPrice = Fixture.stripePrice(id, validProductId, 1000);
      initialPrice.currency = Currency.USD;
      initialPrice.active = true;
      initialPrice.type = PriceType.ONE_TIME;
      await stripePriceRepo.createOrUpdate(initialPrice);

      // Verify initial state
      const initialFetched = await stripePriceRepo.getById(id);
      expect(initialFetched).toEqual(initialPrice);

      // Create updated price with multiple changed fields
      const updatedPrice = Fixture.stripePrice(id, validProductId, 1500);
      updatedPrice.currency = Currency.EUR;
      updatedPrice.active = false;
      updatedPrice.type = PriceType.ANNUALLY;
      await stripePriceRepo.createOrUpdate(updatedPrice);

      // Verify all fields were updated
      const updatedFetched = await stripePriceRepo.getById(id);
      expect(updatedFetched?.unitAmount).toEqual(1500);
      expect(updatedFetched?.currency).toEqual(Currency.EUR);
      expect(updatedFetched?.active).toEqual(false);
      expect(updatedFetched?.type).toEqual(PriceType.ANNUALLY);
      expect(updatedFetched).toEqual(updatedPrice);
    });

    it("should throw an error for invalid price configuration", async () => {
      const id = Fixture.stripePriceId();
      const price = Fixture.stripePrice(id, validProductId, -100);
      await expect(async () => {
        await stripePriceRepo.createOrUpdate(price);
      }).rejects.toThrowError("Unit amount must be greater than 0");
    });
  });

  describe("getAll", () => {
    it("should return all prices", async () => {
      // Create a few prices first
      const price1 = Fixture.stripePrice(
        Fixture.stripePriceId(),
        validProductId,
        1000,
      );
      const price2 = Fixture.stripePrice(
        Fixture.stripePriceId(),
        validProductId,
        2000,
      );

      await stripePriceRepo.createOrUpdate(price1);
      await stripePriceRepo.createOrUpdate(price2);

      const result = await stripePriceRepo.getAll();

      // Verify we have at least the two prices we just created
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });
});
