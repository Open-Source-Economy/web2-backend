import { setupTestDB } from "../../__helpers__/jest.setup";
import {
  LocalUser,
  Provider,
  ThirdPartyUser,
  UserRole,
} from "@open-source-economy/api-types";
import { Fixture } from "../../__helpers__/Fixture";
import { getUserRepository } from "../../../db";
import {
  BackendUser,
  isBackendLocalUser,
  isThirdPartyUser,
} from "../../../db/helpers/companions/user/backend-user.types";

// ThirdPartyUserId was removed from api-types; define locally for backward compat
type ThirdPartyUserId = string & { readonly __brand: "ThirdPartyUser" };

describe("UserRepository", () => {
  setupTestDB();

  const repo = getUserRepository();

  describe("insertLocal", () => {
    it("should create and return a local user", async () => {
      const userBody = Fixture.localUser();
      const created = await repo.insert(Fixture.createUser(userBody));
      const backendUser = created as BackendUser;

      expect(isBackendLocalUser(backendUser.data)).toBe(true);
      if (isBackendLocalUser(backendUser.data)) {
        expect(backendUser.data.email).toBe(userBody.email);
        expect(created.name).toBe(null);
        expect(backendUser.data.isEmailVerified).toBe(false);
        expect(backendUser.data.password).toBeDefined();
      }

      const found = await repo.getById(created.id);
      expect(found).toEqual(created);
    });
  });

  describe("insertGithub", () => {
    it("should create and return a Github user", async () => {
      const thirdPartyUser = Fixture.thirdPartyUser("1");

      const created = await repo.insert(Fixture.createUser(thirdPartyUser));
      const backendUser = created as BackendUser;

      expect(isThirdPartyUser(backendUser.data)).toBe(true);
      if (isThirdPartyUser(backendUser.data)) {
        expect(backendUser.data).toEqual(thirdPartyUser);
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

      await expect(
        repo.insert(Fixture.createUser(thirdPartyUser)),
      ).rejects.toThrow("Invalid provider, was expecting Github");
    });
  });

  describe("validateEmail", () => {
    it("should return null if user not found", async () => {
      const user = await repo.validateEmail("bonjour");
      expect(user).toBeNull();
    });

    it("should update the email", async () => {
      const userBody = Fixture.localUser();
      await repo.insert(Fixture.createUser(userBody));

      const user = await repo.validateEmail(userBody.email);

      expect(user).toBeDefined();
      const backendUser = user as BackendUser;
      expect(isBackendLocalUser(backendUser.data)).toBe(true);
      if (isBackendLocalUser(backendUser.data)) {
        expect(backendUser.data.email).toBe(userBody.email);
        expect(user!.name).toBe(null);
        expect(backendUser.data.isEmailVerified).toBe(true);
        expect(backendUser.data.password).toBeDefined();
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
      const user1 = Fixture.localUser();
      const user2 = Fixture.thirdPartyUser("1");

      const created = await repo.insert(Fixture.createUser(user1));
      await repo.insert(Fixture.createUser(user2));

      const allUsers = await repo.getAll();

      expect(allUsers).toHaveLength(2);
    });
  });

  describe("findOne", () => {
    it("should find a local user by email", async () => {
      const userBody = Fixture.localUser();
      const created = await repo.insert(Fixture.createUser(userBody));
      const backendUser = created as BackendUser;

      expect(isBackendLocalUser(backendUser.data)).toBe(true);
      if (isBackendLocalUser(backendUser.data)) {
        expect(backendUser.data.email).toBe(userBody.email);
        expect(created.name).toBe(null);
        expect(backendUser.data.isEmailVerified).toBe(false);
        expect(backendUser.data.password).toBeDefined();
      }

      const found = await repo.findOne(userBody.email);
      expect(found).toEqual(created);
    });

    it("should find a github user by email", async () => {
      const thirdPartyUser = Fixture.thirdPartyUser("1");

      const created = await repo.insert(Fixture.createUser(thirdPartyUser));
      const backendUser = created as BackendUser;

      expect(isThirdPartyUser(backendUser.data)).toBe(true);
      if (isThirdPartyUser(backendUser.data)) {
        expect(backendUser.data).toEqual(thirdPartyUser);
      }

      expect(created.role).toBe(UserRole.USER);

      const found = await repo.findOne(thirdPartyUser.email!);
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

      const created = await repo.insert(Fixture.createUser(thirdPartyUser));
      const backendUser = created as BackendUser;

      expect(isThirdPartyUser(backendUser.data)).toBe(true);
      if (isThirdPartyUser(backendUser.data)) {
        expect(backendUser.data).toEqual(thirdPartyUser);
      }

      expect(created.role).toBe(UserRole.USER);

      const foundByThirdPartyId = await repo.findByThirdPartyId(
        "1" as ThirdPartyUserId,
        thirdPartyUser.provider,
      );
      expect(foundByThirdPartyId).toEqual(created);
    });

    it("should return null if user not found by third-party ID", async () => {
      const nonExistentThirdPartyId = "nonexistentid" as ThirdPartyUserId;
      const found = await repo.findByThirdPartyId(
        nonExistentThirdPartyId,
        Provider.Github,
      );

      expect(found).toBeNull();
    });
  });
});
