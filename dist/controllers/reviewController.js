"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReviewReply = exports.addReviewReply = exports.markReviewHelpful = exports.checkReviewEligibility = exports.getMyReviews = exports.updateReviewStatus = exports.deleteReview = exports.updateReview = exports.createReview = exports.getReview = exports.getProductReviews = exports.getReviews = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const Order_1 = __importDefault(require("../models/Order"));
const errorHandler_1 = require("../middlewares/errorHandler");
// Get all reviews (with filters)
const getReviews = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const productId = req.query.productId;
        const customerId = req.query.customerId;
        const status = req.query.status;
        const query = {};
        if (productId)
            query.productId = productId;
        if (customerId)
            query.customerId = customerId;
        if (status)
            query.status = status;
        const total = await Review_1.default.countDocuments(query);
        const reviews = await Review_1.default.find(query)
            .populate("customerId", "name email")
            .populate("productId", "name imageUrl")
            .populate("orderId", "orderNumber")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.status(200).json({
            status: "success",
            data: reviews,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getReviews = getReviews;
// Get reviews for a specific product (public - only approved)
const getProductReviews = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const userId = req.user?.userId; // May be undefined if not authenticated
        const query = {
            productId
        };
        const total = await Review_1.default.countDocuments(query);
        const reviews = await Review_1.default.find(query)
            .populate("customerId", "name")
            .populate("repliedBy", "name")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        // Add hasMarkedHelpful flag for each review if user is authenticated
        const reviewsWithHelpfulStatus = reviews.map((review) => {
            const reviewObj = review.toObject();
            if (userId) {
                reviewObj.hasMarkedHelpful = review.helpfulBy.some((id) => id.toString() === userId);
            }
            else {
                reviewObj.hasMarkedHelpful = false;
            }
            return reviewObj;
        });
        // Calculate average rating
        const ratingStats = await Review_1.default.aggregate([
            { $match: { productId: productId, status: "approved" } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                    rating5: {
                        $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
                    },
                    rating4: {
                        $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
                    },
                    rating3: {
                        $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
                    },
                    rating2: {
                        $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
                    },
                    rating1: {
                        $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
                    },
                },
            },
        ]);
        const stats = ratingStats[0] || {
            averageRating: 0,
            totalReviews: 0,
            rating5: 0,
            rating4: 0,
            rating3: 0,
            rating2: 0,
            rating1: 0,
        };
        res.status(200).json({
            status: "success",
            data: reviewsWithHelpfulStatus,
            stats,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProductReviews = getProductReviews;
// Get single review
const getReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const review = await Review_1.default.findById(id)
            .populate("customerId", "name email")
            .populate("productId", "name sku imageUrl")
            .populate("orderId", "orderNumber");
        if (!review) {
            throw new errorHandler_1.AppError("Review not found", 404);
        }
        res.status(200).json({
            status: "success",
            data: review,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getReview = getReview;
// Create review (customer only, for delivered orders)
const createReview = async (req, res, next) => {
    try {
        const { orderId, productId, variationId, rating, description, images } = req.body;
        const customerId = req.user?.userId;
        if (!customerId) {
            throw new errorHandler_1.AppError("Authentication required", 401);
        }
        // Verify order exists and belongs to customer
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new errorHandler_1.AppError("Order not found", 404);
        }
        if (order.customerId.toString() !== customerId) {
            throw new errorHandler_1.AppError("You can only review your own orders", 403);
        }
        // Check if order is delivered
        if (order.status !== "delivered") {
            throw new errorHandler_1.AppError("You can only review delivered orders", 400);
        }
        // Verify product is in the order
        const orderItem = order.items.find((item) => item.productId.toString() === productId);
        if (!orderItem) {
            throw new errorHandler_1.AppError("Product not found in this order", 400);
        }
        // If variation specified, verify it matches the order item
        if (variationId && orderItem.variationId?.toString() !== variationId) {
            throw new errorHandler_1.AppError("Variation does not match order item", 400);
        }
        // Check if review already exists for this product in this order
        const existingReview = await Review_1.default.findOne({
            orderId,
            productId,
            customerId,
            variationId: variationId || null,
        });
        if (existingReview) {
            throw new errorHandler_1.AppError("You have already reviewed this product", 400);
        }
        // Create review
        const review = await Review_1.default.create({
            orderId,
            customerId,
            productId,
            variationId,
            rating,
            description,
            images: images || [],
            status: "approved", // Reviews are automatically approved
            isVerified: true,
        });
        const populatedReview = await Review_1.default.findById(review._id)
            .populate("customerId", "name email")
            .populate("productId", "name imageUrl");
        res.status(201).json({
            status: "success",
            message: "Review submitted successfully and is now visible.",
            data: populatedReview,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createReview = createReview;
// Update review (customer can only update their own)
const updateReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, description, images } = req.body;
        const userId = req.user?.userId;
        const review = await Review_1.default.findById(id);
        if (!review) {
            throw new errorHandler_1.AppError("Review not found", 404);
        }
        // Check ownership
        if (review.customerId.toString() !== userId) {
            throw new errorHandler_1.AppError("You can only update your own reviews", 403);
        }
        // Update fields
        if (rating !== undefined)
            review.rating = rating;
        if (description !== undefined)
            review.description = description;
        if (images !== undefined)
            review.images = images;
        // Keep approved status even if content changed
        await review.save();
        const updatedReview = await Review_1.default.findById(id)
            .populate("customerId", "name email")
            .populate("productId", "name imageUrl");
        res.status(200).json({
            status: "success",
            message: "Review updated successfully.",
            data: updatedReview,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateReview = updateReview;
// Delete review
const deleteReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const review = await Review_1.default.findById(id);
        if (!review) {
            throw new errorHandler_1.AppError("Review not found", 404);
        }
        // Only owner or admin can delete
        if (review.customerId.toString() !== userId && userRole !== "admin") {
            throw new errorHandler_1.AppError("Not authorized to delete this review", 403);
        }
        await review.deleteOne();
        res.status(200).json({
            status: "success",
            message: "Review deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteReview = deleteReview;
// Update review status (admin only)
const updateReviewStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!["pending", "approved", "rejected"].includes(status)) {
            throw new errorHandler_1.AppError("Invalid status", 400);
        }
        const review = await Review_1.default.findById(id);
        if (!review) {
            throw new errorHandler_1.AppError("Review not found", 404);
        }
        review.status = status;
        await review.save();
        const updatedReview = await Review_1.default.findById(id)
            .populate("customerId", "name email")
            .populate("productId", "name imageUrl");
        res.status(200).json({
            status: "success",
            message: `Review ${status} successfully`,
            data: updatedReview,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateReviewStatus = updateReviewStatus;
// Get customer's reviews
const getMyReviews = async (req, res, next) => {
    try {
        const customerId = req.user?.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const total = await Review_1.default.countDocuments({ customerId });
        const reviews = await Review_1.default.find({ customerId })
            .populate("productId", "name imageUrl")
            .populate("orderId", "orderNumber")
            .populate("repliedBy", "name")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.status(200).json({
            status: "success",
            data: reviews,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyReviews = getMyReviews;
// Check if customer can review products in an order
const checkReviewEligibility = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const customerId = req.user?.userId;
        const order = await Order_1.default.findById(orderId).populate("items.productId", "name imageUrl");
        if (!order) {
            throw new errorHandler_1.AppError("Order not found", 404);
        }
        if (order.customerId.toString() !== customerId) {
            throw new errorHandler_1.AppError("Not authorized", 403);
        }
        if (order.status !== "delivered") {
            return res.status(200).json({
                status: "success",
                canReview: false,
                message: "Order must be delivered to review products",
                data: [],
            });
        }
        // Get existing reviews for this order
        const existingReviews = await Review_1.default.find({ orderId, customerId });
        const reviewedProductIds = new Set(existingReviews.map((r) => `${r.productId}-${r.variationId || ""}`));
        // Build list of products that can be reviewed
        const reviewableProducts = order.items
            .filter((item) => {
            const key = `${item.productId}-${item.variationId || ""}`;
            return !reviewedProductIds.has(key);
        })
            .map((item) => ({
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.quantity,
        }));
        res.status(200).json({
            status: "success",
            canReview: reviewableProducts.length > 0,
            data: reviewableProducts,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.checkReviewEligibility = checkReviewEligibility;
// Mark review as helpful (toggle)
const markReviewHelpful = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            throw new errorHandler_1.AppError("Authentication required", 401);
        }
        const review = await Review_1.default.findById(id);
        if (!review) {
            throw new errorHandler_1.AppError("Review not found", 404);
        }
        // Check if user has already marked this review as helpful
        const alreadyMarked = review.helpfulBy.some((id) => id.toString() === userId);
        if (alreadyMarked) {
            // Remove user from helpfulBy array and decrement helpful count
            review.helpfulBy = review.helpfulBy.filter((id) => id.toString() !== userId);
            review.helpful = Math.max(0, review.helpful - 1);
        }
        else {
            // Add user to helpfulBy array and increment helpful count
            review.helpfulBy.push(userId);
            review.helpful += 1;
        }
        await review.save();
        res.status(200).json({
            status: "success",
            data: { helpful: review.helpful, marked: !alreadyMarked },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.markReviewHelpful = markReviewHelpful;
// Add admin reply to review (admin/manager/staff only)
const addReviewReply = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;
        const userId = req.user?.userId;
        if (!reply || reply.trim().length === 0) {
            throw new errorHandler_1.AppError("Reply text is required", 400);
        }
        const review = await Review_1.default.findById(id);
        if (!review) {
            throw new errorHandler_1.AppError("Review not found", 404);
        }
        review.adminReply = reply;
        review.repliedBy = userId;
        review.repliedAt = new Date();
        await review.save();
        const updatedReview = await Review_1.default.findById(id)
            .populate("customerId", "name email")
            .populate("productId", "name imageUrl")
            .populate("repliedBy", "name email");
        res.status(200).json({
            status: "success",
            message: "Reply added successfully",
            data: updatedReview,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addReviewReply = addReviewReply;
// Delete admin reply from review (admin/manager/staff only)
const deleteReviewReply = async (req, res, next) => {
    try {
        const { id } = req.params;
        const review = await Review_1.default.findById(id);
        if (!review) {
            throw new errorHandler_1.AppError("Review not found", 404);
        }
        if (!review.adminReply) {
            throw new errorHandler_1.AppError("No reply to delete", 400);
        }
        review.adminReply = undefined;
        review.repliedBy = undefined;
        review.repliedAt = undefined;
        await review.save();
        const updatedReview = await Review_1.default.findById(id)
            .populate("customerId", "name email")
            .populate("productId", "name imageUrl");
        res.status(200).json({
            status: "success",
            message: "Reply deleted successfully",
            data: updatedReview,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteReviewReply = deleteReviewReply;
