import { Router } from "express";
import passport from "passport";
import { AuthController } from "../../controllers";

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
  if (req.query.redirect) {
    // TODO: does not work
    // req.session.redirectPath = req.query.redirect as string;
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
