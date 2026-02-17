"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canFileComplaint = exports.getComplaintStats = exports.deleteComplaint = exports.updateComplaintStatus = exports.getComplaintById = exports.getAllComplaints = exports.getCustomerComplaints = exports.createComplaint = void 0;
const Complaint_1 = __importDefault(require("../models/Complaint"));
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const notificationController_1 = require("./notificationController");
// Create a new complaint
const createComplaint = async (req, res) => {
    try {
        const { orderId, subject, description, priority, attachments } = req.body;
        const customerId = req.user?.userId;
        // Verify the order exists and belongs to the customer
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }
        // Check if order belongs to the customer
        if (order.customerId.toString() !== customerId) {
            return res.status(403).json({
                success: false,
                message: "You can only create complaints for your own orders",
            });
        }
        // Check if order is at least 48 hours old
        const orderCreatedAt = new Date(order.createdAt);
        const currentTime = new Date();
        const hoursDifference = (currentTime.getTime() - orderCreatedAt.getTime()) / (1000 * 60 * 60);
        if (hoursDifference < 48) {
            return res.status(400).json({
                success: false,
                message: "Complaints can only be filed after 48 hours of order placement",
            });
        }
        // Check if order is delivered
        if (order.status === "delivered") {
            return res.status(400).json({
                success: false,
                message: "Cannot file a complaint for delivered orders",
            });
        }
        // Create the complaint
        const complaint = await Complaint_1.default.create({
            orderId,
            customerId,
            subject,
            description,
            priority: priority || "medium",
            attachments: attachments || [],
        });
        const populatedComplaint = await Complaint_1.default.findById(complaint._id)
            .populate("orderId", "orderNumber totalAmount status")
            .populate("customerId", "name email");
        // Create notification for admins and staff
        try {
            const adminUsers = await User_1.default.find({ role: { $in: ["admin", "staff"] }, isActive: true });
            const orderNumber = populatedComplaint && typeof populatedComplaint.orderId === 'object' && 'orderNumber' in populatedComplaint.orderId
                ? populatedComplaint.orderId.orderNumber
                : "N/A";
            for (const admin of adminUsers) {
                await (0, notificationController_1.createNotification)(admin._id.toString(), "User", "complaint_filed", "New Complaint Filed", `A new complaint has been filed for order ${orderNumber}`, complaint._id.toString(), "Complaint");
            }
        }
        catch (notifError) {
            console.error("Error creating admin notifications:", notifError);
        }
        res.status(201).json({
            success: true,
            message: "Complaint created successfully",
            data: populatedComplaint,
        });
    }
    catch (error) {
        console.error("Error creating complaint:", error);
        res.status(500).json({
            success: false,
            message: "Error creating complaint",
            error: error.message,
        });
    }
};
exports.createComplaint = createComplaint;
// Get all complaints for a customer
const getCustomerComplaints = async (req, res) => {
    try {
        const customerId = req.user?.userId;
        const complaints = await Complaint_1.default.find({ customerId })
            .populate("orderId", "orderNumber totalAmount status createdAt")
            .populate("respondedBy", "name email")
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: complaints,
        });
    }
    catch (error) {
        console.error("Error fetching customer complaints:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching complaints",
            error: error.message,
        });
    }
};
exports.getCustomerComplaints = getCustomerComplaints;
// Get all complaints (admin/staff)
const getAllComplaints = async (req, res) => {
    try {
        const { status, priority, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (priority)
            filter.priority = priority;
        const skip = (Number(page) - 1) * Number(limit);
        const complaints = await Complaint_1.default.find(filter)
            .populate("orderId", "orderNumber totalAmount status createdAt")
            .populate("customerId", "name email phone")
            .populate("respondedBy", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Complaint_1.default.countDocuments(filter);
        // Log for debugging
        console.log('Fetched complaints:', complaints.length);
        if (complaints.length > 0) {
            console.log('Sample complaint customer:', complaints[0].customerId);
        }
        res.status(200).json({
            success: true,
            data: complaints,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Error fetching complaints:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching complaints",
            error: error.message,
        });
    }
};
exports.getAllComplaints = getAllComplaints;
// Get complaint by ID
const getComplaintById = async (req, res) => {
    try {
        const { id } = req.params;
        const complaint = await Complaint_1.default.findById(id)
            .populate("orderId", "orderNumber totalAmount status items createdAt")
            .populate("customerId", "name email phone")
            .populate("respondedBy", "name email");
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }
        res.status(200).json({
            success: true,
            data: complaint,
        });
    }
    catch (error) {
        console.error("Error fetching complaint:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching complaint",
            error: error.message,
        });
    }
};
exports.getComplaintById = getComplaintById;
// Update complaint status (admin/staff)
const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, response, priority } = req.body;
        const userId = req.user?.userId;
        const updateData = {};
        if (status)
            updateData.status = status;
        if (priority)
            updateData.priority = priority;
        if (response) {
            updateData.response = response;
            updateData.respondedBy = userId;
            updateData.respondedAt = new Date();
        }
        const complaint = await Complaint_1.default.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        })
            .populate("orderId", "orderNumber totalAmount status")
            .populate("customerId", "name email")
            .populate("respondedBy", "name email");
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }
        // Create notification for customer if response was added
        if (response && complaint.customerId) {
            try {
                const orderNumber = complaint && typeof complaint.orderId === 'object' && 'orderNumber' in complaint.orderId
                    ? complaint.orderId.orderNumber
                    : "N/A";
                await (0, notificationController_1.createNotification)(complaint.customerId._id.toString(), "Customer", "complaint_replied", "Response to Your Complaint", `Your complaint for order ${orderNumber} has received a response`, complaint._id.toString(), "Complaint");
            }
            catch (notifError) {
                console.error("Error creating customer notification:", notifError);
            }
        }
        res.status(200).json({
            success: true,
            message: "Complaint updated successfully",
            data: complaint,
        });
    }
    catch (error) {
        console.error("Error updating complaint:", error);
        res.status(500).json({
            success: false,
            message: "Error updating complaint",
            error: error.message,
        });
    }
};
exports.updateComplaintStatus = updateComplaintStatus;
// Delete complaint (admin only)
const deleteComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const complaint = await Complaint_1.default.findByIdAndDelete(id);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }
        res.status(200).json({
            success: true,
            message: "Complaint deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting complaint:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting complaint",
            error: error.message,
        });
    }
};
exports.deleteComplaint = deleteComplaint;
// Get complaint statistics (admin/staff)
const getComplaintStats = async (req, res) => {
    try {
        const totalComplaints = await Complaint_1.default.countDocuments();
        const pendingComplaints = await Complaint_1.default.countDocuments({
            status: "pending",
        });
        const inReviewComplaints = await Complaint_1.default.countDocuments({
            status: "in-review",
        });
        const resolvedComplaints = await Complaint_1.default.countDocuments({
            status: "resolved",
        });
        const rejectedComplaints = await Complaint_1.default.countDocuments({
            status: "rejected",
        });
        const highPriorityComplaints = await Complaint_1.default.countDocuments({
            priority: "high",
        });
        res.status(200).json({
            success: true,
            data: {
                total: totalComplaints,
                pending: pendingComplaints,
                inReview: inReviewComplaints,
                resolved: resolvedComplaints,
                rejected: rejectedComplaints,
                highPriority: highPriorityComplaints,
            },
        });
    }
    catch (error) {
        console.error("Error fetching complaint stats:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching complaint statistics",
            error: error.message,
        });
    }
};
exports.getComplaintStats = getComplaintStats;
// Check if complaint can be filed for an order
const canFileComplaint = async (req, res) => {
    try {
        const { orderId } = req.params;
        const customerId = req.user?.userId;
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }
        // Check if order belongs to the customer
        if (order.customerId.toString() !== customerId) {
            return res.status(403).json({
                success: false,
                canFile: false,
                message: "This order does not belong to you",
            });
        }
        // Check if order is at least 48 hours old
        const orderCreatedAt = new Date(order.createdAt);
        const currentTime = new Date();
        const hoursDifference = (currentTime.getTime() - orderCreatedAt.getTime()) / (1000 * 60 * 60);
        if (hoursDifference < 48) {
            return res.status(200).json({
                success: true,
                canFile: false,
                message: `You can file a complaint after ${Math.ceil(48 - hoursDifference)} hours`,
                hoursRemaining: Math.ceil(48 - hoursDifference),
            });
        }
        // Allow filing complaints
        res.status(200).json({
            success: true,
            canFile: true,
            message: "You can file a complaint for this order",
        });
    }
    catch (error) {
        console.error("Error checking complaint eligibility:", error);
        res.status(500).json({
            success: false,
            message: "Error checking complaint eligibility",
            error: error.message,
        });
    }
};
exports.canFileComplaint = canFileComplaint;
