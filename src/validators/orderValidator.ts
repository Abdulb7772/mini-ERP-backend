import { body, param } from "express-validator";

export const createOrderValidator = [
  // Support both old format (customerId) and new format (phone + shippingAddress)
  body("customerId").optional().isMongoId().withMessage("Valid customer ID is required"),
  body("phone").optional().trim().notEmpty().withMessage("Phone is required"),
  body("shippingAddress").optional().trim().notEmpty().withMessage("Shipping address is required"),
  body("items").isArray({ min: 1 }).withMessage("Order must have at least one item"),
  // Support both 'productId' and 'product' field names
  body("items.*.product").optional().isMongoId().withMessage("Valid product ID is required"),
  body("items.*.productId").optional().isMongoId().withMessage("Valid product ID is required"),
  body("items.*.variationId").optional().isMongoId().withMessage("Valid variation ID required"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("paymentMethod").optional().trim(),
  body("paymentStatus").optional().trim(),
  body("transactionId").optional().trim(),
  body("totalAmount").optional().isNumeric().withMessage("Total amount must be a number"),
  body("notes").optional().trim(),
];

export const updateOrderStatusValidator = [
  param("id").isMongoId().withMessage("Invalid order ID"),
  body("status")
    .isIn(["pending", "processing", "completed", "cancelled"])
    .withMessage("Invalid status"),
];
