import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import { getStripeCustomerRepository } from "../../../db";

describe("StripeCustomerRepository", () => {
  setupTestDB();

  const stripeCustomerRepo = getStripeCustomerRepository();

  describe("insert", () => {
    it("should insert a StripeCustomer and retrieve it by ID", async () => {
      const stripeId = Fixture.stripeCustomerId();
      const customer = Fixture.stripeCustomer(stripeId);

      const insertedCustomer = await stripeCustomerRepo.insert(customer);

      expect(insertedCustomer).toEqual(customer);

      const fetchedCustomer = await stripeCustomerRepo.getByStripeId(stripeId);
      expect(fetchedCustomer).toEqual(customer);
    });
  });

  describe("getByStripeId", () => {
    it("should return null if no customer exists with the given ID", async () => {
      const nonExistentCustomerId = Fixture.stripeCustomerId();
      const customer = await stripeCustomerRepo.getByStripeId(
        nonExistentCustomerId,
      );
      expect(customer).toBeNull();
    });
  });

  describe("getByEmail", () => {
    it("should return a StripeCustomer by email", async () => {
      const stripeId = Fixture.stripeCustomerId();
      const customer = Fixture.stripeCustomer(
        stripeId,
        "EUR",
        "customer@example.com",
        "Customer Name",
        "987-654-3210",
        ["fr-FR"],
      );

      await stripeCustomerRepo.insert(customer);

      const fetchedCustomer = await stripeCustomerRepo.getByEmail(
        "customer@example.com",
      );
      expect(fetchedCustomer).toEqual(customer);
    });

    it("should return null if no customer exists with the given email", async () => {
      const customer = await stripeCustomerRepo.getByEmail(
        "nonexistent@example.com",
      );
      expect(customer).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return all StripeCustomers", async () => {
      const stripeId1 = Fixture.stripeCustomerId();
      const stripeId2 = Fixture.stripeCustomerId();

      const customer1 = Fixture.stripeCustomer(
        stripeId1,
        "GBP",
        "customer1@example.com",
        "Customer One",
        undefined,
        [],
      );

      const customer2 = Fixture.stripeCustomer(
        stripeId2,
        "AUD",
        "customer2@example.com",
        "Customer Two",
        "111-222-3333",
        ["en-AU"],
      );

      await stripeCustomerRepo.insert(customer1);
      await stripeCustomerRepo.insert(customer2);

      const customers = await stripeCustomerRepo.getAll();

      expect(customers).toHaveLength(2);
      expect(customers).toContainEqual(customer1);
      expect(customers).toContainEqual(customer2);
    });

    it("should return an empty array if no customers exist", async () => {
      const customers = await stripeCustomerRepo.getAll();
      expect(customers).toEqual([]);
    });
  });
});
