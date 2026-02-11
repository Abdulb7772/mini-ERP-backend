import { Response, NextFunction } from "express";
import Product from "../models/Product";
import Order from "../models/Order";
import { AuthRequest } from "../middlewares/auth";

export const getStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });

    const salesData = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const lowStockCount = await Product.countDocuments({
      stock: { $lte: 10 },
      hasVariations: false,
      isActive: true,
    });

    const pendingOrders = await Order.countDocuments({ status: "pending" });

    const recentOrders = await Order.find()
      .populate("customerId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    const lowStockProducts = await Product.find({
      stock: { $lte: 10 },
      hasVariations: false,
      isActive: true,
    })
      .sort({ stock: 1 })
      .limit(5);

    res.status(200).json({
      status: "success",
      data: {
        totalProducts,
        totalSales: salesData[0]?.totalSales || 0,
        totalOrders: salesData[0]?.totalOrders || 0,
        lowStock: lowStockCount,
        pendingOrders,
        recentOrders,
        lowStockProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};
