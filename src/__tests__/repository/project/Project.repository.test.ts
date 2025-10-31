import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import { OwnerId, ProjectUtils } from "@open-source-economy/api-types";
import { ownerRepo, projectRepo, repositoryRepo } from "../../../db";

describe("ProjectRepository", () => {
  setupTestDB();

  describe("createOrUpdate", () => {
    describe("insert", () => {
      it("should work with owner-only project", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const project = Fixture.project(ownerId);
        const created = await projectRepo.createOrUpdate(project);
        expect(created).toEqual(project);

        const found = await projectRepo.getById(project.id);
        expect(found).toEqual(project);
      });

      it("should work with repository project", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const repositoryId = Fixture.repositoryId(ownerId);
        await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

        const project = Fixture.project(repositoryId);
        const created = await projectRepo.createOrUpdate(project);
        expect(created).toEqual(project);

        const found = await projectRepo.getById(project.id);
        expect(found).toEqual(project);
      });

      it("should work with undefined ecosystem", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const project = Fixture.project(ownerId); // No ecosystem provided
        const created = await projectRepo.createOrUpdate(project);
        expect(created).toEqual(project);

        const found = await projectRepo.getById(project.id);
        expect(found).toEqual(project);
      });

      it("should fail with foreign key constraint error if owner is not inserted", async () => {
        const ownerId = Fixture.ownerId();
        const project = Fixture.project(ownerId);

        try {
          await projectRepo.createOrUpdate(project);
          fail(
            "Expected foreign key constraint violation, but no error was thrown.",
          );
        } catch (error: any) {
          expect(error.message).toMatch(/violates foreign key constraint/);
        }
      });

      it("should fail with foreign key constraint error if repository is not inserted", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const repositoryId = Fixture.repositoryId(ownerId);
        const project = Fixture.project(repositoryId);

        try {
          await projectRepo.createOrUpdate(project);
          fail(
            "Expected foreign key constraint violation, but no error was thrown.",
          );
        } catch (error: any) {
          expect(error.message).toMatch(/violates foreign key constraint/);
        }
      });
    });

    describe("update", () => {
      it("should work for owner-only project", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const project = Fixture.project(ownerId);
        await projectRepo.createOrUpdate(project);

        const updatedProject = Fixture.project(ownerId);
        const updated = await projectRepo.createOrUpdate(updatedProject);
        expect(updated).toEqual(updatedProject);

        const found = await projectRepo.getById(project.id);
        expect(found).toEqual(updatedProject);
      });

      it("should work for repository project", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const repositoryId = Fixture.repositoryId(ownerId);
        await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

        const project = Fixture.project(repositoryId);
        await projectRepo.createOrUpdate(project);

        const updatedProject = Fixture.project(repositoryId);
        const updated = await projectRepo.createOrUpdate(updatedProject);
        expect(updated).toEqual(updatedProject);

        const found = await projectRepo.getById(project.id);
        expect(found).toEqual(updatedProject);
      });

      it("should work when updating from undefined to defined ecosystem", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const project = Fixture.project(ownerId); // No ecosystem
        await projectRepo.createOrUpdate(project);

        const updatedProject = Fixture.project(ownerId);
        const updated = await projectRepo.createOrUpdate(updatedProject);
        expect(updated).toEqual(updatedProject);

        const found = await projectRepo.getById(project.id);
        expect(found).toEqual(updatedProject);
      });
    });
  });

  describe("getById", () => {
    it("should return null if project not found", async () => {
      const ownerId = Fixture.ownerId();
      const projectId = ProjectUtils.getId(ownerId.login);

      const found = await projectRepo.getById(projectId);
      expect(found).toBeNull();
    });

    it("should find owner-only project by OwnerId", async () => {
      const ownerId = Fixture.ownerId();
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

      const project = Fixture.project(ownerId);
      await projectRepo.createOrUpdate(project);

      const found = await projectRepo.getById(ownerId);
      expect(found).toEqual(project);
    });

    it("should find repository project by RepositoryId", async () => {
      const ownerId = Fixture.ownerId();
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

      const repositoryId = Fixture.repositoryId(ownerId);
      await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

      const project = Fixture.project(repositoryId);
      await projectRepo.createOrUpdate(project);

      const found = await projectRepo.getById(repositoryId);
      expect(found).toEqual(project);
    });

    it("should succeed when github ids are not given", async () => {
      const ownerId = Fixture.ownerId();
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

      const project = Fixture.project(ownerId);
      await projectRepo.createOrUpdate(project);

      const undefinedOwnerId = new OwnerId(ownerId.login, undefined);
      const found = await projectRepo.getById(undefinedOwnerId);
      expect(found).toEqual(project);
    });
  });

  describe("getAll", () => {
    it("should return all projects", async () => {
      const ownerId1 = Fixture.ownerId();
      const ownerId2 = Fixture.ownerId();
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId1));
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId2));

      const repositoryId = Fixture.repositoryId(ownerId1);
      await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

      const project1 = Fixture.project(ownerId1);
      const project2 = Fixture.project(ownerId2);
      const project3 = Fixture.project(repositoryId);

      await projectRepo.createOrUpdate(project1);
      await projectRepo.createOrUpdate(project2);
      await projectRepo.createOrUpdate(project3);

      const allProjects = await projectRepo.getAll();

      expect(allProjects).toHaveLength(3);
      expect(allProjects).toContainEqual(project1);
      expect(allProjects).toContainEqual(project2);
      expect(allProjects).toContainEqual(project3);
    });

    it("should return an empty array if no projects exist", async () => {
      const allProjects = await projectRepo.getAll();
      expect(allProjects).toEqual([]);
    });
  });
});
