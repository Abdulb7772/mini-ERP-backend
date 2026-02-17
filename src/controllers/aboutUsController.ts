import { Response, NextFunction } from "express";
import AboutUs from "../models/AboutUs";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/auth";

// Get About Us content (public)
export const getAboutUs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("📄 [AboutUs] Getting about us content");
    
    const aboutUs = await AboutUs.findOne({ isActive: true }).sort({ createdAt: -1 });
    
    if (!aboutUs) {
      console.log("📄 [AboutUs] No about us content found");
      return res.status(404).json({
        success: false,
        message: "About us content not found",
      });
    }

    console.log("📄 [AboutUs] About us content fetched successfully, blocks:", aboutUs.blocks.length);
    console.log("📄 [AboutUs] First block:", aboutUs.blocks[0]);
    
    res.status(200).json({
      success: true,
      data: aboutUs,
    });
  } catch (error) {
    console.error("❌ [AboutUs] Error fetching about us:", error);
    next(error);
  }
};

// Create or Update About Us content (admin only)
export const createOrUpdateAboutUs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("📄 [AboutUs] Creating/Updating about us content - User:", req.user?.email);
    
    const { blocks, pageBackgroundColor } = req.body;

    console.log("📄 [AboutUs] Received data:", {
      blocksCount: blocks?.length,
      pageBackgroundColor,
      firstBlock: blocks?.[0]
    });

    // Find existing about us content
    let aboutUs = await AboutUs.findOne();

    if (aboutUs) {
      // Update existing
      aboutUs.blocks = blocks || [];
      aboutUs.pageBackgroundColor = pageBackgroundColor || "#ffffff";
      aboutUs.isActive = true;
      
      await aboutUs.save();
      console.log("📄 [AboutUs] About us content updated successfully, blocks:", aboutUs.blocks.length);
    } else {
      // Create new
      aboutUs = await AboutUs.create({
        blocks: blocks || [],
        pageBackgroundColor: pageBackgroundColor || "#ffffff",
      });
      console.log("📄 [AboutUs] About us content created successfully, blocks:", aboutUs.blocks.length);
    }

    console.log("📄 [AboutUs] Returning data with", aboutUs.blocks.length, "blocks");

    res.status(200).json({
      success: true,
      message: aboutUs ? "About us updated successfully" : "About us created successfully",
      data: aboutUs,
    });
  } catch (error) {
    console.error("❌ [AboutUs] Error creating/updating about us:", error);
    next(error);
  }
};

// Delete About Us content (admin only)
export const deleteAboutUs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("📄 [AboutUs] Deleting about us content - User:", req.user?.email);
    
    const aboutUs = await AboutUs.findOne();
    
    if (!aboutUs) {
      return next(new AppError("About us content not found", 404));
    }

    aboutUs.isActive = false;
    await aboutUs.save();

    console.log("📄 [AboutUs] About us content deleted successfully");
    res.status(200).json({
      success: true,
      message: "About us content deleted successfully",
    });
  } catch (error) {
    console.error("❌ [AboutUs] Error deleting about us:", error);
    next(error);
  }
};
