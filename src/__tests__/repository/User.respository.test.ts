import { setupTestDB } from "../__helpers__/jest.setup";
import {
  LocalUser,
  Provider,
  ThirdPartyUser,
  ThirdPartyUserId,
  UserRole,
} from "../../model";
import { Fixture } from "../__helpers__/Fixture";
import { getUserRepository } from "../../db/";

describe("UserRepository", () => {
  setupTestDB();

  const repo = getUserRepository();

  describe("insertLocal", () => {
    it("should create and return a local user", async () => {
      const userBodyParams = Fixture.createUserBodyParams();
      const created = await repo.insertLocal(userBodyParams);

      expect(created.data).toBeInstanceOf(LocalUser);
      if (created.data instanceof LocalUser) {
        expect(created.data.email).toBe(userBodyParams.email);
        expect(created.data.name).toBe(null);
        expect(created.data.isEmailVerified).toBe(false);
        expect(created.data.hashedPassword).toBeDefined();
      }

      const found = await repo.getById(created.id);
      expect(found).toEqual(created);
    });
  });

  describe("insertGithub", () => {
    it("should create and return a Github user", async () => {
      const thirdPartyUser = Fixture.thirdPartyUser("1");

      const created = await repo.insertGithub(thirdPartyUser);

      expect(created.data).toBeInstanceOf(ThirdPartyUser);
      if (created.data instanceof ThirdPartyUser) {
        expect(created.data).toEqual(thirdPartyUser);
      }

      expect(created.role).toBe(UserRole.USER);

      const found = await repo.getById(created.id);
      expect(found).toEqual(created);
    });

    it("should throw an error for non-Github providers", async () => {
      const thirdPartyUser = Fixture.thirdPartyUser(
        "1",
        "invalid_provider" as Provider,
      );

      await expect(repo.insertGithub(thirdPartyUser)).rejects.toThrow(
        "Invalid provider, was expecting Github",
      );
    });
  });

  describe("validateEmail", () => {
    it("should return null if user not found", async () => {
      const user = await repo.validateEmail("bonjour");
      expect(user).toBeNull();
    });

    it("should update the email", async () => {
      const userBodyParams = Fixture.createUserBodyParams();
      await repo.insertLocal(userBodyParams);

      const user = await repo.validateEmail(userBodyParams.email);

      expect(user).toBeDefined();
      expect(user!.data).toBeInstanceOf(LocalUser);
      if (user!.data instanceof LocalUser) {
        expect(user!.data.email).toBe(userBodyParams.email);
        expect(user!.data.name).toBe(null);
        expect(user!.data.isEmailVerified).toBe(true);
        expect(user!.data.hashedPassword).toBeDefined();
      }

      const found = await repo.getById(user!.id);
      expect(found).toEqual(user!);
    });
  });

  describe("getById", () => {
    it("should return null if user not found", async () => {
      const nonExistentUserId = Fixture.userId();
      const found = await repo.getById(nonExistentUserId);

      expect(found).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return an empty array if no users exist", async () => {
      const allUsers = await repo.getAll();

      expect(allUsers).toEqual([]);
    });

    it("should return all users", async () => {
      const user1 = Fixture.createUserBodyParams();
      const user2 = Fixture.thirdPartyUser("1");

      const created = await repo.insertLocal(user1);
      await repo.insertGithub(user2);

      const allUsers = await repo.getAll();

      expect(allUsers).toHaveLength(2);
    });
  });

  describe("findOne", () => {
    it("should find a local user by email", async () => {
      const userBodyParams = Fixture.createUserBodyParams();
      const created = await repo.insertLocal(userBodyParams);

      expect(created.data).toBeInstanceOf(LocalUser);
      if (created.data instanceof LocalUser) {
        expect(created.data.email).toBe(userBodyParams.email);
        expect(created.data.name).toBe(null);
        expect(created.data.isEmailVerified).toBe(false);
        expect(created.data.hashedPassword).toBeDefined();
      }

      const found = await repo.findOne(userBodyParams.email);
      expect(found).toEqual(created);
    });

    it("should find a github user by email", async () => {
      const thirdPartyUser = Fixture.thirdPartyUser("1");

      const created = await repo.insertGithub(thirdPartyUser);

      expect(created.data).toBeInstanceOf(ThirdPartyUser);
      if (created.data instanceof ThirdPartyUser) {
        expect(created.data).toEqual(thirdPartyUser);
      }

      expect(created.role).toBe(UserRole.USER);

      const found = await repo.findOne(thirdPartyUser.email()!);
      expect(found).toEqual(created);
    });

    it("should return null if user not found by email", async () => {
      const found = await repo.findOne("nonexistentemail@example.com");

      expect(found).toBeNull();
    });
  });

  describe("findByThirdPartyId", () => {
    it("should find a user by third-party ID", async () => {
      const thirdPartyUser = Fixture.thirdPartyUser("1");

      const created = await repo.insertGithub(thirdPartyUser);

      expect(created.data).toBeInstanceOf(ThirdPartyUser);
      if (created.data instanceof ThirdPartyUser) {
        expect(created.data).toEqual(thirdPartyUser);
      }

      expect(created.role).toBe(UserRole.USER);

      const foundByThirdPartyId = await repo.findByThirdPartyId(
        thirdPartyUser.id,
        thirdPartyUser.provider,
      );
      expect(foundByThirdPartyId).toEqual(created);
    });

    it("should return null if user not found by third-party ID", async () => {
      const nonExistentThirdPartyId = new ThirdPartyUserId("nonexistentid");
      const found = await repo.findByThirdPartyId(
        nonExistentThirdPartyId,
        Provider.Github,
      );

      expect(found).toBeNull();
    });
  });
});
