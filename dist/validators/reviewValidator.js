"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReviewStatusValidator = exports.updateReviewValidator = exports.createReviewValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createReviewValidator = [
    (0, express_validator_1.body)("orderId")
        .trim()
        .notEmpty()
        .withMessage("Order ID is required")
        .isMongoId()
        .withMessage("Invalid Order ID"),
    (0, express_validator_1.body)("productId")
        .trim()
        .notEmpty()
        .withMessage("Product ID is required")
        .isMongoId()
        .withMessage("Invalid Product ID"),
    (0, express_validator_1.body)("variationId")
        .optional()
        .isMongoId()
        .withMessage("Invalid Variation ID"),
    (0, express_validator_1.body)("rating")
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5"),
    (0, express_validator_1.body)("description")
        .trim()
        .notEmpty()
        .withMessage("Review description is required")
        .isLength({ min: 10, max: 2000 })
        .withMessage("Description must be between 10 and 2000 characters"),
    (0, express_validator_1.body)("images")
        .optional()
        .isArray()
        .withMessage("Images must be an array"),
];
exports.updateReviewValidator = [
    (0, express_validator_1.param)("id")
        .isMongoId()
        .withMessage("Invalid review ID"),
    (0, express_validator_1.body)("rating")
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5"),
    (0, express_validator_1.body)("description")
        .optional()
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage("Description must be between 10 and 2000 characters"),
    (0, express_validator_1.body)("images")
        .optional()
        .isArray()
        .withMessage("Images must be an array"),
];
exports.updateReviewStatusValidator = [
    (0, express_validator_1.param)("id")
        .isMongoId()
        .withMessage("Invalid review ID"),
    (0, express_validator_1.body)("status")
        .isIn(["pending", "approved", "rejected"])
        .withMessage("Status must be pending, approved, or rejected"),
];
