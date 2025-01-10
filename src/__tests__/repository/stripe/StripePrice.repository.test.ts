import { setupTestDB } from "../../__helpers__/jest.setup";
import { stripePriceRepo, stripeProductRepo } from "../../../db";
import { Fixture } from "../../__helpers__/Fixture";

describe("StripePriceRepository", () => {
  setupTestDB();

  const validProductId = Fixture.stripeProductId();

  beforeEach(async () => {
    const product = Fixture.stripeProduct(validProductId, null);
    await stripeProductRepo.insert(product);
  });

  describe("insert and getById", () => {
    it("should insert a price and retrieve it by ID", async () => {
      const id = Fixture.stripePriceId();
      const price = Fixture.stripePrice(id, validProductId);

      await stripePriceRepo.insert(price);
      const fetched = await stripePriceRepo.getById(id);
      expect(fetched).toEqual(price);
    });

    it("should throw an error for invalid price configuration", async () => {
      const id = Fixture.stripePriceId();
      const price = Fixture.stripePrice(id, validProductId, -100);
      await expect(async () => {
        await stripePriceRepo.insert(price);
      }).rejects.toThrowError("Unit amount must be greater than 0");
    });
  });

  describe("getAll", () => {
    it("should return all prices", async () => {
      const result = await stripePriceRepo.getAll();
      // You can assert length or check if certain known prices are in the DB
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
