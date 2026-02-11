import express from "express";
import { register, login, getMe } from "../controllers/authController";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { loginValidator, registerValidator } from "../validators/authValidator";

const router = express.Router();

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.get("/me", authenticate, getMe);

export default router;
