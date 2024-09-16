import express from "express";
import authRoute from "./auth.route";
import userRoute from "./user.route";
import shopRoute from "./shop.route";

const router = express.Router();

router.use("/auth", authRoute);
router.use("/users", userRoute);
router.use("/shop", shopRoute);

export default router;
