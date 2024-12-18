import { Router } from "express";
import { AdminController } from "../../controllers/admin.controller";
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

export default router;
