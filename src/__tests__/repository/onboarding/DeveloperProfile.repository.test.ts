import { setupTestDB } from "../../__helpers__/jest.setup";
import { getDeveloperProfileRepository } from "../../../db/onboarding";
import { CreateDeveloperProfileDto } from "../../../api/dto/onboarding";
import { v4 as uuidv4 } from 'uuid';
import { pool } from "../../../dbPool";
import { beforeEach } from "@jest/globals";

describe("DeveloperProfileRepository", () => {
  const developerProfileRepo = getDeveloperProfileRepository();

  setupTestDB();

  let validUserId: string;

  beforeEach(async () => {
    // Create a valid user first
    validUserId = uuidv4();
    await pool.query(
      `INSERT INTO app_user (id, name, email, is_email_verified, role) 
       VALUES ($1, $2, $3, $4, $5)`,
      [validUserId, 'Test User', 'test@example.com', true, 'user']
    );
  });

  const createValidProfileDto = (): CreateDeveloperProfileDto => ({
    // All user fields (name, email, githubUsername, termsAccepted) are now in app_user
    // This DTO is now empty but kept for future developer-specific fields
  });

  describe("create", () => {
    it("should create a developer profile successfully", async () => {
      const profileDto = createValidProfileDto();

      const created = await developerProfileRepo.create(profileDto, validUserId);

      expect(created.onboardingCompleted).toBe(false);
      expect(created.userId.uuid).toBe(validUserId);
    });

    it("should create a developer profile with minimal data", async () => {
      const profileDto: CreateDeveloperProfileDto = {
        // All user fields now in app_user
      };

      const created = await developerProfileRepo.create(profileDto, validUserId);

      expect(created.onboardingCompleted).toBe(false);
      expect(created.userId.uuid).toBe(validUserId);
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
      expect(found!.userId.uuid).toBe(validUserId);
    });
  });

  describe("update", () => {
    it("should update profile (only timestamp since user fields moved to app_user)", async () => {
      const profileDto = createValidProfileDto();
      const created = await developerProfileRepo.create(profileDto, validUserId);

      const updates = {
        // All user fields now in app_user
      };

      const updated = await developerProfileRepo.update(created.id.uuid, updates);

      expect(updated.id.uuid).toBe(created.id.uuid);
      expect(updated.userId.uuid).toBe(validUserId);
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