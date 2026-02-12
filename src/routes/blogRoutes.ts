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
import { authenticateToken, authorizeRole } from "../middlewares/auth";

const router = express.Router();

// Public routes
router.get("/published", getPublishedBlogs);
router.get("/:id", getBlogById);

// Admin routes
router.get("/", authenticateToken, authorizeRole(["admin"]), getAllBlogs);
router.post("/", authenticateToken, authorizeRole(["admin"]), createBlog);
router.put("/:id", authenticateToken, authorizeRole(["admin"]), updateBlog);
router.patch("/:id/toggle-status", authenticateToken, authorizeRole(["admin"]), toggleBlogStatus);
router.delete("/:id", authenticateToken, authorizeRole(["admin"]), deleteBlog);

export default router;
