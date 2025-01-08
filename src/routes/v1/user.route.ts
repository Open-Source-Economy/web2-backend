import { Router } from "express";
import { UserController } from "../../controllers";
import { isAuth } from "../../middlewares/isAuth";

const router = Router();

// TODO: security: make sure the user belongs to the company that is funding the issue
router.get("/available-dow", isAuth, UserController.getAvailableDow);
router.get(
  "/set-preferred-currency/:currency",
  isAuth,
  UserController.setUserPreferredCurrency,
);

export default router;
