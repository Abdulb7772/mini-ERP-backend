"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Order_1 = __importDefault(require("../models/Order"));
const getStats = async (req, res, next) => {
    try {
        console.log("📊 [Dashboard] Getting stats - User:", req.user?.email);
        console.log("📊 [Dashboard] User role:", req.user?.role);
        const totalProducts = await Product_1.default.countDocuments({ isActive: true });
        console.log("📊 [Dashboard] Total products:", totalProducts);
        const salesData = await Order_1.default.aggregate([
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
        const lowStockCount = await Product_1.default.countDocuments({
            stock: { $lte: 10 },
            hasVariations: false,
            isActive: true,
        });
        console.log("📊 [Dashboard] Low stock count:", lowStockCount);
        const pendingOrders = await Order_1.default.countDocuments({ status: "pending" });
        console.log("📊 [Dashboard] Pending orders:", pendingOrders);
        const recentOrders = await Order_1.default.find()
            .populate("customerId", "name")
            .sort({ createdAt: -1 })
            .limit(5);
        console.log("📊 [Dashboard] Recent orders count:", recentOrders.length);
        const lowStockProducts = await Product_1.default.find({
            stock: { $lte: 10 },
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
    }
    catch (error) {
        console.error("❌ [Dashboard] Error:", error);
        next(error);
    }
};
exports.getStats = getStats;
