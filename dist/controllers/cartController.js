"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.getCart = exports.addToCart = void 0;
const Cart_1 = __importDefault(require("../models/Cart"));
const Product_1 = __importDefault(require("../models/Product"));
const Variation_1 = __importDefault(require("../models/Variation"));
const errorHandler_1 = require("../middlewares/errorHandler");
// Add item to cart
const addToCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { productId, variationId, quantity } = req.body;
        // Validate product exists
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        let price = product.price;
        let availableStock = product.stock;
        let variationDetails = undefined;
        let imageUrl = product.imageUrl;
        // If variation is selected
        if (variationId) {
            const variation = await Variation_1.default.findOne({
                _id: variationId,
                productId,
            });
            if (!variation) {
                throw new errorHandler_1.AppError("Variation not found", 404);
            }
            price = variation.price;
            availableStock = variation.stock;
            variationDetails = {
                size: variation.size,
                color: variation.color,
            };
        }
        // Check stock availability
        if (availableStock < quantity) {
            throw new errorHandler_1.AppError("Insufficient stock available", 400);
        }
        // Find or create cart
        let cart = await Cart_1.default.findOne({ userId });
        if (!cart) {
            cart = new Cart_1.default({
                userId,
                items: [],
            });
        }
        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex((item) => item.productId.toString() === productId &&
            (variationId
                ? item.variationId?.toString() === variationId
                : !item.variationId));
        if (existingItemIndex > -1) {
            // Update quantity of existing item
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            // Check if new quantity exceeds stock
            if (newQuantity > availableStock) {
                throw new errorHandler_1.AppError("Cannot add more items than available in stock", 400);
            }
            cart.items[existingItemIndex].quantity = newQuantity;
        }
        else {
            // Add new item to cart
            cart.items.push({
                productId: product._id,
                variationId: variationId || undefined,
                name: product.name,
                price,
                quantity,
                imageUrl,
                variationDetails,
            });
        }
        await cart.save();
        res.status(200).json({
            success: true,
            message: "Item added to cart successfully",
            data: cart,
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        console.error("Error adding to cart:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add item to cart",
        });
    }
};
exports.addToCart = addToCart;
// Get user's cart
const getCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const cart = await Cart_1.default.findOne({ userId }).populate("userId", "name email");
        if (!cart) {
            return res.status(200).json({
                success: true,
                data: {
                    userId,
                    items: [],
                    totalAmount: 0,
                },
            });
        }
        res.status(200).json({
            success: true,
            data: cart,
        });
    }
    catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch cart",
        });
    }
};
exports.getCart = getCart;
// Update cart item quantity
const updateCartItem = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { productId, variationId, quantity } = req.body;
        if (quantity < 1) {
            throw new errorHandler_1.AppError("Quantity must be at least 1", 400);
        }
        const cart = await Cart_1.default.findOne({ userId });
        if (!cart) {
            throw new errorHandler_1.AppError("Cart not found", 404);
        }
        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId &&
            (variationId
                ? item.variationId?.toString() === variationId
                : !item.variationId));
        if (itemIndex === -1) {
            throw new errorHandler_1.AppError("Item not found in cart", 404);
        }
        // Check stock availability
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        let availableStock = product.stock;
        if (variationId) {
            const variation = await Variation_1.default.findById(variationId);
            if (variation) {
                availableStock = variation.stock;
            }
        }
        if (quantity > availableStock) {
            throw new errorHandler_1.AppError("Insufficient stock available", 400);
        }
        cart.items[itemIndex].quantity = quantity;
        await cart.save();
        res.status(200).json({
            success: true,
            message: "Cart updated successfully",
            data: cart,
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        console.error("Error updating cart:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update cart",
        });
    }
};
exports.updateCartItem = updateCartItem;
// Remove item from cart
const removeFromCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { productId, variationId } = req.body;
        const cart = await Cart_1.default.findOne({ userId });
        if (!cart) {
            throw new errorHandler_1.AppError("Cart not found", 404);
        }
        cart.items = cart.items.filter((item) => !(item.productId.toString() === productId &&
            (variationId
                ? item.variationId?.toString() === variationId
                : !item.variationId)));
        await cart.save();
        res.status(200).json({
            success: true,
            message: "Item removed from cart",
            data: cart,
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        console.error("Error removing from cart:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove item from cart",
        });
    }
};
exports.removeFromCart = removeFromCart;
// Clear cart
const clearCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const cart = await Cart_1.default.findOne({ userId });
        if (!cart) {
            throw new errorHandler_1.AppError("Cart not found", 404);
        }
        cart.items = [];
        await cart.save();
        res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
            data: cart,
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        console.error("Error clearing cart:", error);
        res.status(500).json({
            success: false,
            message: "Failed to clear cart",
        });
    }
};
exports.clearCart = clearCart;
