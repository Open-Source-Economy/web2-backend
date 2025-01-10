import express, { Router } from "express";

import {
  StripeCheckoutController,
  StripeController,
  StripeWebhookController,
} from "../../controllers";

const router = Router();

router.get("/get-prices", StripeController.getPrices);
router.post("/checkout", StripeCheckoutController.checkout);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  StripeWebhookController.webhook,
);

export default router;
