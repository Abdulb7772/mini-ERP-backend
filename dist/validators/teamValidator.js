"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTeamValidator = exports.createTeamValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createTeamValidator = [
    (0, express_validator_1.body)("name").trim().notEmpty().withMessage("Team name is required"),
    (0, express_validator_1.body)("description").optional().trim(),
    (0, express_validator_1.body)("members").optional().isArray().withMessage("Members must be an array"),
    (0, express_validator_1.body)("members.*").optional().isMongoId().withMessage("Invalid member ID"),
];
exports.updateTeamValidator = [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid team ID"),
    (0, express_validator_1.body)("name").optional().trim().notEmpty().withMessage("Team name cannot be empty"),
    (0, express_validator_1.body)("description").optional().trim(),
    (0, express_validator_1.body)("members").optional().isArray().withMessage("Members must be an array"),
    (0, express_validator_1.body)("members.*").optional().isMongoId().withMessage("Invalid member ID"),
];
