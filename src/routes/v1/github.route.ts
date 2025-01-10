import { Router } from "express";
import { GithubController } from "../../controllers";
import { isAuth } from "../../middlewares/isAuth";

const router = Router();

router.get("/owners/:owner", GithubController.getOwner);

// Repositories
router.get("/repos/:owner/:repo", GithubController.getRepository);

// Issues
router.get("/all-financial-issues", GithubController.getAllFinancialIssues);
router.get("/repos/:owner/:repo/issues/:number", GithubController.getIssue);

// Funding
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

// Campaigns
router.get("/repos/:owner/:repo/campaigns", GithubController.getCampaign);

export default router;
