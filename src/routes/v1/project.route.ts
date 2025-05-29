import { Router } from "express";
import { ProjectController } from "../../controllers";
import { isAuth } from "../../middlewares/isAuth";
import { CampaignController } from "../../controllers/campaign/campaign.controller";

const router = Router();

router.get("/", ProjectController.getProjects);
router.get("/owners/:owner", ProjectController.getProject);
router.get("/repos/:owner/:repo", ProjectController.getProject);

// Project campaigns (for both owners and repositories)
router.get("/owners/:owner/campaigns", CampaignController.getCampaign);
router.get("/repos/:owner/:repo/campaigns", CampaignController.getCampaign);

// Issues (repository-specific)
router.get("/all-financial-issues", ProjectController.getAllFinancialIssues);
router.get("/repos/:owner/:repo/issues/:number", ProjectController.getIssue);
router.post(
  "/repos/:owner/:repo/issues/:number/funding",
  isAuth, // TODO: security: make sure the user belongs to the company that is funding the issue
  ProjectController.fundIssue,
);
router.post(
  "/repos/:owner/:repo/issues/:number/funding/requests",
  isAuth, // TODO: security: make sure the user belongs to the company that is funding the issue
  ProjectController.requestIssueFunding,
);

export default router;
