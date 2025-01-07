import { Router } from "express";
import { UserController } from "../../controllers/user.controller";
import { isAuth } from "../../middlewares/isAuth";

const router = Router();

// TODO: security: make sure the user belongs to the company that is funding the issue
router.get("/available-dow", isAuth, UserController.getAvailableDow);

export default router;
