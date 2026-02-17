"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBlog = exports.toggleBlogStatus = exports.updateBlog = exports.createBlog = exports.getBlogById = exports.getPublishedBlogs = exports.getAllBlogs = void 0;
const Blog_1 = __importDefault(require("../models/Blog"));
// Get all blogs (admin - includes blocked)
const getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog_1.default.find().sort({ createdAt: -1 });
        res.status(200).json(blogs);
    }
    catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).json({ message: "Failed to fetch blogs" });
    }
};
exports.getAllBlogs = getAllBlogs;
// Get published blogs (client - only published)
const getPublishedBlogs = async (req, res) => {
    try {
        const blogs = await Blog_1.default.find({ status: "published" }).sort({ createdAt: -1 });
        res.status(200).json(blogs);
    }
    catch (error) {
        console.error("Error fetching published blogs:", error);
        res.status(500).json({ message: "Failed to fetch blogs" });
    }
};
exports.getPublishedBlogs = getPublishedBlogs;
// Get single blog by ID
const getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog_1.default.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        res.status(200).json(blog);
    }
    catch (error) {
        console.error("Error fetching blog:", error);
        res.status(500).json({ message: "Failed to fetch blog" });
    }
};
exports.getBlogById = getBlogById;
// Create new blog
const createBlog = async (req, res) => {
    try {
        const { title, description, imageUrl, author } = req.body;
        if (!title || !description || !author) {
            return res.status(400).json({ message: "Title, description, and author are required" });
        }
        const blog = new Blog_1.default({
            title,
            description,
            imageUrl: imageUrl || "",
            author,
            status: "published",
        });
        const savedBlog = await blog.save();
        res.status(201).json(savedBlog);
    }
    catch (error) {
        console.error("Error creating blog:", error);
        res.status(500).json({ message: "Failed to create blog" });
    }
};
exports.createBlog = createBlog;
// Update blog
const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, imageUrl, author, status } = req.body;
        const blog = await Blog_1.default.findByIdAndUpdate(id, {
            title,
            description,
            imageUrl,
            author,
            status,
        }, { new: true, runValidators: true });
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        res.status(200).json(blog);
    }
    catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({ message: "Failed to update blog" });
    }
};
exports.updateBlog = updateBlog;
// Toggle blog status (publish/block)
const toggleBlogStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog_1.default.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        blog.status = blog.status === "published" ? "blocked" : "published";
        await blog.save();
        res.status(200).json(blog);
    }
    catch (error) {
        console.error("Error toggling blog status:", error);
        res.status(500).json({ message: "Failed to toggle blog status" });
    }
};
exports.toggleBlogStatus = toggleBlogStatus;
// Delete blog
const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog_1.default.findByIdAndDelete(id);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        res.status(200).json({ message: "Blog deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({ message: "Failed to delete blog" });
    }
};
exports.deleteBlog = deleteBlog;
