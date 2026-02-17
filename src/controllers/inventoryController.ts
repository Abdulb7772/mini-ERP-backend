import { Response, NextFunction } from "express";
import Product from "../models/Product";
import Variation from "../models/Variation";
import InventoryLog from "../models/InventoryLog";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/auth";

export const stockIn = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId, variationId, quantity, reason } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    if (variationId) {
      const variation = await Variation.findById(variationId);
      if (!variation) {
        throw new AppError("Variation not found", 404);
      }
      variation.stock += quantity;
      await variation.save();
    } else {
      product.stock += quantity;
      await product.save();
    }

    const log = await InventoryLog.create({
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
  } catch (error) {
    next(error);
  }
};

export const stockOut = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId, variationId, quantity, reason } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    if (variationId) {
      const variation = await Variation.findById(variationId);
      if (!variation) {
        throw new AppError("Variation not found", 404);
      }
      if (variation.stock < quantity) {
        throw new AppError("Insufficient stock", 400);
      }
      variation.stock -= quantity;
      await variation.save();
    } else {
      if (product.stock < quantity) {
        throw new AppError("Insufficient stock", 400);
      }
      product.stock -= quantity;
      await product.save();
    }

    const log = await InventoryLog.create({
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
  } catch (error) {
    next(error);
  }
};

export const getLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const logs = await InventoryLog.find()
      .populate("productId", "name sku")
      .populate("variationId", "name sku")
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      status: "success",
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

export const getLowStock = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 10;

    const products = await Product.find({
      stock: { $lte: threshold },
      hasVariations: false,
      isActive: true,
    }).sort({ stock: 1 });

    res.status(200).json({
      status: "success",
      data: products,
    });
  } catch (error) {
    next(error);
  }
};
