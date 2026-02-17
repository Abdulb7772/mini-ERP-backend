"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controllers/notificationController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
// All notification routes require authentication
router.get("/", auth_1.authenticate, notificationController_1.getNotifications);
router.patch("/:id/read", auth_1.authenticate, notificationController_1.markAsRead);
router.patch("/mark-all-read", auth_1.authenticate, notificationController_1.markAllAsRead);
router.delete("/:id", auth_1.authenticate, notificationController_1.deleteNotification);
exports.default = router;
