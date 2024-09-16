import { type Express } from "express";
import { createApp } from "../../../createApp";
import { setupTestDB } from "../../jest.setup";
import { Fixture } from "../Fixture";
import { getStripeProductRepository } from "../../../db";
import { StripeProduct, StripeProductId } from "../../../model";

describe("StripeProductRepository", () => {
  let app: Express = createApp();

  setupTestDB();

  const productRepo = getStripeProductRepository();

  describe("create", () => {
    it("should insert a product", async () => {
      const productId = new StripeProductId("1");

      const product = Fixture.stripeProduct(productId.toString());

      const created = await productRepo.insert(product);
      expect(created).toEqual(product);

      const found = await productRepo.getById(productId);
      expect(found).toEqual(product);
    });

    it("should fail with constraint violation if duplicate stripe_id is inserted", async () => {
      const productId = new StripeProductId("1");

      const product = Fixture.stripeProduct(productId.toString());

      await productRepo.insert(product);

      try {
        await productRepo.insert(product);
        fail("Expected a constraint violation error, but none was thrown.");
      } catch (error: any) {
        // Check that the error is related to a constraint violation
        expect(error.message).toMatch(
          /duplicate key value violates unique constraint/,
        );
      }
    });
  });

  describe("getById", () => {
    it("should return null if product not found", async () => {
      const nonExistentStripeProductId = new StripeProductId("non-existent-id");
      const found = await productRepo.getById(nonExistentStripeProductId);

      expect(found).toBeNull();
    });

    it("should return a product by ID", async () => {
      const productId = new StripeProductId("1");

      const product = new StripeProduct(productId, "DoW", 1);

      await productRepo.insert(product);

      const found = await productRepo.getById(productId);
      expect(found).toEqual(product);
    });
  });

  describe("getAll", () => {
    it("should return all products", async () => {
      const productId1 = new StripeProductId("1");
      const productId2 = new StripeProductId("2");

      const product1 = Fixture.stripeProduct(productId1.toString());
      const product2 = Fixture.stripeProduct(productId2.toString());

      await productRepo.insert(product1);
      await productRepo.insert(product2);

      const allProducts = await productRepo.getAll();

      expect(allProducts).toHaveLength(2);
      expect(allProducts).toContainEqual(product1);
      expect(allProducts).toContainEqual(product2);
    });

    it("should return an empty array if no products exist", async () => {
      const allProducts = await productRepo.getAll();
      expect(allProducts).toEqual([]);
    });
  });
});
