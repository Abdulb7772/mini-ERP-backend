"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateComplaintValidator = exports.createComplaintValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createComplaintValidator = [
    (0, express_validator_1.body)("orderId")
        .notEmpty()
        .withMessage("Order ID is required")
        .isMongoId()
        .withMessage("Invalid order ID"),
    (0, express_validator_1.body)("subject")
        .notEmpty()
        .withMessage("Subject is required")
        .isLength({ min: 3, max: 200 })
        .withMessage("Subject must be between 3 and 200 characters")
        .trim(),
    (0, express_validator_1.body)("description")
        .notEmpty()
        .withMessage("Description is required")
        .isLength({ min: 10, max: 2000 })
        .withMessage("Description must be between 10 and 2000 characters")
        .trim(),
    (0, express_validator_1.body)("priority")
        .optional()
        .isIn(["low", "medium", "high"])
        .withMessage("Priority must be low, medium, or high"),
];
exports.updateComplaintValidator = [
    (0, express_validator_1.body)("status")
        .optional()
        .isIn(["pending", "in-review", "resolved", "rejected"])
        .withMessage("Invalid status value"),
    (0, express_validator_1.body)("priority")
        .optional()
        .isIn(["low", "medium", "high"])
        .withMessage("Priority must be low, medium, or high"),
    (0, express_validator_1.body)("response")
        .optional()
        .isLength({ min: 1, max: 2000 })
        .withMessage("Response must be between 1 and 2000 characters")
        .trim(),
];
