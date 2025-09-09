import { Router } from "express";
import { UserController } from "../../controllers";
import { authenticatedUser } from "../../middlewares/auth/authenticatedUser";

const router = Router();

// TODO: security: make sure the user belongs to the company that is funding the issue
router.get(
  "/available-credit",
  authenticatedUser,
  UserController.getAvailableCredit,
);
router.get("/plan", authenticatedUser, UserController.getPlan);
router.post(
  "/preferred-currency/:currency",
  authenticatedUser,
  UserController.setUserPreferredCurrency,
);

export default router;
