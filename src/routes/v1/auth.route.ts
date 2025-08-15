import { Router } from "express";
import passport from "passport";
import { AuthController } from "../../controllers";

// Extend session type for this file
declare module "express-session" {
  interface SessionData {
    redirectPath?: string;
  }
}

const router = Router();

router.get("/status", AuthController.status);

router.post(
  "/register",
  passport.authenticate("local-register"),
  AuthController.register,
);

router.post(
  "/register-as-company",
  AuthController.verifyCompanyToken,
  passport.authenticate("local-register"),
  AuthController.registerAsCompany,
);

router.post(
  "/register-as-maintainer",
  AuthController.verifyRepositoryToken,
  passport.authenticate("github"),
);

router.post(
  "/login",
  passport.authenticate("local-login"),
  AuthController.login,
);

router.get("/github", (req, res, next) => {
  // Store the redirect path in session if provided
  if (req.query.redirect) {
    req.session.redirectPath = req.query.redirect as string;
  }
  passport.authenticate("github")(req, res, next);
});

router.get(
  "/redirect/github",
  passport.authenticate("github"),
  AuthController.registerForRepository,
);

router.post("/logout", AuthController.logout);

router.get(
  "/company-user-invite-info",
  AuthController.getCompanyUserInviteInfo,
);

router.get(
  "/repository-user-invite-info",
  AuthController.getRepositoryUserInviteInfo,
);

export default router;
