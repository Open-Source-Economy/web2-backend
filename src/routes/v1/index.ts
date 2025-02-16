import express from "express";
import authRoute from "./auth.route";
import userRoute from "./user.route";
import stripeRoute from "./stripe.route";
import adminRoute from "./admin.route";
import githubRoute from "./github.route";
import { MiscellaneousController } from "../../controllers/miscellaneous.controller";

const router = express.Router();

router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/stripe", stripeRoute);
router.use("/admin", adminRoute);
router.use("/github", githubRoute);

router.post("/newsletter", MiscellaneousController.subscribeToNewsletter);

export default router;
