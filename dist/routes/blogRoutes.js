"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const blogController_1 = require("../controllers/blogController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
// Public routes
router.get("/published", blogController_1.getPublishedBlogs);
router.get("/:id", blogController_1.getBlogById);
// Admin routes
router.get("/", auth_1.authenticate, (0, auth_1.authorize)("admin"), blogController_1.getAllBlogs);
router.post("/", auth_1.authenticate, (0, auth_1.authorize)("admin"), blogController_1.createBlog);
router.put("/:id", auth_1.authenticate, (0, auth_1.authorize)("admin"), blogController_1.updateBlog);
router.patch("/:id/toggle-status", auth_1.authenticate, (0, auth_1.authorize)("admin"), blogController_1.toggleBlogStatus);
router.delete("/:id", auth_1.authenticate, (0, auth_1.authorize)("admin"), blogController_1.deleteBlog);
exports.default = router;
