"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserValidator = exports.createUserValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createUserValidator = [
    (0, express_validator_1.body)("name").trim().notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("email").trim().isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("password")
        .trim()
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters"),
    (0, express_validator_1.body)("role")
        .isIn(["admin", "manager", "staff"])
        .withMessage("Invalid role"),
];
exports.updateUserValidator = [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid user ID"),
    (0, express_validator_1.body)("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    (0, express_validator_1.body)("email").optional().trim().isEmail().withMessage("Valid email required"),
    (0, express_validator_1.body)("role")
        .optional()
        .isIn(["admin", "manager", "staff"])
        .withMessage("Invalid role"),
];
