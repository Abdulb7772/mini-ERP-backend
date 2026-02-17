import { body, param } from "express-validator";

export const createCustomerValidator = [
  body("name").trim().notEmpty().withMessage("Customer name is required"),
  body("phone").trim().notEmpty().withMessage("Phone number is required"),
  body("email").optional().trim().isEmail().withMessage("Valid email required"),
  body("address").optional().trim(),
];

export const updateCustomerValidator = [
  param("id").isMongoId().withMessage("Invalid customer ID"),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("phone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Phone cannot be empty"),
  body("email").optional().trim().isEmail().withMessage("Valid email required"),
  body("address").optional().trim(),
];
