import { body, param } from "express-validator";

export const createUserValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("password")
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .isIn(["admin", "manager", "staff"])
    .withMessage("Invalid role"),
];

export const updateUserValidator = [
  param("id").isMongoId().withMessage("Invalid user ID"),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().trim().isEmail().withMessage("Valid email required"),
  body("role")
    .optional()
    .isIn(["admin", "manager", "staff"])
    .withMessage("Invalid role"),
];
