import { Router } from "express";
import { GithubController } from "../../controllers";
import { isAuth } from "../../middlewares/isAuth";
import { CampaignController } from "../../controllers/campaign/campaign.controller";

const router = Router();

// Project routes (handles both owners and repositories)
router.get("/owners/:owner", GithubController.getOwner);
router.get("/repos/:owner/:repo", GithubController.getRepository);

// Project campaigns (for both owners and repositories)
router.get("/owners/:owner/campaigns", CampaignController.getCampaign);
router.get("/repos/:owner/:repo/campaigns", CampaignController.getCampaign);

// Issues (repository-specific)
router.get("/all-financial-issues", GithubController.getAllFinancialIssues);
router.get("/repos/:owner/:repo/issues/:number", GithubController.getIssue);
router.post(
  "/repos/:owner/:repo/issues/:number/funding",
  isAuth, // TODO: security: make sure the user belongs to the company that is funding the issue
  GithubController.fundIssue,
);
router.post(
  "/repos/:owner/:repo/issues/:number/funding/requests",
  isAuth, // TODO: security: make sure the user belongs to the company that is funding the issue
  GithubController.requestIssueFunding,
);

export default router;
