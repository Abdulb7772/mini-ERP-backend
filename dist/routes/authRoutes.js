"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const authValidator_1 = require("../validators/authValidator");
const router = express_1.default.Router();
router.post("/register", authValidator_1.registerValidator, validate_1.validate, authController_1.register);
router.post("/login", authValidator_1.loginValidator, validate_1.validate, authController_1.login);
router.get("/me", auth_1.authenticate, authController_1.getMe);
router.get("/verify-email", userController_1.verifyEmail); // Public route - accepts token as query param
router.post("/resend-verification", userController_1.resendVerificationEmail); // Public route - accepts email in body
exports.default = router;
