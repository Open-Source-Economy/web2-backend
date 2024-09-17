import express, { Router } from "express";

import { ShopController } from "../../controllers/shop.controllers";

const router = Router();

router.get("/checkout", ShopController.checkout);
router.get("/create-customer", ShopController.createCustomer);
router.get("/create-subscription", ShopController.createSubscription);
router.get("/create-payment-intent", ShopController.createPaymentIntent);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  ShopController.webhook,
);

export default router;
