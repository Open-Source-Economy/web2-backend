import { Router } from "express";
import { AdminController, ProjectController } from "../../controllers";
import { isWebsiteAdmin } from "../../middlewares/isWebsiteAdmin";

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

export default router;
