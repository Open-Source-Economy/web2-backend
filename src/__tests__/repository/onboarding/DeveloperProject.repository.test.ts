import { setupTestDB } from "../../__helpers__/jest.setup";
import {
  getDeveloperProfileRepository,
  getDeveloperProjectRepository,
} from "../../../db/onboarding";
import {
  CreateDeveloperProfileDto,
  AddProjectDto,
} from "../../../api/dto/onboarding";
import { v4 as uuidv4 } from "uuid";

describe("DeveloperProjectRepository", () => {
  const developerProfileRepo = getDeveloperProfileRepository();
  const developerProjectRepo = getDeveloperProjectRepository();

  setupTestDB();

  const validUserId = uuidv4();
  let profileId: string;

  beforeEach(async () => {
    const profileDto: CreateDeveloperProfileDto = {
      name: "Test Developer",
      email: "test@example.com",
      termsAccepted: true,
    };
    const profile = await developerProfileRepo.create(profileDto, validUserId);
    profileId = profile.id.uuid;
  });

  const createGithubProjectDto = (): AddProjectDto => ({
    projectType: "github",
    githubOrg: "test-org",
    githubRepo: "test-repo",
    role: "core_developer",
    mergeRights: "specific_areas",
  });

  const createManualProjectDto = (): AddProjectDto => ({
    projectType: "manual",
    projectName: "My Awesome Project",
    projectUrl: "https://github.com/user/awesome-project",
    role: "creator_founder",
    mergeRights: "full_rights",
  });

  describe("create", () => {
    it("should create a GitHub project successfully", async () => {
      const projectDto = createGithubProjectDto();

      const created = await developerProjectRepo.create(projectDto, profileId);

      expect(created.projectType).toBe("github");
      expect(created.githubOrg).toBe(projectDto.githubOrg);
      expect(created.githubRepo).toBe(projectDto.githubRepo);
      expect(created.projectName).toBe(null);
      expect(created.projectUrl).toBe(null);
      expect(created.role).toBe(projectDto.role);
      expect(created.mergeRights).toBe(projectDto.mergeRights);
    });

    it("should create a manual project successfully", async () => {
      const projectDto = createManualProjectDto();

      const created = await developerProjectRepo.create(projectDto, profileId);

      expect(created.projectType).toBe("manual");
      expect(created.githubOrg).toBe(null);
      expect(created.githubRepo).toBe(null);
      expect(created.projectName).toBe(projectDto.projectName);
      expect(created.projectUrl).toBe(projectDto.projectUrl);
      expect(created.role).toBe(projectDto.role);
      expect(created.mergeRights).toBe(projectDto.mergeRights);
    });
  });

  describe("getByProfileId", () => {
    it("should return empty array when no projects exist", async () => {
      const projects = await developerProjectRepo.getByProfileId(profileId);

      expect(projects).toEqual([]);
    });

    it("should return all projects for a profile", async () => {
      const githubProject = createGithubProjectDto();
      const manualProject = createManualProjectDto();

      await developerProjectRepo.create(githubProject, profileId);
      await developerProjectRepo.create(manualProject, profileId);

      const projects = await developerProjectRepo.getByProfileId(profileId);

      expect(projects).toHaveLength(2);
      expect(projects.find((p) => p.projectType === "github")).toBeDefined();
      expect(projects.find((p) => p.projectType === "manual")).toBeDefined();
    });
  });

  describe("update", () => {
    it("should update project role and merge rights", async () => {
      const projectDto = createGithubProjectDto();
      const created = await developerProjectRepo.create(projectDto, profileId);

      const updates = {
        role: "project_lead" as const,
        mergeRights: "full_rights" as const,
      };

      const updated = await developerProjectRepo.update(
        created.id.uuid,
        updates,
      );

      expect(updated.role).toBe(updates.role);
      expect(updated.mergeRights).toBe(updates.mergeRights);
      expect(updated.githubOrg).toBe(projectDto.githubOrg); // unchanged
      expect(updated.githubRepo).toBe(projectDto.githubRepo); // unchanged
    });
  });

  describe("delete", () => {
    it("should delete a project successfully", async () => {
      const projectDto = createGithubProjectDto();
      const created = await developerProjectRepo.create(projectDto, profileId);

      await developerProjectRepo.delete(created.id.uuid);

      const found = await developerProjectRepo.getById(created.id.uuid);
      expect(found).toBeNull();
    });
  });
});
