import { Router } from "express";
import Order from "../models/Order";
import User from "../models/User";
import mongoose from "mongoose";

const router = Router();

// Diagnostic endpoint to check order and customer data
router.get("/check-orders", async (req, res) => {
  try {
    console.log("\n=== DIAGNOSTIC: Checking Orders ===");
    
    // Get a sample order
    const sampleOrder = await Order.findOne().lean();
    
    if (!sampleOrder) {
      return res.json({
        message: "No orders found in database",
        ordersCount: 0
      });
    }
    
    console.log("Sample order customerId:", sampleOrder.customerId);
    console.log("CustomerId type:", typeof sampleOrder.customerId);
    
    // Check if customer exists
    let customer = null;
    if (sampleOrder.customerId) {
      customer = await User.findById(sampleOrder.customerId).lean();
      console.log("Customer found:", customer ? "YES" : "NO");
      if (customer) {
        console.log("Customer data:", {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          role: customer.role
        });
      }
    }
    
    // Get all user roles
    const userRoles = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);
    
    // Check how many orders have valid customer references
    const allOrders = await Order.find().limit(10).lean();
    const customerIds = allOrders.map(o => o.customerId).filter(Boolean);
    
    const validCustomers = await User.find({
      _id: { $in: customerIds }
    }).lean();
    
    const validCustomerIds = validCustomers.map(c => c._id.toString());
    const invalidOrders = allOrders.filter(o => 
      o.customerId && !validCustomerIds.includes(o.customerId.toString())
    );
    
    return res.json({
      totalOrders: await Order.countDocuments(),
      totalUsers: await User.countDocuments(),
      usersByRole: userRoles,
      sampleOrder: {
        _id: sampleOrder._id,
        orderNumber: sampleOrder.orderNumber,
        customerId: sampleOrder.customerId,
        customerIdType: typeof sampleOrder.customerId,
        customerExists: customer ? true : false,
        customerData: customer ? {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          role: customer.role
        } : null
      },
      first10Orders: allOrders.map(o => ({
        orderNumber: o.orderNumber,
        customerId: o.customerId,
        customerIdType: typeof o.customerId
      })),
      validCustomersFound: validCustomers.length,
      invalidOrdersCount: invalidOrders.length,
      invalidOrders: invalidOrders.map(o => ({
        orderNumber: o.orderNumber,
        customerId: o.customerId
      }))
    });
    
  } catch (error: any) {
    console.error("Diagnostic error:", error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;
