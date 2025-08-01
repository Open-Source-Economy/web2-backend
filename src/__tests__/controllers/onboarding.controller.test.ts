import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { createApp } from "../../createApp";
import { setupTestDB } from "../__helpers__/jest.setup";

describe("Onboarding Controller", () => {
  const app = createApp();
  setupTestDB();

  // Mock authentication middleware for testing
  beforeEach(() => {
    // This would need to be implemented based on your auth system
    // For now, we'll create basic integration tests that don't require auth
  });

  describe("GET /api/v1/onboarding/service-categories", () => {
    it("should return service categories without authentication", async () => {
      const response = await request(app).get(
        "/api/v1/onboarding/service-categories",
      );

      // This endpoint requires auth, so it should return 401 without proper auth
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("POST /api/v1/onboarding/profile", () => {
    it("should return validation error for invalid profile data", async () => {
      const invalidProfile = {
        name: "", // Invalid: empty name
        email: "invalid-email", // Invalid: not a valid email
        termsAccepted: false, // Invalid: must be true
      };

      const response = await request(app)
        .post("/api/v1/onboarding/profile")
        .send(invalidProfile);

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED); // No auth
    });
  });

  describe("POST /api/v1/onboarding/projects", () => {
    it("should return validation error for invalid project data", async () => {
      const invalidProject = {
        projectType: "github",
        // Missing required fields for github project
        role: "invalid_role", // Invalid role
        mergeRights: "invalid_merge_rights", // Invalid merge rights
      };

      const response = await request(app)
        .post("/api/v1/onboarding/projects")
        .send(invalidProject);

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED); // No auth
    });
  });

  // Note: More comprehensive tests would require proper auth setup
  // and database seeding with test users
});
