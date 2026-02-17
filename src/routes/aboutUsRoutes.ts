import express from "express";
import {
  getAboutUs,
  createOrUpdateAboutUs,
  deleteAboutUs,
} from "../controllers/aboutUsController";
import { authenticate, authorize } from "../middlewares/auth";

const router = express.Router();

// Public route - anyone can view
router.get("/", getAboutUs);

// Protected routes - admin only
router.post("/", authenticate, authorize("admin"), createOrUpdateAboutUs);
router.put("/", authenticate, authorize("admin"), createOrUpdateAboutUs);
router.delete("/", authenticate, authorize("admin"), deleteAboutUs);

export default router;
