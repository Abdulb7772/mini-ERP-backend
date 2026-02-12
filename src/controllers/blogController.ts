import { Request, Response } from "express";
import Blog from "../models/Blog";

// Get all blogs (admin - includes blocked)
export const getAllBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
};

// Get published blogs (client - only published)
export const getPublishedBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await Blog.find({ status: "published" }).sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (error) {
    console.error("Error fetching published blogs:", error);
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
};

// Get single blog by ID
export const getBlogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    
    res.status(200).json(blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ message: "Failed to fetch blog" });
  }
};

// Create new blog
export const createBlog = async (req: Request, res: Response) => {
  try {
    const { title, description, imageUrl, author } = req.body;

    if (!title || !description || !author) {
      return res.status(400).json({ message: "Title, description, and author are required" });
    }

    const blog = new Blog({
      title,
      description,
      imageUrl: imageUrl || "",
      author,
      status: "published",
    });

    const savedBlog = await blog.save();
    res.status(201).json(savedBlog);
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({ message: "Failed to create blog" });
  }
};

// Update blog
export const updateBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, author, status } = req.body;

    const blog = await Blog.findByIdAndUpdate(
      id,
      {
        title,
        description,
        imageUrl,
        author,
        status,
      },
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json(blog);
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({ message: "Failed to update blog" });
  }
};

// Toggle blog status (publish/block)
export const toggleBlogStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    blog.status = blog.status === "published" ? "blocked" : "published";
    await blog.save();

    res.status(200).json(blog);
  } catch (error) {
    console.error("Error toggling blog status:", error);
    res.status(500).json({ message: "Failed to toggle blog status" });
  }
};

// Delete blog
export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ message: "Failed to delete blog" });
  }
};
