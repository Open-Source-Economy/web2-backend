import { Router } from "express";
import { OnboardingController } from "../../controllers/onboarding.controller";
import { isAuth } from "../../middlewares/isAuth";
import { validateBody, validateParams } from "../../middlewares/validation";
import {
  createProfileSchema,
  updateProfileSchema,
  setDeveloperSettingsSchema,
  setIncomeStreamsSchema,
  addRepositorySchema,
  updateDeveloperRightsSchema,
  createCustomServiceSchema,
  addDeveloperServiceSchema,
  updateDeveloperServiceSchema,
  paramIdSchema,
  githubOrgParamSchema,
  projectItemIdParamSchema,
} from "../../validation/onboarding.schemas";

const router = Router();

// Authentication required for all onboarding routes
router.use(isAuth);

// Profile management
router.post(
  "/profile",
  validateBody(createProfileSchema),
  OnboardingController.createProfile,
);
router.put(
  "/profile",
  validateBody(updateProfileSchema),
  OnboardingController.updateProfile,
);
router.get("/profile", OnboardingController.getDeveloperProfile);

// Developer settings
router.post(
  "/settings",
  validateBody(setDeveloperSettingsSchema),
  OnboardingController.setDeveloperSettings,
);

// Income streams (Step 3)
router.post(
  "/income-streams",
  validateBody(setIncomeStreamsSchema),
  OnboardingController.setIncomeStreams,
);

// Repository management
router.post(
  "/repositories",
  validateBody(addRepositorySchema),
  OnboardingController.addRepository,
);
router.delete(
  "/repositories/:projectItemId",
  validateParams(projectItemIdParamSchema),
  OnboardingController.removeRepository,
);
router.get("/repositories", OnboardingController.getRepositories);

// GitHub integration
router.get(
  "/github/organizations",
  OnboardingController.getGithubOrganizations,
);
router.get(
  "/github/organizations/:org/repositories",
  validateParams(githubOrgParamSchema),
  OnboardingController.getGithubRepositories,
);
router.get(
  "/github/user/repositories",
  OnboardingController.getUserGithubRepositories,
);

// Developer rights management
router.put(
  "/rights/:id",
  validateParams(paramIdSchema),
  validateBody(updateDeveloperRightsSchema),
  OnboardingController.updateDeveloperRights,
);

// Service management
router.get("/services", OnboardingController.getServices);
router.post(
  "/custom-services",
  validateBody(createCustomServiceSchema),
  OnboardingController.createCustomService,
);
router.post(
  "/developer-services",
  validateBody(addDeveloperServiceSchema),
  OnboardingController.addDeveloperService,
);
router.put(
  "/developer-services/:id",
  validateParams(paramIdSchema),
  validateBody(updateDeveloperServiceSchema),
  OnboardingController.updateDeveloperService,
);
router.delete(
  "/developer-services/:id",
  validateParams(paramIdSchema),
  OnboardingController.deleteDeveloperService,
);

// Complete onboarding
router.post("/complete", OnboardingController.completeOnboarding);

export default router;
