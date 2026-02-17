import { Response } from "express";
import mongoose from "mongoose";
import Wishlist from "../models/Wishlist";
import Product from "../models/Product";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/auth";

// Add item to wishlist
export const addToWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { productId, variationId } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        items: [],
      });
    }

    // Check if item already exists in wishlist
    const existingItemIndex = wishlist.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        (variationId
          ? item.variationId?.toString() === variationId
          : !item.variationId)
    );

    if (existingItemIndex > -1) {
      return res.status(400).json({
        success: false,
        message: "Item already in wishlist",
      });
    }

    // Add new item to wishlist
    wishlist.items.push({
      productId: product._id,
      variationId: variationId || undefined,
      addedAt: new Date(),
    });

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Item added to wishlist successfully",
      data: wishlist,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error adding to wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add item to wishlist",
    });
  }
};

// Get user's wishlist
export const getWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const wishlist = await Wishlist.findOne({ userId })
      .populate("userId", "name email")
      .populate("items.productId")
      .populate("items.variationId");

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        data: {
          userId,
          items: [],
        },
      });
    }

    // Enrich items with lowest variation price if product has variations
    const enrichedItems = await Promise.all(
      wishlist.items.map(async (item: any) => {
        const productId = item.productId._id || item.productId;
        
        // Check if product has variations and get the lowest price
        const variations = await mongoose.model('Variation').find({ productId });
        let lowestPrice = item.productId.price;
        
        if (variations && variations.length > 0) {
          const prices = variations.map((v: any) => v.price);
          lowestPrice = Math.min(...prices);
        }
        
        return {
          ...item.toObject(),
          productId: {
            ...item.productId.toObject(),
            lowestPrice,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        ...wishlist.toObject(),
        items: enrichedItems,
      },
    });
  } catch (error: any) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
    });
  }
};

// Remove item from wishlist
export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { productId, variationId } = req.body;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      throw new AppError("Wishlist not found", 404);
    }

    wishlist.items = wishlist.items.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          (variationId
            ? item.variationId?.toString() === variationId
            : !item.variationId)
        )
    );

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Item removed from wishlist",
      data: wishlist,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error removing from wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove item from wishlist",
    });
  }
};

// Clear wishlist
export const clearWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      throw new AppError("Wishlist not found", 404);
    }

    wishlist.items = [];
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
      data: wishlist,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error clearing wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear wishlist",
    });
  }
};

// Check if item is in wishlist
export const checkWishlistItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { productId, variationId } = req.query;

    const wishlist = await Wishlist.findOne({ userId });
    
    if (!wishlist) {
      return res.status(200).json({
        success: true,
        data: { inWishlist: false },
      });
    }

    const exists = wishlist.items.some(
      (item) =>
        item.productId.toString() === productId &&
        (variationId
          ? item.variationId?.toString() === variationId
          : !item.variationId)
    );

    res.status(200).json({
      success: true,
      data: { inWishlist: exists },
    });
  } catch (error: any) {
    console.error("Error checking wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check wishlist",
    });
  }
};
