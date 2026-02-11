import { body } from "express-validator";

export const stockInValidator = [
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  body("variationId").optional().isMongoId().withMessage("Valid variation ID required"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("reason").trim().notEmpty().withMessage("Reason is required"),
];

export const stockOutValidator = [
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  body("variationId").optional().isMongoId().withMessage("Valid variation ID required"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("reason").trim().notEmpty().withMessage("Reason is required"),
];
