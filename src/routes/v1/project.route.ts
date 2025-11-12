import { Router } from "express";
import { ProjectController } from "../../controllers";
import { authenticatedUser } from "../../middlewares/auth/authenticatedUser";
import { CampaignController } from "../../controllers/campaign/campaign.controller";

const router = Router();

router.get("/", ProjectController.getProjects);
router.get("/items/details", ProjectController.getProjectItemsWithDetails);
router.get("/owners/:owner", ProjectController.getProject);
router.get("/repos/:owner/:repo", ProjectController.getProject);
router.get("/owners/:owner/details", ProjectController.getProjectDetails);
router.get("/repos/:owner/:repo/details", ProjectController.getProjectDetails);

// Project campaigns (for both owners and repositories)
router.get("/owners/:owner/campaigns", CampaignController.getCampaign);
router.get("/repos/:owner/:repo/campaigns", CampaignController.getCampaign);

// Issues (repository-specific)
router.get("/all-financial-issues", ProjectController.getAllFinancialIssues);
router.get("/repos/:owner/:repo/issues/:number", ProjectController.getIssue);
router.post(
  "/repos/:owner/:repo/issues/:number/funding",
  authenticatedUser, // TODO: security: make sure the user belongs to the company that is funding the issue
  ProjectController.fundIssue,
);
router.post(
  "/repos/:owner/:repo/issues/:number/funding/requests",
  authenticatedUser, // TODO: security: make sure the user belongs to the company that is funding the issue
  ProjectController.requestIssueFunding,
);

export default router;
