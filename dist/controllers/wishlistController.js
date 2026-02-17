"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWishlistItem = exports.clearWishlist = exports.removeFromWishlist = exports.getWishlist = exports.addToWishlist = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Wishlist_1 = __importDefault(require("../models/Wishlist"));
const Product_1 = __importDefault(require("../models/Product"));
const errorHandler_1 = require("../middlewares/errorHandler");
// Add item to wishlist
const addToWishlist = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { productId, variationId } = req.body;
        // Validate product exists
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        // Find or create wishlist
        let wishlist = await Wishlist_1.default.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist_1.default({
                userId,
                items: [],
            });
        }
        // Check if item already exists in wishlist
        const existingItemIndex = wishlist.items.findIndex((item) => item.productId.toString() === productId &&
            (variationId
                ? item.variationId?.toString() === variationId
                : !item.variationId));
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError) {
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
exports.addToWishlist = addToWishlist;
// Get user's wishlist
const getWishlist = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const wishlist = await Wishlist_1.default.findOne({ userId })
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
        const enrichedItems = await Promise.all(wishlist.items.map(async (item) => {
            const productId = item.productId._id || item.productId;
            // Check if product has variations and get the lowest price
            const variations = await mongoose_1.default.model('Variation').find({ productId });
            let lowestPrice = item.productId.price;
            if (variations && variations.length > 0) {
                const prices = variations.map((v) => v.price);
                lowestPrice = Math.min(...prices);
            }
            return {
                ...item.toObject(),
                productId: {
                    ...item.productId.toObject(),
                    lowestPrice,
                },
            };
        }));
        res.status(200).json({
            success: true,
            data: {
                ...wishlist.toObject(),
                items: enrichedItems,
            },
        });
    }
    catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch wishlist",
        });
    }
};
exports.getWishlist = getWishlist;
// Remove item from wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { productId, variationId } = req.body;
        const wishlist = await Wishlist_1.default.findOne({ userId });
        if (!wishlist) {
            throw new errorHandler_1.AppError("Wishlist not found", 404);
        }
        wishlist.items = wishlist.items.filter((item) => !(item.productId.toString() === productId &&
            (variationId
                ? item.variationId?.toString() === variationId
                : !item.variationId)));
        await wishlist.save();
        res.status(200).json({
            success: true,
            message: "Item removed from wishlist",
            data: wishlist,
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError) {
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
exports.removeFromWishlist = removeFromWishlist;
// Clear wishlist
const clearWishlist = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const wishlist = await Wishlist_1.default.findOne({ userId });
        if (!wishlist) {
            throw new errorHandler_1.AppError("Wishlist not found", 404);
        }
        wishlist.items = [];
        await wishlist.save();
        res.status(200).json({
            success: true,
            message: "Wishlist cleared successfully",
            data: wishlist,
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError) {
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
exports.clearWishlist = clearWishlist;
// Check if item is in wishlist
const checkWishlistItem = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { productId, variationId } = req.query;
        const wishlist = await Wishlist_1.default.findOne({ userId });
        if (!wishlist) {
            return res.status(200).json({
                success: true,
                data: { inWishlist: false },
            });
        }
        const exists = wishlist.items.some((item) => item.productId.toString() === productId &&
            (variationId
                ? item.variationId?.toString() === variationId
                : !item.variationId));
        res.status(200).json({
            success: true,
            data: { inWishlist: exists },
        });
    }
    catch (error) {
        console.error("Error checking wishlist:", error);
        res.status(500).json({
            success: false,
            message: "Failed to check wishlist",
        });
    }
};
exports.checkWishlistItem = checkWishlistItem;
