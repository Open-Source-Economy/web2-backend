import { setupTestDB } from "../../__helpers__/jest.setup";

import { Fixture } from "../../__helpers__/Fixture";
import { RepositoryUserPermissionTokenId } from "../../../model";
import {
  ownerRepo,
  repositoryRepo,
  repositoryUserPermissionTokenRepo,
} from "../../../db";
import { CreateRepositoryUserPermissionTokenDto } from "../../../db/user/RepositoryUserPermissionToken.repository";

describe("RepositoryUserPermissionTokenRepository", () => {
  const tokenRepo = repositoryUserPermissionTokenRepo;

  setupTestDB();
  const ownerId = Fixture.ownerId();
  const repositoryId = Fixture.repositoryId(ownerId);

  beforeEach(async () => {
    await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));
    await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));
  });

  describe("create", () => {
    it("should create a new token record", async () => {
      const tokenBody =
        Fixture.createRepositoryUserPermissionTokenBody(repositoryId);

      const created = await tokenRepo.create(tokenBody);
      expect(created).toEqual(
        Fixture.repositoryUserPermissionTokenFromBody(created.id, tokenBody),
      );
    });

    it("should create a token with null userName", async () => {
      const tokenBody = {
        ...Fixture.createRepositoryUserPermissionTokenBody(repositoryId),
        userName: null,
      };

      const created = await tokenRepo.create(tokenBody);

      expect(created.userName).toBeNull();
    });

    it("should create a token with null userEmail", async () => {
      const tokenBody = {
        ...Fixture.createRepositoryUserPermissionTokenBody(repositoryId),
        userEmail: null,
      };

      const created = await tokenRepo.create(tokenBody);

      expect(created.userEmail).toBeNull();
    });

    it("should create a token with null dowCurrency", async () => {
      const tokenBody = {
        ...Fixture.createRepositoryUserPermissionTokenBody(repositoryId),
        dowCurrency: null,
      };

      const created = await tokenRepo.create(tokenBody);

      expect(created.dowCurrency).toBeNull();
    });

    it("should create a token with null dowRate", async () => {
      const tokenBody = {
        ...Fixture.createRepositoryUserPermissionTokenBody(repositoryId),
        dowRate: null,
      };

      const created = await tokenRepo.create(tokenBody);

      expect(created.dowRate).toBeNull();
    });
  });

  describe("update", () => {
    it("should update an existing token record", async () => {
      const tokenBody =
        Fixture.createRepositoryUserPermissionTokenBody(repositoryId);

      const created = await tokenRepo.create(tokenBody);

      const updatedTokenBody: CreateRepositoryUserPermissionTokenDto = {
        ...tokenBody,
        userGithubOwnerLogin: "updatedUser",
      };

      const updated = await tokenRepo.update(
        Fixture.repositoryUserPermissionTokenFromBody(
          created.id,
          updatedTokenBody,
        ),
      );

      expect(updated).toEqual(
        Fixture.repositoryUserPermissionTokenFromBody(
          created.id,
          updatedTokenBody,
        ),
      );
    });
  });

  describe("getById", () => {
    it("should return null if token not found", async () => {
      const nonExistentTokenId = new RepositoryUserPermissionTokenId(
        Fixture.uuid(),
      );
      const found = await tokenRepo.getById(nonExistentTokenId);
      expect(found).toBeNull();
    });

    it("should return token by id", async () => {
      const tokenBody =
        Fixture.createRepositoryUserPermissionTokenBody(repositoryId);

      const created = await tokenRepo.create(tokenBody);
      const found = await tokenRepo.getById(created.id);
      expect(found).toEqual(created);
    });
  });

  describe("getByRepositoryId", () => {
    it("should return tokens for a specific repository", async () => {
      const tokenBody =
        Fixture.createRepositoryUserPermissionTokenBody(repositoryId);

      await tokenRepo.create(tokenBody);
      const found = await tokenRepo.getByRepositoryId(repositoryId);
      expect(found.length).toBeGreaterThan(0);
      expect(found[0].repositoryId).toEqual(repositoryId);
    });
  });

  describe("getByToken", () => {
    it("should return token by token value", async () => {
      const tokenBody =
        Fixture.createRepositoryUserPermissionTokenBody(repositoryId);

      const created = await tokenRepo.create(tokenBody);
      const found = await tokenRepo.getByToken(created.token);
      expect(found).toEqual(created);
    });
  });

  describe("getAll", () => {
    it("should return all tokens", async () => {
      const tokenBody1 =
        Fixture.createRepositoryUserPermissionTokenBody(repositoryId);
      const tokenBody2 =
        Fixture.createRepositoryUserPermissionTokenBody(repositoryId);

      await tokenRepo.create(tokenBody1);
      await tokenRepo.create(tokenBody2);

      const allTokens = await tokenRepo.getAll();
      expect(allTokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("delete", () => {
    it("should delete a token by token value", async () => {
      const tokenBody =
        Fixture.createRepositoryUserPermissionTokenBody(repositoryId);

      const created = await tokenRepo.create(tokenBody);
      await tokenRepo.delete(created.token);

      const found = await tokenRepo.getByToken(created.token);
      expect(found).toBeNull();
    });
  });

  describe("setHasBeenUsed", () => {
    it("should mark a token as used", async () => {
      const tokenBody =
        Fixture.createRepositoryUserPermissionTokenBody(repositoryId);

      const created = await tokenRepo.create(tokenBody);
      expect(created.hasBeenUsed).toEqual(false);

      await tokenRepo.use(created.token);

      const updated = await tokenRepo.getByToken(created.token);
      expect(updated).not.toBeNull();
      expect(updated!.hasBeenUsed).toEqual(true);
    });
  });
});
