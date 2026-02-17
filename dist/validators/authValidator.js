"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerValidator = exports.loginValidator = void 0;
const express_validator_1 = require("express-validator");
exports.loginValidator = [
    (0, express_validator_1.body)("email").trim().isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("password").trim().notEmpty().withMessage("Password is required"),
];
exports.registerValidator = [
    (0, express_validator_1.body)("name").trim().notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("email").trim().isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("password")
        .trim()
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters"),
    (0, express_validator_1.body)("role")
        .optional()
        .isIn(["admin", "manager", "staff", "customer"])
        .withMessage("Invalid role"),
    (0, express_validator_1.body)("phone")
        .trim()
        .isLength({ min: 10 })
        .withMessage("Phone must be at least 10 characters"),
    (0, express_validator_1.body)("address")
        .optional()
        .trim()
        .isLength({ min: 5 })
        .withMessage("Address must be at least 5 characters"),
];
