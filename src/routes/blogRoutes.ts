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
router.get("/", authenticate, authorize("admin"), getAllBlogs);
router.post("/", authenticate, authorize("admin"), createBlog);
router.put("/:id", authenticate, authorize("admin"), updateBlog);
router.patch("/:id/toggle-status", authenticate, authorize("admin"), toggleBlogStatus);
router.delete("/:id", authenticate, authorize("admin"), deleteBlog);

export default router;
