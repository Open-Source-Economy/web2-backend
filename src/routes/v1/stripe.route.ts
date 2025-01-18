import express, { Router } from "express";

import {
  StripeCheckoutController,
  StripeWebhookController,
} from "../../controllers";

const router = Router();

router.post("/checkout", StripeCheckoutController.checkout);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  StripeWebhookController.webhook,
);

export default router;
