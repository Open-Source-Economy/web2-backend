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
      // Pre-insert a product or ensure there's a product_id in the DB
      // Example assumes a product with stripe_id="prod_abc" exists
      const id = Fixture.stripePriceId();
      const price = Fixture.stripePrice(id, validProductId);

      await stripePriceRepo.insert(price);
      const fetched = await stripePriceRepo.getById(id);
      expect(fetched).toEqual(price);
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
