import { setupTestDB } from "../../__helpers__/jest.setup";
import { OwnerId, RepositoryId } from "../../../api/model";
import { Fixture } from "../../__helpers__/Fixture";
import { ownerRepo, repositoryRepo } from "../../../db";

describe("RepositoryRepository", () => {
  setupTestDB();
  describe("insertOrUpdate", () => {
    describe("insert", () => {
      it("should work", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const repositoryId = Fixture.repositoryId(ownerId);
        const repository = Fixture.repository(repositoryId);
        const created = await repositoryRepo.insertOrUpdate(repository);

        expect(created).toEqual(repository);

        const found = await repositoryRepo.getById(repository.id);
        expect(found).toEqual(repository);
      });

      it("should fail with foreign key constraint error if owner is not inserted", async () => {
        const ownerId = Fixture.ownerId();
        const repositoryId = Fixture.repositoryId(ownerId); // OwnerId that does not exist in the database

        const repository = Fixture.repository(repositoryId);

        try {
          await repositoryRepo.insertOrUpdate(repository);
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

    describe("update", () => {
      it("should work", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const repositoryId = Fixture.repositoryId(ownerId);
        const repository = Fixture.repository(repositoryId);
        await repositoryRepo.insertOrUpdate(repository);

        const updatedRepository = Fixture.repository(
          repositoryId,
          "updated-payload",
        );
        const updated = await repositoryRepo.insertOrUpdate(updatedRepository);

        expect(updated).toEqual(updatedRepository);

        const found = await repositoryRepo.getById(repository.id);
        expect(found).toEqual(updatedRepository);
      });
    });
  });

  describe("getById", () => {
    it("should return null if repository not found", async () => {
      const ownerId = Fixture.ownerId();
      const nonExistentRepoId = Fixture.repositoryId(ownerId);
      const found = await repositoryRepo.getById(nonExistentRepoId);

      expect(found).toBeNull();
    });

    it("succeed when github ids are not given", async () => {
      const ownerId = Fixture.ownerId();
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

      const repositoryId = Fixture.repositoryId(ownerId);
      const repository = Fixture.repository(repositoryId);
      await repositoryRepo.insertOrUpdate(repository);

      const undefinedOwnerId = new OwnerId(ownerId.login, undefined);
      const undefinedRepositoryId = new RepositoryId(
        undefinedOwnerId,
        repositoryId.name,
        undefined,
      );

      const found = await repositoryRepo.getById(undefinedRepositoryId);
      expect(found).toEqual(repository);
    });
  });

  describe("getAll", () => {
    it("should return all repositories", async () => {
      const ownerId1 = Fixture.ownerId();
      const ownerId2 = Fixture.ownerId();

      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId1));
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId2));

      const repositoryId1 = Fixture.repositoryId(ownerId1);
      const repositoryId2 = Fixture.repositoryId(ownerId2);
      const repo1 = Fixture.repository(repositoryId1, "payload1");
      const repo2 = Fixture.repository(repositoryId2, "payload2");

      await repositoryRepo.insertOrUpdate(repo1);
      await repositoryRepo.insertOrUpdate(repo2);

      const allRepos = await repositoryRepo.getAll();

      expect(allRepos).toHaveLength(2);
      expect(allRepos).toContainEqual(repo1);
      expect(allRepos).toContainEqual(repo2);
    });

    it("should return an empty array if no repositories exist", async () => {
      const allRepos = await repositoryRepo.getAll();

      expect(allRepos).toEqual([]);
    });
  });
});
