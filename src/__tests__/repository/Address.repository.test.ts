import { setupTestDB } from "../jest.setup";
import { AddressId, CompanyId, UserId } from "../../model";
import { Fixture } from "./Fixture";
import {
  getAddressRepository,
  getCompanyRepository,
  getUserRepository,
} from "../../db/";
import { CreateAddressDto, CreateCompanyDto } from "../../dtos";

describe("AddressRepository", () => {
  const userRepo = getUserRepository();
  const companyRepo = getCompanyRepository();
  const addressRepo = getAddressRepository();

  setupTestDB();
  let validUserId: UserId;

  beforeEach(async () => {
    const validUser = await userRepo.insertLocal(Fixture.createUserDto());
    validUserId = validUser.id;
  });

  describe("create", () => {
    it("should create a new company address", async () => {
      const addressDto = {
        name: "Company Name",
      } as CreateAddressDto;

      const created = await addressRepo.create(addressDto);

      expect(created).toEqual(
        Fixture.addressFromDto(created.id.id, addressDto),
      );

      const found = await addressRepo.getById(new AddressId(created.id.id));
      expect(found).toEqual(created);
    });
  });

  describe("update", () => {
    it("should update an existing company address", async () => {
      const addressDto = {
        name: "Company Name",
      } as CreateAddressDto;

      // First create the address
      const created = await addressRepo.create(addressDto);

      // Update the address
      const updatedAddressDto = {
        name: "Updated Company Name",
      } as CreateAddressDto;

      const updated = await addressRepo.update(
        Fixture.addressFromDto(created.id.id, updatedAddressDto),
      );

      expect(created.id).toEqual(updated.id);
      expect(updated).toEqual(
        Fixture.addressFromDto(created.id.id, updatedAddressDto),
      );

      const found = await addressRepo.getById(new AddressId(updated.id.id));
      expect(found).toEqual(updated);
    });
  });

  describe("getById", () => {
    it("should return null if address not found", async () => {
      const nonExistentAddressId = new AddressId(999999);
      const found = await addressRepo.getById(nonExistentAddressId);

      expect(found).toBeNull();
    });
  });

  describe("getByCompanyId", () => {
    it("should return the address for a given company ID", async () => {
      const addressDto = {
        name: "Company Name",
      } as CreateAddressDto;

      // First create the address
      const created = await addressRepo.create(addressDto);

      // Create a company with an associated address
      const companyDto = {
        name: "Test Company",
        taxId: "1234",
        addressId: created.id,
      } as CreateCompanyDto;

      const company = await companyRepo.insert(companyDto);
      const companyId = new CompanyId(company.id.id);

      // Fetch the address using getByCompanyId
      const address = await addressRepo.getByCompanyId(companyId);

      expect(address).toEqual(created);
    });

    it("should return null if the company has no associated address", async () => {
      // Create a company without an associated address
      const companyDto = {
        name: "Test Company",
        taxId: "1234",
      } as CreateCompanyDto;

      const company = await companyRepo.insert(companyDto);
      const companyId = new CompanyId(company.id.id);

      // Fetch the address
      const address = await addressRepo.getByCompanyId(companyId);

      expect(address).toBeNull();
    });
  });

  describe("getCompanyUserAddress", () => {
    it("should return the address associated with the user's company", async () => {
      const addressDto = {
        name: "Company Name",
      } as CreateAddressDto;

      // First create the address
      const created = await addressRepo.create(addressDto);

      const companyDto = {
        name: "Test Company",
        taxId: "12345",
        contactPersonId: validUserId,
        addressId: created.id,
      } as CreateCompanyDto;

      await companyRepo.insert(companyDto);

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
      const addressId1 = Fixture.id();
      const addressId2 = Fixture.id();

      const address = {
        name: "Company Name",
      } as CreateAddressDto;

      await addressRepo.create(address);
      await addressRepo.create(address);

      const alladdress = await addressRepo.getAll();

      expect(alladdress).toHaveLength(2);
      expect(alladdress).toContainEqual(Fixture.addressFromDto(1, address));
      expect(alladdress).toContainEqual(Fixture.addressFromDto(2, address));
    });
  });
});
