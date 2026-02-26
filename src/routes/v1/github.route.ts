import { Router } from "express";
import { GitHubController } from "../../controllers";
import { validateBody, validateParams, validateQuery } from "../../middlewares";
import * as dto from "@open-source-economy/api-types";

const router = Router();

router.get("/owners/:owner", GitHubController.getOwner);
router.get("/repos/:owner/:repo", GitHubController.getRepository);

// --- SYNC OPERATIONS ---
router.post("/sync/all", GitHubController.syncAll);

router.post(
  "/owners/:owner/sync",
  validateParams(dto.syncOwnerEndpoint.pathParams as any),
  validateBody(dto.syncOwnerEndpoint.body as any),
  validateQuery(dto.syncOwnerEndpoint.query as any),
  GitHubController.syncOwner as any,
);

router.post(
  "/repos/:owner/:repo/sync",
  validateParams(dto.syncRepositoryEndpoint.pathParams as any),
  validateBody(dto.syncRepositoryEndpoint.body as any),
  validateQuery(dto.syncRepositoryEndpoint.query as any),
  GitHubController.syncRepository as any,
);

router.post(
  "/projects/:owner/sync",
  validateParams(dto.syncProjectEndpoint.pathParams as any),
  validateBody(dto.syncProjectEndpoint.body as any),
  validateQuery(dto.syncProjectEndpoint.query as any),
  GitHubController.syncProject as any,
);

router.post(
  "/projects/:owner/:repo/sync",
  validateParams(dto.syncProjectEndpoint.pathParams as any),
  validateBody(dto.syncProjectEndpoint.body as any),
  validateQuery(dto.syncProjectEndpoint.query as any),
  GitHubController.syncProject as any,
);

export default router;
