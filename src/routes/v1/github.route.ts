import { Router } from "express";
import { GithubController } from "../../controllers/github.controller";
import { isAuth } from "../../middlewares/isAuth";

const router = Router();

router.get("/issues", GithubController.issues);

router.get(
  "/:owner/:repo/issues/:number",
  // checkSchema(createUserValidationSchema),
  GithubController.issue,
);

// TODO: add validation schema
router.post(
  "/:owner/:repo/issues/:number/fund",
  isAuth, // TODO: security: make sure the user belongs to the company that is funding the issue
  GithubController.fundIssue,
);

// TODO: add validation schema
router.post(
  "/:owner/:repo/issues/:number/request-funding",
  isAuth, // TODO: security: make sure the user belongs to the company that is funding the issue
  GithubController.requestIssueFunding,
);

export default router;
