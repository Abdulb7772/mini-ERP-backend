import express from "express";
import {
  getAllBlogs,
  getPublishedBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  toggleBlogStatus,
  deleteBlog,
} from "../controllers/blogController";
import { authenticate, authorize } from "../middlewares/auth";

const router = express.Router();

// Public routes
router.get("/published", getPublishedBlogs);
router.get("/:id", getBlogById);

// Admin routes
router.get("/", authenticate, authorize("admin", "blog_manager"), getAllBlogs);
router.post("/", authenticate, authorize("admin", "blog_manager"), createBlog);
router.put("/:id", authenticate, authorize("admin", "blog_manager"), updateBlog);
router.patch("/:id/toggle-status", authenticate, authorize("admin", "blog_manager"), toggleBlogStatus);
router.delete("/:id", authenticate, authorize("admin", "blog_manager"), deleteBlog);

export default router;
