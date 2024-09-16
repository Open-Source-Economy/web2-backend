import express, { Router } from "express";

import { ShopController } from "../../controllers/shop.controllers";

const router = Router();

router.get("/checkout", ShopController.checkout);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  ShopController.webhook,
);

export default router;
