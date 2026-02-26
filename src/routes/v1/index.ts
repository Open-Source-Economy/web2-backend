import express from "express";
import authRoute from "./auth.route";
import stripeRoute from "./stripe.route";

const router = express.Router();

// Auth routes: Passport-dependent routes (register, login, github OAuth, logout) stay here.
// Non-Passport auth endpoints (status, check-email, forgot-password, reset-password, invite-info)
// are handled by ts-rest but Express auth routes take precedence for Passport endpoints.
router.use("/auth", authRoute);

// Stripe: only the webhook route stays here (needs express.raw() body parser).
// Checkout is migrated to ts-rest.
router.use("/stripe", stripeRoute);

// All other routes migrated to ts-rest:
// - /github → src/routes/ts-rest/github.router.ts
// - /user → src/routes/ts-rest/users.router.ts
// - /admin → src/routes/ts-rest/admin.router.ts
// - /projects → src/routes/ts-rest/projects.router.ts
// - /onboarding → src/routes/ts-rest/onboarding.router.ts
// - /newsletter, /contact, /plans → src/routes/ts-rest/misc.router.ts

export default router;
