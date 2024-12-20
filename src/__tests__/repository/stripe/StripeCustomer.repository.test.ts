import { setupTestDB } from "../../__helpers__/jest.setup";
import {
  CompanyId,
  CompanyUserRole,
  StripeCustomer,
  StripeCustomerId,
  UserId,
} from "../../../model"; // Add CompanyId if needed
import { Fixture } from "../../__helpers__/Fixture";
import {
  getCompanyRepository,
  getStripeCustomerRepository,
  getUserCompanyRepository,
  getUserRepository,
} from "../../../db";

describe("StripeCustomerRepository", () => {
  setupTestDB();

  let validUserId: UserId;
  let validCompanyId: CompanyId;
  const companyRepo = getCompanyRepository();
  const userCompanyRepo = getUserCompanyRepository();
  const customerRepo = getStripeCustomerRepository();
  const userRepo = getUserRepository();

  beforeEach(async () => {
    const validUser = await userRepo.insert(
      Fixture.createUser(Fixture.localUser()),
    );
    validUserId = validUser.id;

    const validCompany = await companyRepo.create(Fixture.createCompanyBody());
    validCompanyId = validCompany.id;
  });

  describe("create", () => {
    it("should work without a companyId", async () => {
      const customerId = Fixture.stripeCustomerId();

      // Insert user before inserting the customer
      await userRepo.insert(Fixture.createUser(Fixture.localUser()));

      // No companyId provided
      const customer = new StripeCustomer(customerId, validUserId);
      const created = await customerRepo.insert(customer);

      expect(created).toEqual(customer);

      const found = await customerRepo.getByStripeId(customerId);
      expect(found).toEqual(customer);
    });

    it("should work with a companyId", async () => {
      const customerId = Fixture.stripeCustomerId();

      // Insert user before inserting the customer
      await userRepo.insert(Fixture.createUser(Fixture.localUser()));

      await userCompanyRepo.insert(
        validUserId,
        validCompanyId,
        CompanyUserRole.ADMIN,
      );

      const customer = new StripeCustomer(
        customerId,
        validUserId,
        validCompanyId,
      );
      const created = await customerRepo.insert(customer);

      expect(created).toEqual(customer);

      const found = await customerRepo.getByStripeId(customerId);
      expect(found).toEqual(customer);
    });

    it("should fail with foreign key constraint error if user is not inserted", async () => {
      const customerId = new StripeCustomerId("123");
      const customer = new StripeCustomer(customerId, Fixture.userId()); // no user in DB

      try {
        await customerRepo.insert(customer);
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
      const found = await customerRepo.getByStripeId(nonExistentCustomerId);

      expect(found).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return all customers", async () => {
      // Insert user before inserting the customer
      await userRepo.insert(Fixture.createUser(Fixture.localUser()));

      const customerId1 = new StripeCustomerId("123");
      const customerId2 = new StripeCustomerId("abc");

      const customer1 = new StripeCustomer(customerId1, validUserId);
      const customer2 = new StripeCustomer(customerId2, validUserId);

      await customerRepo.insert(customer1);
      await customerRepo.insert(customer2);

      const allCustomers = await customerRepo.getAll();

      expect(allCustomers).toHaveLength(2);
      expect(allCustomers).toContainEqual(customer1);
      expect(allCustomers).toContainEqual(customer2);
    });

    it("should return an empty array if no customers exist", async () => {
      const allCustomers = await customerRepo.getAll();
      expect(allCustomers).toEqual([]);
    });
  });
});
