import { Router } from "express";
import { signup, login, logout, refresh, getCurrentUser } from "./auth.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { signupSchema, loginSchema } from "./auth.validation.js";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, getCurrentUser);

export default router;
