"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductValidator = exports.createProductValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createProductValidator = [
    (0, express_validator_1.body)("name").trim().notEmpty().withMessage("Product name is required"),
    (0, express_validator_1.body)("sku").trim().notEmpty().withMessage("SKU is required"),
    (0, express_validator_1.body)("category").trim().notEmpty().withMessage("Category is required"),
    (0, express_validator_1.body)("price")
        .isFloat({ min: 0 })
        .withMessage("Price must be a positive number"),
    (0, express_validator_1.body)("hasVariations")
        .isBoolean()
        .withMessage("hasVariations must be boolean"),
    (0, express_validator_1.body)("stock")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Stock must be a non-negative integer"),
    (0, express_validator_1.body)("description").optional().trim(),
    (0, express_validator_1.body)("imageUrl").optional().trim(),
    (0, express_validator_1.body)("images").optional().isArray().withMessage("Images must be an array"),
];
exports.updateProductValidator = [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid product ID"),
    (0, express_validator_1.body)("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    (0, express_validator_1.body)("category")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Category cannot be empty"),
    (0, express_validator_1.body)("price")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Price must be a positive number"),
    (0, express_validator_1.body)("description").optional().trim(),
    (0, express_validator_1.body)("imageUrl").optional().trim(),
    (0, express_validator_1.body)("images").optional().isArray().withMessage("Images must be an array"),
];
