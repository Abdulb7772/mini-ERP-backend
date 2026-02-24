"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatController_1 = require("../controllers/chatController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
// All chat routes require authentication
router.use(auth_1.authenticate);
// General chat routes
router.post("/create", chatController_1.createOrGetChat);
router.post("/group", (0, auth_1.authorize)("admin"), chatController_1.createGroupChat);
router.get("/", chatController_1.getUserChats);
router.get("/staff", chatController_1.getStaffMembers);
router.get("/:chatId", chatController_1.getChatById);
router.get("/:chatId/messages", chatController_1.getChatMessages);
router.post("/:chatId/messages", chatController_1.sendMessage);
router.patch("/:chatId/read", chatController_1.markMessagesAsRead);
router.get("/:chatId/context", chatController_1.getChatContext);
// Message operations
router.delete("/messages/:messageId", chatController_1.deleteMessage);
// Client support chat
router.post("/support", chatController_1.createSupportChat);
exports.default = router;
