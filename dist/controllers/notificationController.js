"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
// Get user's notifications
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { unreadOnly = "false" } = req.query;
        const filter = { userId };
        if (unreadOnly === "true") {
            filter.isRead = false;
        }
        const notifications = await Notification_1.default.find(filter)
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        const unreadCount = await Notification_1.default.countDocuments({
            userId,
            isRead: false,
        });
        res.status(200).json({
            success: true,
            data: notifications,
            unreadCount,
        });
    }
    catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching notifications",
            error: error.message,
        });
    }
};
exports.getNotifications = getNotifications;
// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const notification = await Notification_1.default.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true });
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        res.status(200).json({
            success: true,
            data: notification,
        });
    }
    catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({
            success: false,
            message: "Error updating notification",
            error: error.message,
        });
    }
};
exports.markAsRead = markAsRead;
// Mark all notifications as read
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        await Notification_1.default.updateMany({ userId, isRead: false }, { isRead: true });
        res.status(200).json({
            success: true,
            message: "All notifications marked as read",
        });
    }
    catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({
            success: false,
            message: "Error updating notifications",
            error: error.message,
        });
    }
};
exports.markAllAsRead = markAllAsRead;
// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const notification = await Notification_1.default.findOneAndDelete({ _id: id, userId });
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        res.status(200).json({
            success: true,
            message: "Notification deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting notification",
            error: error.message,
        });
    }
};
exports.deleteNotification = deleteNotification;
// Helper function to create notification
const createNotification = async (userId, userModel, type, title, message, relatedId, relatedModel) => {
    try {
        await Notification_1.default.create({
            userId,
            userModel,
            type,
            title,
            message,
            relatedId,
            relatedModel,
        });
    }
    catch (error) {
        console.error("Error creating notification:", error);
    }
};
exports.createNotification = createNotification;
