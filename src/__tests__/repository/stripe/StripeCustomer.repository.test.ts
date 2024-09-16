import { type Express } from "express";
import { createApp } from "../../../createApp";
import { setupTestDB } from "../../jest.setup";
import {
  StripeCustomer,
  UserId,
  CompanyId,
  StripeCustomerId,
} from "../../../model";
import { Fixture } from "../Fixture";
import {
  getStripeCustomerRepository,
  getUserRepository,
  getCompanyRepository,
} from "../../../db";
import { CreateCompanyDto } from "../../../dtos";

describe("StripeCustomerRepository", () => {
  let app: Express = createApp();

  setupTestDB();

  const customerRepo = getStripeCustomerRepository();
  const userRepo = getUserRepository();
  const companyRepo = getCompanyRepository();

  describe("create", () => {
    it("should work", async () => {
      const userId = new UserId(1);
      const companyId = new CompanyId(1);
      const customerId = new StripeCustomerId("123");

      // Insert user and company before inserting the customer
      await userRepo.insertLocal(Fixture.createUserDto());
      await companyRepo.insert({} as CreateCompanyDto);

      const customer = new StripeCustomer(customerId, userId, companyId);
      const created = await customerRepo.insert(customer);

      expect(created).toEqual(customer);

      const found = await customerRepo.getById(customerId);
      expect(found).toEqual(customer);
    });

    it("should fail with foreign key constraint error if user or company is not inserted", async () => {
      const customerId = new StripeCustomerId("123");
      const userId = new UserId(Fixture.id()); // UserId that does not exist in the database
      const companyId = new CompanyId(Fixture.id()); // CompanyId that does not exist in the database

      const customer = new StripeCustomer(customerId, userId, companyId);

      try {
        await customerRepo.insert(customer);
        // If the insertion doesn't throw, fail the test
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
      const found = await customerRepo.getById(nonExistentCustomerId);

      expect(found).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return all customers", async () => {
      const userId = new UserId(1);
      const companyId = new CompanyId(1);

      // Insert user and company before inserting the customer
      await userRepo.insertLocal(Fixture.createUserDto());
      await companyRepo.insert({} as CreateCompanyDto);

      const customerId1 = new StripeCustomerId("123");
      const customerId2 = new StripeCustomerId("abc");

      const customer1 = new StripeCustomer(customerId1, userId, companyId);
      const customer2 = new StripeCustomer(customerId2, userId, companyId);

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
