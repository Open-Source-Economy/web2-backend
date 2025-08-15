import { Router } from "express";
import { HealthController } from "../../controllers/health.controller";

const router = Router();

// Basic health check endpoint (no authentication required)
router.get("/", HealthController.healthCheck);

// Detailed health check endpoint (no authentication required)
router.get("/detailed", HealthController.detailedHealthCheck);

export default router;
