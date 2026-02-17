"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const userValidator_1 = require("../validators/userValidator");
const router = express_1.default.Router();
router.post("/verify-email", userController_1.verifyEmail); // Public route
// Protected routes
router.use(auth_1.authenticate);
router.get("/", (0, auth_1.authorize)("admin", "manager"), userController_1.getUsers);
router.post("/", (0, auth_1.authorize)("admin"), userValidator_1.createUserValidator, validate_1.validate, userController_1.createUser);
router.put("/:id", (0, auth_1.authorize)("admin"), userValidator_1.updateUserValidator, validate_1.validate, userController_1.updateUser);
router.delete("/:id", (0, auth_1.authorize)("admin"), userController_1.deleteUser);
router.patch("/:id/toggle-status", (0, auth_1.authorize)("admin"), userController_1.toggleUserStatus);
router.post("/:id/resend-verification", (0, auth_1.authorize)("admin"), userController_1.resendVerificationEmail);
exports.default = router;
