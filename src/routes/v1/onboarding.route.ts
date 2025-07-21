import { Router } from "express";
import { OnboardingController } from "../../controllers/onboarding.controller";
import { isAuth } from "../../middlewares/isAuth";
import { validateBody, validateParams } from "../../middlewares/validation";
import {
  createProfileSchema,
  updateProfileSchema,
  addProjectSchema,
  updateProjectSchema,
  setIncomePreferenceSchema,
  setAvailabilitySchema,
  addServiceSchema,
  updateServiceSchema,
  paramIdSchema,
  githubOrgParamSchema,
} from "../../validation/onboarding.schemas";

const router = Router();

// Authentication required for all onboarding routes
router.use(isAuth);

// Profile management
router.post('/profile', validateBody(createProfileSchema), OnboardingController.createProfile);
router.put('/profile', validateBody(updateProfileSchema), OnboardingController.updateProfile);
router.get('/profile', OnboardingController.getDeveloperProfile);

// Projects
router.post('/projects', validateBody(addProjectSchema), OnboardingController.addProject);
router.put('/projects/:id', validateParams(paramIdSchema), validateBody(updateProjectSchema), OnboardingController.updateProject);
router.delete('/projects/:id', validateParams(paramIdSchema), OnboardingController.deleteProject);

// GitHub integration
router.get('/github/organizations', OnboardingController.getGithubOrganizations);
router.get('/github/organizations/:org/repositories', validateParams(githubOrgParamSchema), OnboardingController.getGithubRepositories);

// Income preferences
router.post('/income-preference', validateBody(setIncomePreferenceSchema), OnboardingController.setIncomePreference);

// Availability
router.post('/availability', validateBody(setAvailabilitySchema), OnboardingController.setAvailability);

// Services
router.get('/service-categories', OnboardingController.getServiceCategories);
router.post('/services', validateBody(addServiceSchema), OnboardingController.addService);
router.put('/services/:id', validateParams(paramIdSchema), validateBody(updateServiceSchema), OnboardingController.updateService);
router.delete('/services/:id', validateParams(paramIdSchema), OnboardingController.deleteService);

// Complete onboarding
router.post('/complete', OnboardingController.completeOnboarding);

export default router;