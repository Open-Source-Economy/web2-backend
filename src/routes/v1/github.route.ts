import { Router } from "express";
import { GitHubController } from "../../controllers";

const router = Router();

router.get("/owners/:owner", GitHubController.getOwner);
router.get("/repos/:owner/:repo", GitHubController.getRepository);

// --- SYNC OPERATIONS ---
// router.post("/owners/:owner/sync", XXX);
// router.post("/repos/:owner/:repo/sync", XXX);

export default router;
