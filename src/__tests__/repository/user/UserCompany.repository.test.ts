import { setupTestDB } from "../../__helpers__/jest.setup";
import { CompanyId, CompanyUserRole, UserId } from "../../../model";
import { Fixture } from "../../__helpers__/Fixture";
import { CreateCompanyBody } from "../../../dtos";
import { companyRepo, userCompanyRepo, userRepo } from "../../../db";

describe("UserCompanyRepository", () => {
  setupTestDB();

  let validUserId: UserId;
  let validCompanyId: CompanyId;

  beforeEach(async () => {
    const validUser = await userRepo.insert(
      Fixture.createUser(Fixture.localUser()),
    );
    validUserId = validUser.id;

    const companyBody: CreateCompanyBody = Fixture.createCompanyBody();
    const createdCompany = await companyRepo.create(companyBody);
    validCompanyId = createdCompany.id;
  });

  describe("insert", () => {
    it("should insert a new user-company relationship", async () => {
      const [insertedUserId, insertedCompanyId] = await userCompanyRepo.insert(
        validUserId,
        validCompanyId,
        CompanyUserRole.ADMIN,
      );

      expect(insertedUserId).toEqual(validUserId);
      expect(insertedCompanyId).toEqual(validCompanyId);
    });
  });

  describe("delete", () => {
    it("should delete an existing user-company relationship", async () => {
      // First, insert the user-company relationship
      await userCompanyRepo.insert(
        validUserId,
        validCompanyId,
        CompanyUserRole.ADMIN,
      );

      // Now, delete the relationship
      await userCompanyRepo.delete(validUserId, validCompanyId);

      // Attempt to find the relationship
      const userCompanyExists = await userCompanyRepo.getByUserId(validUserId);
      expect(userCompanyExists).not.toContain(validCompanyId); // Expect it to be absent
    });
  });

  describe("getByUserId", () => {
    it("should return an array of company IDs associated with the user", async () => {
      // Insert the user-company relationship
      await userCompanyRepo.insert(
        validUserId,
        validCompanyId,
        CompanyUserRole.ADMIN,
      );

      const companies = await userCompanyRepo.getByUserId(validUserId);
      expect(companies).toContainEqual([validCompanyId, CompanyUserRole.ADMIN]);
    });

    it("should return an empty array if the user has no associated companies", async () => {
      const companies = await userCompanyRepo.getByUserId(validUserId);
      expect(companies).toEqual([]); // Expect an empty array
    });
  });

  describe("getByCompanyId", () => {
    it("should return an array of user IDs associated with the company", async () => {
      // Insert the user-company relationship
      await userCompanyRepo.insert(
        validUserId,
        validCompanyId,
        CompanyUserRole.ADMIN,
      );

      const users = await userCompanyRepo.getByCompanyId(validCompanyId);
      expect(users).toContainEqual([validUserId, CompanyUserRole.ADMIN]);
    });

    it("should return an empty array if the company has no associated users", async () => {
      const newCompany = await companyRepo.create({
        taxId: "987654321",
        name: "Another Company",
        addressId: null, // Add addressId if needed
      });

      const users = await userCompanyRepo.getByCompanyId(newCompany.id);
      expect(users).toEqual([]); // Expect an empty array
    });
  });
});
