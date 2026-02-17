"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomerValidator = exports.createCustomerValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createCustomerValidator = [
    (0, express_validator_1.body)("name").trim().notEmpty().withMessage("Customer name is required"),
    (0, express_validator_1.body)("phone").trim().notEmpty().withMessage("Phone number is required"),
    (0, express_validator_1.body)("email").optional().trim().isEmail().withMessage("Valid email required"),
    (0, express_validator_1.body)("address").optional().trim(),
];
exports.updateCustomerValidator = [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid customer ID"),
    (0, express_validator_1.body)("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    (0, express_validator_1.body)("phone")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Phone cannot be empty"),
    (0, express_validator_1.body)("email").optional().trim().isEmail().withMessage("Valid email required"),
    (0, express_validator_1.body)("address").optional().trim(),
];
