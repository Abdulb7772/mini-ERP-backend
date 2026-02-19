"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const refundController_1 = require("../controllers/refundController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
// All routes require authentication and admin role
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('admin', 'superadmin'));
// Get refund statistics
router.get('/stats', refundController_1.getRefundStats);
// Get all refund transactions
router.get('/transactions', refundController_1.getAllRefunds);
// Get all orders eligible for refund
router.get('/orders', refundController_1.getRefundableOrders);
// Process refund for a specific order
router.post('/:orderId/process', refundController_1.processRefund);
// Decline refund for a specific order
router.post('/:orderId/decline', refundController_1.declineRefund);
exports.default = router;
