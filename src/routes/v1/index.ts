import express from "express";
import authRoute from "./auth.route";
import userRoute from "./user.route";
import stripeRoute from "./stripe.route";
import adminRoute from "./admin.route";
import { MiscellaneousController } from "../../controllers/miscellaneous.controller";
import projectRoute from "./project.route";
import { PlanController } from "../../controllers/plan/plan.controller";
import githubRoute from "./github.route";
import onboardingRoute from "./onboarding.route";
import healthRoute from "./health.route";

const router = express.Router();

router.use("/health", healthRoute);
router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/stripe", stripeRoute);
router.use("/admin", adminRoute);
router.use("/projects", projectRoute);
router.use("/github", githubRoute);
router.use("/onboarding", onboardingRoute);

router.post("/newsletter", MiscellaneousController.subscribeToNewsletter);
router.get("/plans", PlanController.getPlans);

export default router;
