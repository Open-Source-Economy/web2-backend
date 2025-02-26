import express, { Router } from "express";

import {
  StripeCheckoutController,
  StripeWebhookController,
} from "../../controllers";
import { PlanController } from "../../controllers/plan.controller";

const router = Router();

router.post("/checkout", StripeCheckoutController.checkout);
router.get("/plans", PlanController.getPlan);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  StripeWebhookController.webhook,
);

export default router;
