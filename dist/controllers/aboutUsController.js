"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAboutUs = exports.createOrUpdateAboutUs = exports.getAboutUs = void 0;
const AboutUs_1 = __importDefault(require("../models/AboutUs"));
const errorHandler_1 = require("../middlewares/errorHandler");
// Get About Us content (public)
const getAboutUs = async (req, res, next) => {
    try {
        console.log("📄 [AboutUs] Getting about us content");
        const aboutUs = await AboutUs_1.default.findOne({ isActive: true }).sort({ createdAt: -1 });
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
    }
    catch (error) {
        console.error("❌ [AboutUs] Error fetching about us:", error);
        next(error);
    }
};
exports.getAboutUs = getAboutUs;
// Create or Update About Us content (admin only)
const createOrUpdateAboutUs = async (req, res, next) => {
    try {
        console.log("📄 [AboutUs] Creating/Updating about us content - User:", req.user?.email);
        const { blocks, pageBackgroundColor } = req.body;
        console.log("📄 [AboutUs] Received data:", {
            blocksCount: blocks?.length,
            pageBackgroundColor,
            firstBlock: blocks?.[0]
        });
        // Find existing about us content
        let aboutUs = await AboutUs_1.default.findOne();
        if (aboutUs) {
            // Update existing
            aboutUs.blocks = blocks || [];
            aboutUs.pageBackgroundColor = pageBackgroundColor || "#ffffff";
            aboutUs.isActive = true;
            await aboutUs.save();
            console.log("📄 [AboutUs] About us content updated successfully, blocks:", aboutUs.blocks.length);
        }
        else {
            // Create new
            aboutUs = await AboutUs_1.default.create({
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
    }
    catch (error) {
        console.error("❌ [AboutUs] Error creating/updating about us:", error);
        next(error);
    }
};
exports.createOrUpdateAboutUs = createOrUpdateAboutUs;
// Delete About Us content (admin only)
const deleteAboutUs = async (req, res, next) => {
    try {
        console.log("📄 [AboutUs] Deleting about us content - User:", req.user?.email);
        const aboutUs = await AboutUs_1.default.findOne();
        if (!aboutUs) {
            return next(new errorHandler_1.AppError("About us content not found", 404));
        }
        aboutUs.isActive = false;
        await aboutUs.save();
        console.log("📄 [AboutUs] About us content deleted successfully");
        res.status(200).json({
            success: true,
            message: "About us content deleted successfully",
        });
    }
    catch (error) {
        console.error("❌ [AboutUs] Error deleting about us:", error);
        next(error);
    }
};
exports.deleteAboutUs = deleteAboutUs;
