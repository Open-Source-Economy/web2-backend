import { Router } from "express";
import { AdminController } from "../../controllers";
import { authenticatedSuperAdmin, authenticatedUser } from "../../middlewares";
import * as dto from "@open-source-economy/api-types";
import Joi from "joi";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validation";

const router = Router();

// All admin routes require authentication
router.use(authenticatedUser);

// All admin routes require SUPER_ADMIN role
router.use(authenticatedSuperAdmin);

// Get all developer profiles (with optional filters)
router.get(
  "/profiles",
  validateParams(dto.getAllDeveloperProfilesEndpoint.pathParams as any),
  validateQuery(dto.getAllDeveloperProfilesEndpoint.query as any),
  AdminController.getAllDeveloperProfiles
);

// Get a single developer profile by GitHub username (admin only)
router.get(
  "/developer-profile/:githubUsername",
  validateParams(Joi.object({ githubUsername: Joi.string().required() })),
  validateQuery(dto.getDeveloperProfileEndpoint.query as any),
  AdminController.getDeveloperProfile
);

// Create verification record (for both profiles and project items)
router.post(
  "/verification-record",
  validateParams(dto.createVerificationRecordEndpoint.pathParams as any),
  validateBody(dto.createVerificationRecordEndpoint.body as any),
  validateQuery(dto.createVerificationRecordEndpoint.query as any),
  AdminController.createVerificationRecord
);

// Sync all repositories from a GitHub organization
router.post(
  "/organizations/:projectItemId/sync-repositories",
  validateParams(dto.syncOrganizationRepositoriesEndpoint.pathParams as any),
  validateBody(dto.syncOrganizationRepositoriesEndpoint.body as any),
  validateQuery(dto.syncOrganizationRepositoriesEndpoint.query as any),
  AdminController.syncOrganizationRepositories as any
);

export default router;
