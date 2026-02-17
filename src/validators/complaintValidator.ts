import { body } from "express-validator";

export const createComplaintValidator = [
  body("orderId")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Invalid order ID"),
  body("subject")
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Subject must be between 3 and 200 characters")
    .trim(),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters")
    .trim(),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),
];

export const updateComplaintValidator = [
  body("status")
    .optional()
    .isIn(["pending", "in-review", "resolved", "rejected"])
    .withMessage("Invalid status value"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),
  body("response")
    .optional()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Response must be between 1 and 2000 characters")
    .trim(),
];
