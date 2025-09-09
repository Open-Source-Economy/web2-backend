import { setupTestDB } from "../__helpers__/jest.setup";
import { AddressId, Company } from "@open-source-economy/api-types";
import { Fixture } from "../__helpers__/Fixture";
import { getAddressRepository, getCompanyRepository } from "../../db/";

describe("CompanyRepository", () => {
  const addressRepo = getAddressRepository();
  const companyRepo = getCompanyRepository();

  setupTestDB();

  let validAddressId: AddressId;

  beforeEach(async () => {
    const address = await addressRepo.create(Fixture.createAddressBody());
    validAddressId = address.id;
  });

  describe("insert", () => {
    it("when addressId is null", async () => {
      const company = Fixture.createCompanyBody();

      const created = await companyRepo.create(company);

      expect(created).toEqual(Fixture.companyFromBody(created.id, company));

      const found = await companyRepo.getById(created.id);
      expect(found).toEqual(created);
    });

    it("when addressId is NOT null", async () => {
      const company = Fixture.createCompanyBody(validAddressId);

      const created = await companyRepo.create(company);

      expect(created).toEqual(Fixture.companyFromBody(created.id, company));

      const found = await companyRepo.getById(created.id);
      expect(found).toEqual(created);
    });
  });

  describe("update", () => {
    it("should handle updating with no data changes", async () => {
      const initialCompany = Fixture.createCompanyBody(validAddressId);

      const created = await companyRepo.create(initialCompany);

      const updated = await companyRepo.update(created);

      const found = await companyRepo.getById(created.id);
      expect(found).toEqual(updated);
    });

    it("should handle updating and address_id to NULL", async () => {
      // Insert a company with a non-null contact person ID
      const initialCompany = Fixture.createCompanyBody(validAddressId);

      const created = await companyRepo.create(initialCompany);

      const updatedCompany = new Company(
        created.id,
        created.taxId,
        created.name,
        null,
      );

      const updated = await companyRepo.update(updatedCompany);

      expect(updated.addressId).toBeNull();

      const found = await companyRepo.getById(created.id);
      expect(found).toEqual(updated);
    });

    it("should update an existing company", async () => {
      // Insert a company first
      const created = await companyRepo.create({
        taxId: "123456",
        name: "Company A",
        addressId: validAddressId,
      });

      const updatedCompany = new Company(
        created.id,
        "00000",
        "Company B",
        validAddressId,
      );

      const updated = await companyRepo.update(updatedCompany);

      expect(updated).toEqual(updatedCompany);

      const found = await companyRepo.getById(created.id);
      expect(found).toEqual(updated);
    });
  });

  describe("getById", () => {
    it("should return null if company not found", async () => {
      const nonExistentCompanyId = Fixture.companyId();
      const found = await companyRepo.getById(nonExistentCompanyId);

      expect(found).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return all companies", async () => {
      const company1 = await companyRepo.create(Fixture.createCompanyBody());
      const company2 = await companyRepo.create(Fixture.createCompanyBody());

      const allCompanies = await companyRepo.getAll();

      expect(allCompanies).toHaveLength(2);
      expect(allCompanies).toContainEqual(company1);
      expect(allCompanies).toContainEqual(company2);
    });

    it("should return an empty array if no companies exist", async () => {
      const allCompanies = await companyRepo.getAll();

      expect(allCompanies).toEqual([]);
    });
  });
});
