import { setupTestDB } from "../__helpers__/jest.setup";
import {
  CompanyUserRole,
  CreateAddressBody,
  UserId,
} from "@open-source-economy/api-types";
import { Fixture } from "../__helpers__/Fixture";
import { addressRepo, companyRepo, userCompanyRepo, userRepo } from "../../db/";

describe("AddressRepository", () => {
  setupTestDB();
  let validUserId: UserId;

  beforeEach(async () => {
    const validUser = await userRepo.insert(
      Fixture.createUser(Fixture.localUser()),
    );
    validUserId = validUser.id;
  });

  describe("create", () => {
    it("should create a new company address", async () => {
      const addressBody = {
        name: "Company Name",
      } as CreateAddressBody;

      const created = await addressRepo.create(addressBody);

      expect(created).toEqual(Fixture.addressFromBody(created.id, addressBody));

      const found = await addressRepo.getById(created.id);
      expect(found).toEqual(created);
    });
  });

  describe("update", () => {
    it("should update an existing company address", async () => {
      const addressBody = {
        name: "Company Name",
      } as CreateAddressBody;

      // First create the address
      const created = await addressRepo.create(addressBody);

      // Update the address
      const updatedAddressBody = {
        name: "Updated Company Name",
      } as CreateAddressBody;

      const updated = await addressRepo.update(
        Fixture.addressFromBody(created.id, updatedAddressBody),
      );

      expect(created.id).toEqual(updated.id);
      expect(updated).toEqual(
        Fixture.addressFromBody(created.id, updatedAddressBody),
      );

      const found = await addressRepo.getById(updated.id);
      expect(found).toEqual(updated);
    });
  });

  describe("getById", () => {
    it("should return null if address not found", async () => {
      const nonExistentAddressId = Fixture.addressId();
      const found = await addressRepo.getById(nonExistentAddressId);

      expect(found).toBeNull();
    });
  });

  describe("getByCompanyId", () => {
    it("should return the address for a given company ID", async () => {
      const addressBody = {
        name: "Company Name",
      } as CreateAddressBody;

      // First create the address
      const created = await addressRepo.create(addressBody);

      // Create a company with an associated address
      const companyBody = {
        name: "Test Company",
        taxId: "1234",
        addressId: created.id,
      };

      const company = await companyRepo.create(companyBody);

      // Fetch the address using getByCompanyId
      const address = await addressRepo.getByCompanyId(company.id);

      expect(address).toEqual(created);
    });

    it("should return null if the company has no associated address", async () => {
      // Create a company without an associated address
      const companyBody = Fixture.createCompanyBody();

      const company = await companyRepo.create(companyBody);

      // Fetch the address
      const address = await addressRepo.getByCompanyId(company.id);

      expect(address).toBeNull();
    });
  });

  describe("getCompanyUserAddress", () => {
    it("should return the address associated with the user's company", async () => {
      const addressBody = {
        name: "Company Name",
      } as CreateAddressBody;

      // First create the address
      const created = await addressRepo.create(addressBody);

      const companyBody = {
        name: "Test Company",
        taxId: "12345",
        contactPersonId: validUserId,
        addressId: created.id,
      };

      const company = await companyRepo.create(companyBody);
      await userCompanyRepo.insert(
        validUserId,
        company.id,
        CompanyUserRole.ADMIN,
      );

      // Fetch the address using the user ID
      const address = await addressRepo.getCompanyUserAddress(validUserId);

      expect(address).toEqual(created);
    });

    it("should return null if the user is not linked to any company", async () => {
      // Fetch the address
      const address = await addressRepo.getCompanyUserAddress(validUserId);

      expect(address).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return an empty array if no address exist", async () => {
      const alladdress = await addressRepo.getAll();

      expect(alladdress).toEqual([]);
    });

    it("should return all company address", async () => {
      const addressId1 = Fixture.uuid();
      const addressId2 = Fixture.uuid();

      const address = {
        name: "Company Name",
      } as CreateAddressBody;

      const address1 = await addressRepo.create(address);
      const address2 = await addressRepo.create(address);

      const alladdress = await addressRepo.getAll();

      expect(alladdress).toHaveLength(2);
      expect(alladdress).toContainEqual(
        Fixture.addressFromBody(address1.id, address),
      );
      expect(alladdress).toContainEqual(
        Fixture.addressFromBody(address2.id, address),
      );
    });
  });
});
