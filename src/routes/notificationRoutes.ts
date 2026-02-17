import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notificationController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

// All notification routes require authentication
router.get("/", authenticate, getNotifications);
router.patch("/:id/read", authenticate, markAsRead);
router.patch("/mark-all-read", authenticate, markAllAsRead);
router.delete("/:id", authenticate, deleteNotification);

export default router;
