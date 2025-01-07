import express, { Router } from "express";

import { StripeWebhookController } from "../../controllers/stripe";

const router = Router();

// router.get("/get-dow-prices", StripeController.getDowPrices);
// router.get("/create-customer", StripeController.createCustomer);
// router.get("/create-subscription", StripeController.createSubscription);
// router.get("/create-payment-intent", StripeController.createPaymentIntent);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  StripeWebhookController.webhook,
);

export default router;
