import express, { Router } from "express";

import { StripeController, StripeWebhookController } from "../../controllers";

const router = Router();

router.get("/get-prices", StripeController.getPrices);
// router.get("/create-customer", StripeController.createCustomer);
// router.get("/create-subscription", StripeController.createSubscription);
// router.get("/create-payment-intent", StripeController.createPaymentIntent);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  StripeWebhookController.webhook,
);

export default router;
