import { Router } from "express";
import { AdminController, ProjectController } from "../../controllers";
import { isWebsiteAdmin } from "../../middlewares/isWebsiteAdmin";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validation";
import * as dto from "@open-source-economy/api-types";

const router = Router();

router.post("/address", isWebsiteAdmin, AdminController.createAddress);
router.post("/company", isWebsiteAdmin, AdminController.createCompany);
router.post(
  "/company/admin-invite",
  isWebsiteAdmin,
  AdminController.sendCompanyAdminInvite,
);
router.post(
  "/company/create-manual-invoice",
  isWebsiteAdmin,
  AdminController.createManualInvoice,
);

router.post(
  "/repository/admin-invite",
  isWebsiteAdmin,
  AdminController.sendRepositoryAdminInvite,
);

// Create prices (for both owners and repositories)
router.post(
  "/owners/:owner/stripe/product-and-price",
  isWebsiteAdmin,
  AdminController.createCampaignProductAndPrice,
);
router.post(
  "/plan/product-and-price",
  isWebsiteAdmin,
  AdminController.createPlanProductAndPrice,
);

router.post(
  "/projects/owners/:owner",
  isWebsiteAdmin,
  ProjectController.createProject,
);

router.post(
  "/projects/repos/:owner/:repo",
  isWebsiteAdmin,
  ProjectController.createProject,
);

// Update project item categories (admin only)
router.put(
  "/project-items/:projectItemId/categories",
  isWebsiteAdmin,
  validateParams(dto.UpdateProjectItemCategoriesCompanion.paramsSchema),
  validateBody(dto.UpdateProjectItemCategoriesCompanion.bodySchema),
  validateQuery(dto.UpdateProjectItemCategoriesCompanion.querySchema),
  AdminController.updateProjectItemCategories as any,
);

export default router;
