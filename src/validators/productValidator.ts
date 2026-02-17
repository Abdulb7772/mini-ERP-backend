import { body, param } from "express-validator";

export const createProductValidator = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("sku").trim().notEmpty().withMessage("SKU is required"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("hasVariations")
    .isBoolean()
    .withMessage("hasVariations must be boolean"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("description").optional().trim(),
  body("imageUrl").optional().trim(),
  body("images").optional().isArray().withMessage("Images must be an array"),
];

export const updateProductValidator = [
  param("id").isMongoId().withMessage("Invalid product ID"),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("category")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category cannot be empty"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("description").optional().trim(),
  body("imageUrl").optional().trim(),
  body("images").optional().isArray().withMessage("Images must be an array"),
];
