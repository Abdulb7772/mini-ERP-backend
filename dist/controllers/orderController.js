"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = exports.cancelOrder = exports.updateOrderStatus = exports.updateOrder = exports.createOrder = exports.getOrder = exports.getOrders = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const Variation_1 = __importDefault(require("../models/Variation"));
const Customer_1 = __importDefault(require("../models/Customer"));
const errorHandler_1 = require("../middlewares/errorHandler");
const email_1 = require("../utils/email");
const notificationController_1 = require("../controllers/notificationController");
// Import Stripe with proper error handling
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('WARNING: STRIPE_SECRET_KEY is not set in environment variables');
}
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key');
const getOrders = async (req, res, next) => {
    try {
        const orders = await Order_1.default.find()
            .populate("customerId", "name email phone address")
            .populate("createdBy", "name email")
            .populate({
            path: "items.productId",
            select: "name sku"
        })
            .sort({ createdAt: -1 });
        res.status(200).json({
            status: "success",
            data: orders,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrders = getOrders;
const getOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order_1.default.findById(id)
            .populate("customerId", "name email phone address")
            .populate("createdBy", "name email")
            .populate("items.productId", "name sku imageUrl images");
        if (!order) {
            throw new errorHandler_1.AppError("Order not found", 404);
        }
        res.status(200).json({
            status: "success",
            data: order,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrder = getOrder;
const createOrder = async (req, res, next) => {
    try {
        const { customerId, items, notes, phone, shippingAddress, paymentMethod, paymentStatus, transactionId, totalAmount: requestTotalAmount } = req.body;
        let finalCustomerId = customerId;
        // If no customerId provided, try to find or create customer from user info
        if (!finalCustomerId && req.user?.userId) {
            try {
                // Check if the logged-in user is a customer
                if (req.user.role === "customer") {
                    // User is already a customer, use their ID directly
                    const customer = await Customer_1.default.findById(req.user.userId);
                    console.log("Found customer from token:", customer ? { id: customer._id, email: customer.email } : "No customer found");
                    if (customer) {
                        // Update customer info if provided
                        if (phone)
                            customer.phone = phone;
                        if (shippingAddress)
                            customer.address = shippingAddress;
                        await customer.save();
                        console.log("Updated existing customer:", customer._id);
                        finalCustomerId = customer._id;
                    }
                    else {
                        console.error("Customer ID from token not found in database");
                    }
                }
                else {
                    // User is staff/admin/manager, need to find or create a customer record
                    const User = (await Promise.resolve().then(() => __importStar(require("../models/User")))).default;
                    const user = await User.findById(req.user.userId);
                    console.log("Found user:", user ? { id: user._id, email: user.email, name: user.name } : "No user found");
                    if (user && user.email) {
                        // Try to find existing customer by email
                        let customer = await Customer_1.default.findOne({ email: user.email });
                        console.log("Found customer:", customer ? { id: customer._id, email: customer.email } : "No customer found, will create");
                        // If not found, create a new customer
                        if (!customer) {
                            customer = await Customer_1.default.create({
                                name: user.name || "Guest Customer",
                                email: user.email,
                                password: "temp_password_" + Date.now(), // Temporary password
                                phone: phone || "N/A",
                                address: shippingAddress || "",
                                isVerified: true,
                            });
                            console.log("Created new customer:", customer._id);
                        }
                        else {
                            // Update customer info if provided
                            if (phone)
                                customer.phone = phone;
                            if (shippingAddress)
                                customer.address = shippingAddress;
                            await customer.save();
                            console.log("Updated existing customer:", customer._id);
                        }
                        finalCustomerId = customer._id;
                    }
                    else {
                        console.error("User found but no email:", user);
                    }
                }
            }
            catch (userError) {
                console.error("Error finding/creating customer:", userError);
            }
        }
        if (!finalCustomerId) {
            console.error("Failed to determine customer ID. req.user:", req.user);
            throw new errorHandler_1.AppError("Customer information is required. Please ensure you are logged in.", 400);
        }
        let totalAmount = 0;
        const orderItems = [];
        for (const item of items) {
            // Support both 'product' and 'productId' field names
            const productId = item.productId || item.product;
            // Debug logging
            console.log('=== Order Item Debug ===');
            console.log('Full item:', JSON.stringify(item, null, 2));
            console.log('productId:', productId);
            console.log('variationId:', item.variationId);
            console.log('=======================');
            if (!productId) {
                throw new errorHandler_1.AppError("Product ID is required for each item", 400);
            }
            const product = await Product_1.default.findById(productId);
            if (!product) {
                throw new errorHandler_1.AppError(`Product not found: ${productId}`, 404);
            }
            let price = item.price || product.price;
            let availableStock = product.stock;
            if (item.variationId) {
                const variation = await Variation_1.default.findById(item.variationId);
                if (!variation) {
                    throw new errorHandler_1.AppError(`Variation not found: ${item.variationId}`, 404);
                }
                price = item.price || variation.price;
                availableStock = variation.stock;
            }
            if (availableStock < item.quantity) {
                throw new errorHandler_1.AppError(`Insufficient stock for ${product.name}`, 400);
            }
            const subtotal = price * item.quantity;
            totalAmount += subtotal;
            orderItems.push({
                productId: productId,
                variationId: item.variationId,
                quantity: item.quantity,
                price,
                subtotal,
            });
            if (item.variationId) {
                await Variation_1.default.findByIdAndUpdate(item.variationId, {
                    $inc: { stock: -item.quantity },
                });
            }
            else {
                await Product_1.default.findByIdAndUpdate(productId, {
                    $inc: { stock: -item.quantity },
                });
            }
        }
        // Use the totalAmount from request (includes COD charges, shipping, etc.) or fallback to calculated
        const finalTotalAmount = requestTotalAmount || totalAmount;
        // Validate that the provided total is reasonable (at least equal to items total)
        if (requestTotalAmount && requestTotalAmount < totalAmount) {
            throw new errorHandler_1.AppError("Invalid total amount: cannot be less than items subtotal", 400);
        }
        // Generate order number
        const count = await Order_1.default.countDocuments();
        const orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(4, "0")}`;
        const order = await Order_1.default.create({
            orderNumber,
            customerId: finalCustomerId,
            items: orderItems,
            totalAmount: finalTotalAmount,
            paymentStatus: paymentStatus || "unpaid",
            paidAmount: paymentStatus === "paid" ? finalTotalAmount : 0,
            notes: notes || `Payment Method: ${paymentMethod || "N/A"}${transactionId ? `, Transaction ID: ${transactionId}` : ""}`,
            createdBy: req.user?.userId,
        });
        // Fetch customer details and order with populated data
        const populatedOrder = await Order_1.default.findById(order._id)
            .populate("customerId", "name email address")
            .populate({
            path: "items.productId",
            select: "name"
        });
        // Create notifications for admin and staff about new order
        try {
            const User = (await Promise.resolve().then(() => __importStar(require("../models/User")))).default;
            const adminsAndStaff = await User.find({
                role: { $in: ["admin", "staff"] },
                isActive: true,
            }).select("_id");
            const notificationPromises = adminsAndStaff.map((user) => (0, notificationController_1.createNotification)(user._id.toString(), "User", "order_status", "New Order Placed", `New order #${order.orderNumber} has been placed for $${finalTotalAmount.toFixed(2)}`, order._id.toString(), "Order"));
            await Promise.all(notificationPromises);
        }
        catch (notifError) {
            console.error("Error creating order notifications:", notifError);
            // Don't fail order creation if notification fails
        }
        // Send order confirmation email
        try {
            const customer = populatedOrder?.customerId;
            const emailItems = populatedOrder?.items.map((item) => ({
                productName: item.productId.name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
            })) || [];
            await (0, email_1.sendOrderConfirmationEmail)(customer.email, customer.name, order.orderNumber, emailItems, finalTotalAmount, customer.address);
        }
        catch (emailError) {
            console.error("Error sending order confirmation email:", emailError);
            // Don't fail order creation if email fails
        }
        res.status(201).json({
            status: "success",
            message: "Order placed successfully! Confirmation email sent.",
            data: populatedOrder,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createOrder = createOrder;
const updateOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const order = await Order_1.default.findById(id);
        if (!order) {
            throw new errorHandler_1.AppError("Order not found", 404);
        }
        // Update only notes
        if (notes !== undefined) {
            order.notes = notes;
        }
        await order.save();
        const updatedOrder = await Order_1.default.findById(id)
            .populate("customerId", "name email address")
            .populate("items.productId", "name sku");
        res.status(200).json({
            status: "success",
            data: updatedOrder,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateOrder = updateOrder;
const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const order = await Order_1.default.findById(id).populate("customerId", "_id name email");
        if (!order) {
            throw new errorHandler_1.AppError("Order not found", 404);
        }
        const oldStatus = order.status;
        order.status = status;
        await order.save();
        // Create notification for customer when order status changes
        if (oldStatus !== status && order.customerId) {
            const populatedOrder = order;
            const customerId = typeof populatedOrder.customerId === 'object' && populatedOrder.customerId._id
                ? populatedOrder.customerId._id.toString()
                : populatedOrder.customerId.toString();
            await (0, notificationController_1.createNotification)(customerId, "Customer", "order_status", `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`, `Your order #${order.orderNumber} status has been updated to ${status}`, order._id.toString(), "Order");
        }
        res.status(200).json({
            status: "success",
            data: order,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateOrderStatus = updateOrderStatus;
const cancelOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order_1.default.findById(id);
        if (!order) {
            throw new errorHandler_1.AppError("Order not found", 404);
        }
        if (order.status === "cancelled") {
            throw new errorHandler_1.AppError("Order is already cancelled", 400);
        }
        for (const item of order.items) {
            if (item.variationId) {
                await Variation_1.default.findByIdAndUpdate(item.variationId, {
                    $inc: { stock: item.quantity },
                });
            }
            else {
                await Product_1.default.findByIdAndUpdate(item.productId, {
                    $inc: { stock: item.quantity },
                });
            }
        }
        order.status = "cancelled";
        await order.save();
        res.status(200).json({
            status: "success",
            message: "Order cancelled successfully",
            data: order,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.cancelOrder = cancelOrder;
// Create Payment Intent for Stripe
const createPaymentIntent = async (req, res, next) => {
    try {
        const { amount, orderId } = req.body;
        if (!amount) {
            throw new errorHandler_1.AppError("Amount is required", 400);
        }
        // Validate Stripe is properly configured
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy_key') {
            throw new errorHandler_1.AppError("Stripe is not properly configured", 500);
        }
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount), // Amount should already be in cents from frontend
            currency: "usd", // Changed to USD for better compatibility
            payment_method_types: ["card"],
            metadata: {
                orderId: orderId || "pending",
                customerId: req.user?.userId || "guest",
            },
        });
        res.status(200).json({
            status: "success",
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            },
        });
    }
    catch (error) {
        console.error('Stripe Payment Intent Error:', error);
        next(new errorHandler_1.AppError(error.message || "Failed to create payment intent", 500));
    }
};
exports.createPaymentIntent = createPaymentIntent;
