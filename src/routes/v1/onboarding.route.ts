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
  validateParams(dto.CreateDeveloperProfileCompanion.paramsSchema),
  validateBody(dto.CreateDeveloperProfileCompanion.bodySchema),
  validateQuery(dto.CreateDeveloperProfileCompanion.querySchema),
  authenticatedUser, // Only user authentication needed to create profile
  OnboardingController.createProfile,
);

// Route to get a developer's full profile
router.get(
  "/profile",
  validateParams(dto.GetDeveloperProfileCompanion.paramsSchema),
  validateQuery(dto.GetDeveloperProfileCompanion.querySchema),
  authenticatedUser, // Only user authentication needed to create profile
  OnboardingController.getDeveloperProfile,
);

// All subsequent routes require an authenticated developer profile
router.use(authenticatedDeveloperProfileUser);

// Route to update developer contact information
router.put(
  "/profile/contact-infos",
  validateParams(dto.UpdateDeveloperContactInfosCompanion.paramsSchema),
  validateBody(dto.UpdateDeveloperContactInfosCompanion.bodySchema),
  validateQuery(dto.UpdateDeveloperContactInfosCompanion.querySchema),
  OnboardingController.updateContactInfos,
);

// --- Settings management ---

// Route to set a developer's income streams
router.put(
  "/settings/income-streams",
  validateParams(dto.SetDeveloperIncomeStreamsCompanion.paramsSchema),
  validateBody(dto.SetDeveloperIncomeStreamsCompanion.bodySchema),
  validateQuery(dto.SetDeveloperIncomeStreamsCompanion.querySchema),
  OnboardingController.setDeveloperIncomeStreams,
);

// Route to set developer service settings (e.g., hourly commitment, availability)
router.put(
  "/settings/services",
  validateParams(dto.SetDeveloperServiceSettingsCompanion.paramsSchema),
  validateBody(dto.SetDeveloperServiceSettingsCompanion.bodySchema),
  validateQuery(dto.SetDeveloperServiceSettingsCompanion.querySchema),
  OnboardingController.setDeveloperServiceSettings,
);

// Route to get potential project items for the developer
router.get(
  "/projects/potential",
  validateParams(dto.GetPotentialDeveloperProjectItemsCompanion.paramsSchema),
  validateQuery(dto.GetPotentialDeveloperProjectItemsCompanion.querySchema),
  OnboardingController.getPotentialProjectsItems,
);

// Route to add or update a developer's project item
router.post(
  // Using POST for upsert, as it can create new resources
  "/projects",
  validateParams(dto.UpsertDeveloperProjectItemCompanion.paramsSchema),
  validateBody(dto.UpsertDeveloperProjectItemCompanion.bodySchema),
  validateQuery(dto.UpsertDeveloperProjectItemCompanion.querySchema),
  OnboardingController.upsertProjectProjectItem,
);

// Route to remove a developer's project item
router.delete(
  "/projects",
  validateParams(dto.RemoveDeveloperProjectItemCompanion.paramsSchema),
  validateBody(dto.RemoveDeveloperProjectItemCompanion.bodySchema),
  validateQuery(dto.RemoveDeveloperProjectItemCompanion.querySchema),
  OnboardingController.removeProjectProjectItem,
);

// --- Service management ---

// Route to get the hierarchy of all available services
router.get(
  "/services/hierarchy",
  validateParams(dto.GetServiceHierarchyCompanion.paramsSchema),
  validateQuery(dto.GetServiceHierarchyCompanion.querySchema),
  OnboardingController.getServiceHierarchy,
);

// Route to create a custom service
router.post(
  "/services/custom",
  validateParams(dto.CreateCustomServiceCompanion.paramsSchema),
  validateBody(dto.CreateCustomServiceCompanion.bodySchema),
  validateQuery(dto.CreateCustomServiceCompanion.querySchema),
  OnboardingController.createCustomService,
);

// Route to add or update a developer's service offering
router.put(
  // Using PUT for upsert (idempotent update/create)
  "/services",
  validateParams(dto.UpsertDeveloperServiceCompanion.paramsSchema),
  validateBody(dto.UpsertDeveloperServiceCompanion.bodySchema),
  validateQuery(dto.UpsertDeveloperServiceCompanion.querySchema),
  OnboardingController.upsertDeveloperService,
);

// Route to delete a developer's service offering
router.delete(
  "/services",
  validateParams(dto.DeleteDeveloperServiceCompanion.paramsSchema),
  validateBody(dto.DeleteDeveloperServiceCompanion.bodySchema), // DELETE with body for serviceId
  validateQuery(dto.DeleteDeveloperServiceCompanion.querySchema),
  OnboardingController.deleteDeveloperService,
);

// --- Onboarding completion ---

// Route to mark the onboarding process as complete for a developer
router.post(
  "/complete",
  validateParams(dto.CompleteOnboardingCompanion.paramsSchema),
  validateBody(dto.CompleteOnboardingCompanion.bodySchema),
  validateQuery(dto.CompleteOnboardingCompanion.querySchema),
  OnboardingController.completeOnboarding,
);

export default router;
