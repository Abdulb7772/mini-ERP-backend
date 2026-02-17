"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLowStock = exports.getLogs = exports.stockOut = exports.stockIn = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Variation_1 = __importDefault(require("../models/Variation"));
const InventoryLog_1 = __importDefault(require("../models/InventoryLog"));
const errorHandler_1 = require("../middlewares/errorHandler");
const stockIn = async (req, res, next) => {
    try {
        const { productId, variationId, quantity, reason } = req.body;
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        if (variationId) {
            const variation = await Variation_1.default.findById(variationId);
            if (!variation) {
                throw new errorHandler_1.AppError("Variation not found", 404);
            }
            variation.stock += quantity;
            await variation.save();
        }
        else {
            product.stock += quantity;
            await product.save();
        }
        const log = await InventoryLog_1.default.create({
            productId,
            variationId,
            type: "stock_in",
            quantity,
            reason,
            performedBy: req.user?.userId,
        });
        res.status(200).json({
            status: "success",
            message: "Stock added successfully",
            data: log,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.stockIn = stockIn;
const stockOut = async (req, res, next) => {
    try {
        const { productId, variationId, quantity, reason } = req.body;
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        if (variationId) {
            const variation = await Variation_1.default.findById(variationId);
            if (!variation) {
                throw new errorHandler_1.AppError("Variation not found", 404);
            }
            if (variation.stock < quantity) {
                throw new errorHandler_1.AppError("Insufficient stock", 400);
            }
            variation.stock -= quantity;
            await variation.save();
        }
        else {
            if (product.stock < quantity) {
                throw new errorHandler_1.AppError("Insufficient stock", 400);
            }
            product.stock -= quantity;
            await product.save();
        }
        const log = await InventoryLog_1.default.create({
            productId,
            variationId,
            type: "stock_out",
            quantity,
            reason,
            performedBy: req.user?.userId,
        });
        res.status(200).json({
            status: "success",
            message: "Stock removed successfully",
            data: log,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.stockOut = stockOut;
const getLogs = async (req, res, next) => {
    try {
        const logs = await InventoryLog_1.default.find()
            .populate("productId", "name sku")
            .populate("variationId", "name sku")
            .populate("performedBy", "name email")
            .sort({ createdAt: -1 })
            .limit(100);
        res.status(200).json({
            status: "success",
            data: logs,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getLogs = getLogs;
const getLowStock = async (req, res, next) => {
    try {
        const threshold = parseInt(req.query.threshold) || 10;
        const products = await Product_1.default.find({
            stock: { $lte: threshold },
            hasVariations: false,
            isActive: true,
        }).sort({ stock: 1 });
        res.status(200).json({
            status: "success",
            data: products,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getLowStock = getLowStock;
