import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  verifyEmail,
  resendVerificationEmail,
} from "../controllers/userController";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createUserValidator,
  updateUserValidator,
} from "../validators/userValidator";

const router = express.Router();

router.post("/verify-email", verifyEmail); // Public route

// Protected routes
router.use(authenticate);

router.get("/", authorize("admin", "manager"), getUsers);
router.post("/", authorize("admin"), createUserValidator, validate, createUser);
router.put("/:id", authorize("admin"), updateUserValidator, validate, updateUser);
router.delete("/:id", authorize("admin"), deleteUser);
router.patch("/:id/toggle-status", authorize("admin"), toggleUserStatus);
router.post("/:id/resend-verification", authorize("admin"), resendVerificationEmail);

export default router;
