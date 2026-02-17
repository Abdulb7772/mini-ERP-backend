import { body, param } from "express-validator";

export const createReviewValidator = [
  body("orderId")
    .trim()
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Invalid Order ID"),
  body("productId")
    .trim()
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid Product ID"),
  body("variationId")
    .optional()
    .isMongoId()
    .withMessage("Invalid Variation ID"),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Review description is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("images")
    .optional()
    .isArray()
    .withMessage("Images must be an array"),
];

export const updateReviewValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid review ID"),
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("images")
    .optional()
    .isArray()
    .withMessage("Images must be an array"),
];

export const updateReviewStatusValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid review ID"),
  body("status")
    .isIn(["pending", "approved", "rejected"])
    .withMessage("Status must be pending, approved, or rejected"),
];
