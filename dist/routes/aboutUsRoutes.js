"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aboutUsController_1 = require("../controllers/aboutUsController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
// Public route - anyone can view
router.get("/", aboutUsController_1.getAboutUs);
// Protected routes - admin only
router.post("/", auth_1.authenticate, (0, auth_1.authorize)("admin"), aboutUsController_1.createOrUpdateAboutUs);
router.put("/", auth_1.authenticate, (0, auth_1.authorize)("admin"), aboutUsController_1.createOrUpdateAboutUs);
router.delete("/", auth_1.authenticate, (0, auth_1.authorize)("admin"), aboutUsController_1.deleteAboutUs);
exports.default = router;
