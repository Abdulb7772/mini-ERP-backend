import express from 'express';
import {
  getRefundableOrders,
  processRefund,
  declineRefund,
  getRefundStats,
  getAllRefunds,
} from '../controllers/refundController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

// Get refund statistics
router.get('/stats', getRefundStats);

// Get all refund transactions
router.get('/transactions', getAllRefunds);

// Get all orders eligible for refund
router.get('/orders', getRefundableOrders);

// Process refund for a specific order
router.post('/:orderId/process', processRefund);

// Decline refund for a specific order
router.post('/:orderId/decline', declineRefund);

export default router;
