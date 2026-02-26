import { Router } from "express";
import { OnboardingController } from "../../controllers/onboarding.controller";
import {
  authenticatedDeveloperProfileUser,
  authenticatedUser,
} from "../../middlewares";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validation";
import * as dto from "@open-source-economy/api-types";

const router = Router();

// --- Profile management ---

// Route to create a developer profile
router.post(
  "/profile",
  validateParams(dto.createProfileEndpoint.pathParams as any),
  validateBody(dto.createProfileEndpoint.body as any),
  validateQuery(dto.createProfileEndpoint.query as any),
  authenticatedUser, // Only user authentication needed to create profile
  OnboardingController.createProfile,
);

// Route to get a developer's full profile
router.get(
  "/profile",
  validateParams(dto.getDeveloperProfileEndpoint.pathParams as any),
  validateQuery(dto.getDeveloperProfileEndpoint.query as any),
  authenticatedUser, // Only user authentication needed to create profile
  OnboardingController.getDeveloperProfile,
);

// All subsequent routes require an authenticated developer profile
router.use(authenticatedDeveloperProfileUser);

// Route to update developer contact information
router.put(
  "/profile/contact-infos",
  validateParams(dto.updateContactInfosEndpoint.pathParams as any),
  validateBody(dto.updateContactInfosEndpoint.body as any),
  validateQuery(dto.updateContactInfosEndpoint.query as any),
  OnboardingController.updateContactInfos,
);

// --- Settings management ---

// Route to set a developer's preferences (income streams and community supporter)
router.put(
  "/settings/preferences",
  validateParams(dto.setDeveloperPreferencesEndpoint.pathParams as any),
  validateBody(dto.setDeveloperPreferencesEndpoint.body as any),
  validateQuery(dto.setDeveloperPreferencesEndpoint.query as any),
  OnboardingController.setDeveloperPreferences,
);

// Route to set developer service settings (e.g., hourly commitment, availability)
router.put(
  "/settings/services",
  validateParams(dto.setDeveloperServiceSettingsEndpoint.pathParams as any),
  validateBody(dto.setDeveloperServiceSettingsEndpoint.body as any),
  validateQuery(dto.setDeveloperServiceSettingsEndpoint.query as any),
  OnboardingController.setDeveloperServiceSettings,
);

// Route to get potential project items for the developer
router.get(
  "/projects/potential",
  validateParams(dto.getPotentialProjectItemsEndpoint.pathParams as any),
  validateQuery(dto.getPotentialProjectItemsEndpoint.query as any),
  OnboardingController.getPotentialProjectsItems,
);

// Route to add or update a developer's project item
router.post(
  // Using POST for upsert, as it can create new resources
  "/projects",
  validateParams(dto.upsertDeveloperProjectItemEndpoint.pathParams as any),
  validateBody(dto.upsertDeveloperProjectItemEndpoint.body as any),
  validateQuery(dto.upsertDeveloperProjectItemEndpoint.query as any),
  OnboardingController.upsertProjectProjectItem,
);

// Route to remove a developer's project item
router.delete(
  "/projects",
  validateParams(dto.removeDeveloperProjectItemEndpoint.pathParams as any),
  validateQuery(dto.removeDeveloperProjectItemEndpoint.query as any),
  OnboardingController.removeProjectProjectItem as any,
);

// --- Service management ---

// Route to get the hierarchy of all available services
router.get(
  "/services/hierarchy",
  validateParams(dto.getServiceHierarchyEndpoint.pathParams as any),
  validateQuery(dto.getServiceHierarchyEndpoint.query as any),
  OnboardingController.getServiceHierarchy,
);

// Route to create a custom service
router.post(
  "/services/custom",
  validateParams(dto.createCustomServiceEndpoint.pathParams as any),
  validateBody(dto.createCustomServiceEndpoint.body as any),
  validateQuery(dto.createCustomServiceEndpoint.query as any),
  OnboardingController.createCustomService,
);

// Route to add or update a developer's service offering
router.put(
  "/services",
  validateParams(dto.upsertDeveloperServiceEndpoint.pathParams as any),
  validateBody(dto.upsertDeveloperServiceEndpoint.body as any),
  validateQuery(dto.upsertDeveloperServiceEndpoint.query as any),
  OnboardingController.upsertDeveloperService,
);

router.post(
  "/services/batch",
  validateParams(dto.upsertDeveloperServicesEndpoint.pathParams as any),
  validateBody(dto.upsertDeveloperServicesEndpoint.body as any),
  validateQuery(dto.upsertDeveloperServicesEndpoint.query as any),
  OnboardingController.upsertDeveloperServices, // TODO: improve type safety, if changed to "OnboardingController.upsertDeveloperService" no compile error
);

router.delete(
  "/services",
  validateParams(dto.deleteDeveloperServiceEndpoint.pathParams as any),
  validateQuery(dto.deleteDeveloperServiceEndpoint.query as any),
  OnboardingController.deleteDeveloperService as any,
);

// --- Onboarding completion ---

// Route to mark the onboarding process as complete for a developer
router.post(
  "/complete",
  validateParams(dto.completeOnboardingEndpoint.pathParams as any),
  validateBody(dto.completeOnboardingEndpoint.body as any),
  validateQuery(dto.completeOnboardingEndpoint.query as any),
  OnboardingController.completeOnboarding,
);

export default router;
