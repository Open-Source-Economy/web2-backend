import { setupTestDB } from "../../__helpers__/jest.setup";
import {
  CompanyId,
  CompanyUserRole,
  StripeCustomerId,
  StripeCustomerUser,
  UserId,
} from "@open-source-economy/api-types"; // Add CompanyId if needed
import { Fixture } from "../../__helpers__/Fixture";
import {
  companyRepo,
  stripeCustomerRepo,
  stripeCustomerUserRepo,
  userCompanyRepo,
  userRepo,
} from "../../../db";

describe("StripeCustomerUserRepository", () => {
  setupTestDB();

  let validUserId: UserId;
  let validCompanyId: CompanyId;
  let validStripeCustomerId: StripeCustomerId = Fixture.stripeCustomerId();
  let validStripeCustomerId2: StripeCustomerId = Fixture.stripeCustomerId();

  beforeEach(async () => {
    const validUser = await userRepo.insert(
      Fixture.createUser(Fixture.localUser()),
    );
    validUserId = validUser.id;

    const validCompany = await companyRepo.create(Fixture.createCompanyBody());
    validCompanyId = validCompany.id;

    const stripeCustomer = Fixture.stripeCustomer(validStripeCustomerId);
    await stripeCustomerRepo.insert(stripeCustomer);
    const stripeCustomer2 = Fixture.stripeCustomer(validStripeCustomerId2);
    await stripeCustomerRepo.insert(stripeCustomer2);
  });

  describe("create", () => {
    it("should work without a companyId", async () => {
      // Insert user before inserting the customer
      await userRepo.insert(Fixture.createUser(Fixture.localUser()));

      // No companyId provided
      const customer = new StripeCustomerUser(
        validStripeCustomerId,
        validUserId,
      );
      const created = await stripeCustomerUserRepo.insert(customer);

      expect(created).toEqual(customer);

      const found = await stripeCustomerUserRepo.getByStripeId(
        validStripeCustomerId,
      );
      expect(found).toEqual(customer);
    });

    it("should work with a companyId", async () => {
      // Insert user before inserting the customer
      await userRepo.insert(Fixture.createUser(Fixture.localUser()));

      await userCompanyRepo.insert(
        validUserId,
        validCompanyId,
        CompanyUserRole.ADMIN,
      );

      const customer = new StripeCustomerUser(
        validStripeCustomerId,
        validUserId,
      );
      const created = await stripeCustomerUserRepo.insert(customer);

      expect(created).toEqual(customer);

      const found = await stripeCustomerUserRepo.getByStripeId(
        validStripeCustomerId,
      );
      expect(found).toEqual(customer);
    });

    it("should fail with foreign key constraint error if user is not inserted", async () => {
      const validStripeCustomerId = new StripeCustomerId("123");
      const customer = new StripeCustomerUser(
        validStripeCustomerId,
        Fixture.userId(),
      ); // no user in DB

      try {
        await stripeCustomerUserRepo.insert(customer);
        fail(
          "Expected foreign key constraint violation, but no error was thrown.",
        );
      } catch (error: any) {
        // Check if the error is related to foreign key constraint
        expect(error.message).toMatch(/violates foreign key constraint/);
      }
    });
  });

  describe("getById", () => {
    it("should return null if customer not found", async () => {
      const nonExistentCustomerId = new StripeCustomerId("non-existent-id");
      const found = await stripeCustomerUserRepo.getByStripeId(
        nonExistentCustomerId,
      );

      expect(found).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return all customers", async () => {
      // Insert user before inserting the customer
      await userRepo.insert(Fixture.createUser(Fixture.localUser()));

      const customer1 = new StripeCustomerUser(
        validStripeCustomerId,
        validUserId,
      );
      const customer2 = new StripeCustomerUser(
        validStripeCustomerId2,
        validUserId,
      );

      await stripeCustomerUserRepo.insert(customer1);
      await stripeCustomerUserRepo.insert(customer2);

      const allCustomers = await stripeCustomerUserRepo.getAll();

      expect(allCustomers).toHaveLength(2);
      expect(allCustomers).toContainEqual(customer1);
      expect(allCustomers).toContainEqual(customer2);
    });

    it("should return an empty array if no customers exist", async () => {
      const allCustomers = await stripeCustomerUserRepo.getAll();
      expect(allCustomers).toEqual([]);
    });
  });
});
