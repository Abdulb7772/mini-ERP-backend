import express from "express";
import {
  createOrGetChat,
  createGroupChat,
  getUserChats,
  getChatById,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  getChatContext,
  getStaffMembers,
  createSupportChat,
  deleteMessage,
} from "../controllers/chatController";
import { authenticate, authorize } from "../middlewares/auth";

const router = express.Router();

// All chat routes require authentication
router.use(authenticate);

// General chat routes
router.post("/create", createOrGetChat);
router.post("/group", authorize("admin"), createGroupChat);
router.get("/", getUserChats);
router.get("/staff", getStaffMembers);
router.get("/:chatId", getChatById);
router.get("/:chatId/messages", getChatMessages);
router.post("/:chatId/messages", sendMessage);
router.patch("/:chatId/read", markMessagesAsRead);
router.get("/:chatId/context", getChatContext);

// Message operations
router.delete("/messages/:messageId", deleteMessage);

// Client support chat
router.post("/support", createSupportChat);

export default router;
