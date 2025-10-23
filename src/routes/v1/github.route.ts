import { Router } from "express";
import { GitHubController } from "../../controllers";

const router = Router();

router.get("/owners/:owner", GitHubController.getOwner);
router.get("/repos/:owner/:repo", GitHubController.getRepository);

// --- SYNC OPERATIONS ---
router.post("/sync/all", GitHubController.syncAll);
router.post("/owners/:owner/sync", GitHubController.syncOwner);
router.post("/repos/:owner/:repo/sync", GitHubController.syncRepository);
router.post("/projects/:owner/sync", GitHubController.syncProject);
router.post("/projects/:owner/:repo/sync", GitHubController.syncProject);

export default router;
