import { Router } from "express";
import { GitHubController } from "../../controllers";
import { validateParams, validateBody, validateQuery } from "../../middlewares";
import * as dto from "@open-source-economy/api-types";

const router = Router();

router.get("/owners/:owner", GitHubController.getOwner);
router.get("/repos/:owner/:repo", GitHubController.getRepository);

// --- SYNC OPERATIONS ---
router.post("/sync/all", GitHubController.syncAll);

router.post(
  "/owners/:owner/sync",
  validateParams(dto.SyncOwnerCompanion.paramsSchema),
  validateBody(dto.SyncOwnerCompanion.bodySchema),
  validateQuery(dto.SyncOwnerCompanion.querySchema),
  GitHubController.syncOwner,
);

router.post(
  "/repos/:owner/:repo/sync",
  validateParams(dto.SyncRepositoryCompanion.paramsSchema),
  validateBody(dto.SyncRepositoryCompanion.bodySchema),
  validateQuery(dto.SyncRepositoryCompanion.querySchema),
  GitHubController.syncRepository,
);

router.post(
  "/projects/:owner/sync",
  validateParams(dto.SyncProjectCompanion.paramsSchema),
  validateBody(dto.SyncProjectCompanion.bodySchema),
  validateQuery(dto.SyncProjectCompanion.querySchema),
  GitHubController.syncProject,
);

router.post(
  "/projects/:owner/:repo/sync",
  validateParams(dto.SyncProjectCompanion.paramsSchema),
  validateBody(dto.SyncProjectCompanion.bodySchema),
  validateQuery(dto.SyncProjectCompanion.querySchema),
  GitHubController.syncProject,
);

export default router;
