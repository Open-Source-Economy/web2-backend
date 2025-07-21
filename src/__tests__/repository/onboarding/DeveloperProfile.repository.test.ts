import { setupTestDB } from "../../__helpers__/jest.setup";
import { getDeveloperProfileRepository } from "../../../db/onboarding";
import { CreateDeveloperProfileDto } from "../../../api/dto/onboarding";
import { v4 as uuidv4 } from 'uuid';

describe("DeveloperProfileRepository", () => {
  const developerProfileRepo = getDeveloperProfileRepository();

  setupTestDB();

  const validUserId = uuidv4();

  const createValidProfileDto = (): CreateDeveloperProfileDto => ({
    name: "John Developer",
    email: "john@example.com",
    githubUsername: "johndeveloper",
    termsAccepted: true,
  });

  describe("create", () => {
    it("should create a developer profile successfully", async () => {
      const profileDto = createValidProfileDto();

      const created = await developerProfileRepo.create(profileDto, validUserId);

      expect(created.name).toBe(profileDto.name);
      expect(created.email).toBe(profileDto.email);
      expect(created.githubUsername).toBe(profileDto.githubUsername);
      expect(created.termsAccepted).toBe(true);
      expect(created.onboardingCompleted).toBe(false);
      expect(created.userId.uuid).toBe(validUserId);
    });

    it("should create a developer profile without GitHub username", async () => {
      const profileDto: CreateDeveloperProfileDto = {
        name: "Jane Developer",
        email: "jane@example.com",
        termsAccepted: true,
      };

      const created = await developerProfileRepo.create(profileDto, validUserId);

      expect(created.name).toBe(profileDto.name);
      expect(created.email).toBe(profileDto.email);
      expect(created.githubUsername).toBe(null);
      expect(created.termsAccepted).toBe(true);
    });
  });

  describe("getByUserId", () => {
    it("should return null when profile does not exist", async () => {
      const nonExistentUserId = uuidv4();

      const profile = await developerProfileRepo.getByUserId(nonExistentUserId);

      expect(profile).toBeNull();
    });

    it("should return profile when it exists", async () => {
      const profileDto = createValidProfileDto();
      const created = await developerProfileRepo.create(profileDto, validUserId);

      const found = await developerProfileRepo.getByUserId(validUserId);

      expect(found).not.toBeNull();
      expect(found!.id.uuid).toBe(created.id.uuid);
      expect(found!.name).toBe(profileDto.name);
      expect(found!.email).toBe(profileDto.email);
    });
  });

  describe("update", () => {
    it("should update profile fields", async () => {
      const profileDto = createValidProfileDto();
      const created = await developerProfileRepo.create(profileDto, validUserId);

      const updates = {
        name: "Updated Name",
        email: "updated@example.com",
      };

      const updated = await developerProfileRepo.update(created.id.uuid, updates);

      expect(updated.name).toBe(updates.name);
      expect(updated.email).toBe(updates.email);
      expect(updated.githubUsername).toBe(profileDto.githubUsername); // unchanged
    });
  });

  describe("markCompleted", () => {
    it("should mark onboarding as completed", async () => {
      const profileDto = createValidProfileDto();
      const created = await developerProfileRepo.create(profileDto, validUserId);

      await developerProfileRepo.markCompleted(created.id.uuid);

      const updated = await developerProfileRepo.getById(created.id.uuid);

      expect(updated!.onboardingCompleted).toBe(true);
    });
  });
});