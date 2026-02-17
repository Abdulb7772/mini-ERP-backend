import express from "express";
import { register, login, getMe } from "../controllers/authController";
import { verifyEmail, resendVerificationEmail } from "../controllers/userController";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { loginValidator, registerValidator } from "../validators/authValidator";

const router = express.Router();

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.get("/me", authenticate, getMe);
router.get("/verify-email", verifyEmail); // Public route - accepts token as query param
router.post("/resend-verification", resendVerificationEmail); // Public route - accepts email in body

export default router;
