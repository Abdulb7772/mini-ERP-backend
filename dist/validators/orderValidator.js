"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatusValidator = exports.createOrderValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createOrderValidator = [
    // Support both old format (customerId) and new format (phone + shippingAddress)
    (0, express_validator_1.body)("customerId").optional().isMongoId().withMessage("Valid customer ID is required"),
    (0, express_validator_1.body)("phone").optional().trim().notEmpty().withMessage("Phone is required"),
    (0, express_validator_1.body)("shippingAddress").optional().trim().notEmpty().withMessage("Shipping address is required"),
    (0, express_validator_1.body)("items").isArray({ min: 1 }).withMessage("Order must have at least one item"),
    // Support both 'productId' and 'product' field names
    (0, express_validator_1.body)("items.*.product").optional().isMongoId().withMessage("Valid product ID is required"),
    (0, express_validator_1.body)("items.*.productId").optional().isMongoId().withMessage("Valid product ID is required"),
    (0, express_validator_1.body)("items.*.variationId").optional().isMongoId().withMessage("Valid variation ID required"),
    (0, express_validator_1.body)("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    (0, express_validator_1.body)("paymentMethod").optional().trim(),
    (0, express_validator_1.body)("paymentStatus").optional().trim(),
    (0, express_validator_1.body)("transactionId").optional().trim(),
    (0, express_validator_1.body)("totalAmount").optional().isNumeric().withMessage("Total amount must be a number"),
    (0, express_validator_1.body)("notes").optional().trim(),
];
exports.updateOrderStatusValidator = [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid order ID"),
    (0, express_validator_1.body)("status")
        .isIn(["pending", "processing", "shipped", "delivered", "completed", "cancelled"])
        .withMessage("Invalid status"),
];
