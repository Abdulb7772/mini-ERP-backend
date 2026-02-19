"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.declineRefund = exports.getAllRefunds = exports.getRefundStats = exports.processRefund = exports.getRefundableOrders = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const WalletTransaction_1 = __importDefault(require("../models/WalletTransaction"));
const Notification_1 = __importDefault(require("../models/Notification"));
const walletController_1 = require("./walletController");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Get all orders eligible for refund (paid orders)
 */
const getRefundableOrders = async (req, res) => {
    try {
        const { page = '1', limit = '20', search = '', status = '' } = req.query;
        // Build query for paid orders
        const query = {
            paymentStatus: 'paid',
            customerId: { $ne: null }, // Only get orders with valid customerId
        };
        // Filter by order status if specified
        if (status && status !== 'all') {
            query.status = status;
        }
        // Search by order number or customer name
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
            ];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [orders, total] = await Promise.all([
            Order_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('customerId', 'name email')
                .populate('items.productId', 'name images'),
            Order_1.default.countDocuments(query),
        ]);
        // Get wallet info for each order's user to show current balance
        const ordersWithWalletInfo = await Promise.all(orders.map(async (order) => {
            const orderObj = order.toObject();
            const wallet = await Wallet_1.default.findOne({ userId: order.customerId });
            // Check if this order has been refunded
            const refundTransaction = await WalletTransaction_1.default.findOne({
                orderId: order._id,
                source: 'refund',
            });
            return {
                ...orderObj,
                walletBalance: wallet?.balance || 0,
                isRefunded: !!refundTransaction,
                refundedAt: refundTransaction?.createdAt,
                refundAmount: refundTransaction?.amount,
                refundDeclined: order.refundDeclined || false,
                refundDeclinedReason: order.refundDeclinedReason,
                refundDeclinedAt: order.refundDeclinedAt,
            };
        }));
        res.status(200).json({
            success: true,
            data: ordersWithWalletInfo,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total,
                itemsPerPage: parseInt(limit),
            },
        });
    }
    catch (error) {
        console.error('Error getting refundable orders:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get refundable orders',
        });
    }
};
exports.getRefundableOrders = getRefundableOrders;
/**
 * Process refund for an order
 */
const processRefund = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { amount, reason } = req.body;
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        // Validate input
        if (!amount || amount <= 0) {
            res.status(400).json({
                success: false,
                message: 'Invalid refund amount',
            });
            return;
        }
        // Find the order
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            res.status(404).json({
                success: false,
                message: 'Order not found',
            });
            return;
        }
        // Verify order is paid
        if (order.paymentStatus !== 'paid') {
            res.status(400).json({
                success: false,
                message: 'Order is not paid, cannot refund',
            });
            return;
        }
        // Check if already refunded
        const existingRefund = await WalletTransaction_1.default.findOne({
            orderId: order._id,
            source: 'refund',
        });
        if (existingRefund) {
            res.status(400).json({
                success: false,
                message: 'Order has already been refunded',
            });
            return;
        }
        // Validate refund amount doesn't exceed order total
        if (amount > order.totalAmount) {
            res.status(400).json({
                success: false,
                message: 'Refund amount cannot exceed order total',
            });
            return;
        }
        // Add points to user's wallet
        const description = reason || `Refund for order ${order.orderNumber}`;
        const customerId = order.customerId;
        const result = await (0, walletController_1.addPoints)(customerId instanceof mongoose_1.default.Types.ObjectId ? customerId : new mongoose_1.default.Types.ObjectId(customerId), amount, 'refund', description, order._id, new mongoose_1.default.Types.ObjectId(adminId));
        if (!result.success) {
            res.status(500).json({
                success: false,
                message: result.message || 'Failed to process refund',
            });
            return;
        }
        // Create notification for customer about refund approval
        await Notification_1.default.create({
            userId: customerId,
            userModel: 'Customer',
            type: 'refund_response',
            title: 'Refund Approved',
            message: `Your refund request for order ${order.orderNumber} has been approved. ${amount} points have been added to your wallet.`,
            relatedId: order._id,
            relatedModel: 'Order',
            isRead: false,
        });
        res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            data: {
                wallet: result.wallet,
                transaction: result.transaction,
            },
        });
    }
    catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process refund',
        });
    }
};
exports.processRefund = processRefund;
/**
 * Get refund statistics
 */
const getRefundStats = async (req, res) => {
    try {
        const [totalRefunds, totalRefundAmount, recentRefunds] = await Promise.all([
            WalletTransaction_1.default.countDocuments({ source: 'refund' }),
            WalletTransaction_1.default.aggregate([
                { $match: { source: 'refund' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            WalletTransaction_1.default.find({ source: 'refund' })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('userId', 'name email')
                .populate('orderId', 'orderNumber totalAmount')
                .populate('processedBy', 'name email'),
        ]);
        res.status(200).json({
            success: true,
            data: {
                totalRefunds,
                totalRefundAmount: totalRefundAmount[0]?.total || 0,
                recentRefunds,
            },
        });
    }
    catch (error) {
        console.error('Error getting refund stats:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get refund stats',
        });
    }
};
exports.getRefundStats = getRefundStats;
/**
 * Get all refund transactions
 */
const getAllRefunds = async (req, res) => {
    try {
        const { page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [refunds, total] = await Promise.all([
            WalletTransaction_1.default.find({ source: 'refund' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('userId', 'name email')
                .populate('orderId', 'orderNumber totalAmount status')
                .populate('processedBy', 'name email'),
            WalletTransaction_1.default.countDocuments({ source: 'refund' }),
        ]);
        res.status(200).json({
            success: true,
            data: refunds,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total,
                itemsPerPage: parseInt(limit),
            },
        });
    }
    catch (error) {
        console.error('Error getting refunds:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get refunds',
        });
    }
};
exports.getAllRefunds = getAllRefunds;
/**
 * Decline refund for an order
 */
const declineRefund = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        // Find the order
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            res.status(404).json({
                success: false,
                message: 'Order not found',
            });
            return;
        }
        // Verify order is paid and cancelled
        if (order.paymentStatus !== 'paid') {
            res.status(400).json({
                success: false,
                message: 'Order is not paid, no refund to decline',
            });
            return;
        }
        // Check if already refunded
        const existingRefund = await WalletTransaction_1.default.findOne({
            orderId: order._id,
            source: 'refund',
        });
        if (existingRefund) {
            res.status(400).json({
                success: false,
                message: 'Order has already been refunded, cannot decline',
            });
            return;
        }
        const customerId = order.customerId;
        const declineReason = reason || 'No reason provided';
        // Mark order as refund declined
        order.refundDeclined = true;
        order.refundDeclinedReason = declineReason;
        order.refundDeclinedAt = new Date();
        await order.save();
        // Create notification for customer about refund decline
        await Notification_1.default.create({
            userId: customerId,
            userModel: 'Customer',
            type: 'refund_response',
            title: 'Refund Declined',
            message: `Your refund request for order ${order.orderNumber} has been declined. Reason: ${declineReason}`,
            relatedId: order._id,
            relatedModel: 'Order',
            isRead: false,
        });
        res.status(200).json({
            success: true,
            message: 'Refund declined successfully',
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                reason: declineReason,
            },
        });
    }
    catch (error) {
        console.error('Error declining refund:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to decline refund',
        });
    }
};
exports.declineRefund = declineRefund;
