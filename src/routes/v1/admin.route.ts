import { Router } from "express";
import { AdminController } from "../../controllers";
import { authenticatedSuperAdmin, authenticatedUser } from "../../middlewares";
import * as dto from "@open-source-economy/api-types";
import Joi from "joi";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validation";

const router = Router();

// All admin routes require authentication
router.use(authenticatedUser);

// All admin routes require SUPER_ADMIN role
router.use(authenticatedSuperAdmin);

// Get all developer profiles (with optional filters)
router.get(
  "/profiles",
  validateParams(dto.GetAllDeveloperProfilesCompanion.paramsSchema),
  validateQuery(dto.GetAllDeveloperProfilesCompanion.querySchema),
  AdminController.getAllDeveloperProfiles,
);

// Get a single developer profile by GitHub username (admin only)
router.get(
  "/developer-profile/:githubUsername",
  validateParams(Joi.object({ githubUsername: Joi.string().required() })),
  validateQuery(dto.GetDeveloperProfileCompanion.querySchema),
  AdminController.getDeveloperProfile,
);

// Create verification record (for both profiles and project items)
router.post(
  "/verification-record",
  validateParams(dto.CreateVerificationRecordCompanion.paramsSchema),
  validateBody(dto.CreateVerificationRecordCompanion.bodySchema),
  validateQuery(dto.CreateVerificationRecordCompanion.querySchema),
  AdminController.createVerificationRecord,
);

// Sync all repositories from a GitHub organization
router.post(
  "/organizations/:projectItemId/sync-repositories",
  validateParams(dto.SyncOrganizationRepositoriesCompanion.paramsSchema),
  validateBody(dto.SyncOrganizationRepositoriesCompanion.bodySchema),
  validateQuery(dto.SyncOrganizationRepositoriesCompanion.querySchema),
  AdminController.syncOrganizationRepositories as any,
);

export default router;
