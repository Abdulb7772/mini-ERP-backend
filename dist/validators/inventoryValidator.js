"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockOutValidator = exports.stockInValidator = void 0;
const express_validator_1 = require("express-validator");
exports.stockInValidator = [
    (0, express_validator_1.body)("productId").isMongoId().withMessage("Valid product ID is required"),
    (0, express_validator_1.body)("variationId").optional().isMongoId().withMessage("Valid variation ID required"),
    (0, express_validator_1.body)("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    (0, express_validator_1.body)("reason").trim().notEmpty().withMessage("Reason is required"),
];
exports.stockOutValidator = [
    (0, express_validator_1.body)("productId").isMongoId().withMessage("Valid product ID is required"),
    (0, express_validator_1.body)("variationId").optional().isMongoId().withMessage("Valid variation ID required"),
    (0, express_validator_1.body)("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    (0, express_validator_1.body)("reason").trim().notEmpty().withMessage("Reason is required"),
];
