import { body, param } from "express-validator";

export const createTeamValidator = [
  body("name").trim().notEmpty().withMessage("Team name is required"),
  body("description").optional().trim(),
  body("members").optional().isArray().withMessage("Members must be an array"),
  body("members.*").optional().isMongoId().withMessage("Invalid member ID"),
];

export const updateTeamValidator = [
  param("id").isMongoId().withMessage("Invalid team ID"),
  body("name").optional().trim().notEmpty().withMessage("Team name cannot be empty"),
  body("description").optional().trim(),
  body("members").optional().isArray().withMessage("Members must be an array"),
  body("members.*").optional().isMongoId().withMessage("Invalid member ID"),
];
