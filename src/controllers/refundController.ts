import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Order from '../models/Order';
import Wallet from '../models/Wallet';
import WalletTransaction from '../models/WalletTransaction';
import Notification from '../models/Notification';
import { addPoints } from './walletController';
import mongoose from 'mongoose';

/**
 * Get all orders eligible for refund (paid orders)
 */
export const getRefundableOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', search = '', status = '' } = req.query;

    // Build query for paid orders
    const query: any = {
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

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .populate('customerId', 'name email')
        .populate('items.productId', 'name images'),
      Order.countDocuments(query),
    ]);

    // Get wallet info for each order's user to show current balance
    const ordersWithWalletInfo = await Promise.all(
      orders.map(async (order) => {
        const orderObj = order.toObject();
        const wallet = await Wallet.findOne({ userId: (order as any).customerId });
        
        // Check if this order has been refunded
        const refundTransaction = await WalletTransaction.findOne({
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
      })
    );

    res.status(200).json({
      success: true,
      data: ordersWithWalletInfo,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
        totalItems: total,
        itemsPerPage: parseInt(limit as string),
      },
    });
  } catch (error: any) {
    console.error('Error getting refundable orders:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get refundable orders',
    });
  }
};

/**
 * Process refund for an order
 */
export const processRefund = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const order = await Order.findById(orderId);

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
    const existingRefund = await WalletTransaction.findOne({
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
    const customerId = (order as any).customerId;
    const result = await addPoints(
      customerId instanceof mongoose.Types.ObjectId ? customerId : new mongoose.Types.ObjectId(customerId as string),
      amount,
      'refund',
      description,
      order._id as mongoose.Types.ObjectId,
      new mongoose.Types.ObjectId(adminId)
    );

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: result.message || 'Failed to process refund',
      });
      return;
    }

    // Create notification for customer about refund approval
    await Notification.create({
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
  } catch (error: any) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund',
    });
  }
};

/**
 * Get refund statistics
 */
export const getRefundStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalRefunds, totalRefundAmount, recentRefunds] = await Promise.all([
      WalletTransaction.countDocuments({ source: 'refund' }),
      WalletTransaction.aggregate([
        { $match: { source: 'refund' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      WalletTransaction.find({ source: 'refund' })
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
  } catch (error: any) {
    console.error('Error getting refund stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get refund stats',
    });
  }
};

/**
 * Get all refund transactions
 */
export const getAllRefunds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [refunds, total] = await Promise.all([
      WalletTransaction.find({ source: 'refund' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .populate('userId', 'name email')
        .populate('orderId', 'orderNumber totalAmount status')
        .populate('processedBy', 'name email'),
      WalletTransaction.countDocuments({ source: 'refund' }),
    ]);

    res.status(200).json({
      success: true,
      data: refunds,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
        totalItems: total,
        itemsPerPage: parseInt(limit as string),
      },
    });
  } catch (error: any) {
    console.error('Error getting refunds:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get refunds',
    });
  }
};

/**
 * Decline refund for an order
 */
export const declineRefund = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const order = await Order.findById(orderId);

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
    const existingRefund = await WalletTransaction.findOne({
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

    const customerId = (order as any).customerId;
    const declineReason = reason || 'No reason provided';

    // Mark order as refund declined
    order.refundDeclined = true;
    order.refundDeclinedReason = declineReason;
    order.refundDeclinedAt = new Date();
    await order.save();

    // Create notification for customer about refund decline
    await Notification.create({
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
  } catch (error: any) {
    console.error('Error declining refund:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to decline refund',
    });
  }
};
