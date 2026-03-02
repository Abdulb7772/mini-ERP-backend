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
    console.log("📊 [Dashboard] Getting stats - User:", req.user?.email);
    console.log("📊 [Dashboard] User role:", req.user?.role);
    
    const totalProducts = await Product.countDocuments({ isActive: true });
    console.log("📊 [Dashboard] Total products:", totalProducts);

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
    console.log("📊 [Dashboard] Sales data:", salesData);

    const lowStockCount = await Product.countDocuments({
      stock: { $lte: 3 },
      hasVariations: false,
      isActive: true,
    });
    console.log("📊 [Dashboard] Low stock count:", lowStockCount);

    const pendingOrders = await Order.countDocuments({ status: "pending" });
    console.log("📊 [Dashboard] Pending orders:", pendingOrders);

    const recentOrders = await Order.find()
      .populate("customerId", "name")
      .sort({ createdAt: -1 })
      .limit(5);
    console.log("📊 [Dashboard] Recent orders count:", recentOrders.length);

    const lowStockProducts = await Product.find({
      stock: { $lte: 3 },
      hasVariations: false,
      isActive: true,
    })
      .sort({ stock: 1 })
      .limit(5);
    console.log("📊 [Dashboard] Low stock products count:", lowStockProducts.length);

    const responseData = {
      totalProducts,
      totalSales: salesData[0]?.totalSales || 0,
      totalOrders: salesData[0]?.totalOrders || 0,
      lowStock: lowStockCount,
      pendingOrders,
      recentOrders,
      lowStockProducts,
    };
    
    console.log("✅ [Dashboard] Sending response:", JSON.stringify(responseData, null, 2));

    res.status(200).json({
      status: "success",
      data: responseData,
    });
  } catch (error) {
    console.error("❌ [Dashboard] Error:", error);
    next(error);
  }
};
