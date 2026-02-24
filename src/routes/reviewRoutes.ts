import express from "express";
import {
  getReviews,
  getProductReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  updateReviewStatus,
  getMyReviews,
  checkReviewEligibility,
  markReviewHelpful,
  addReviewReply,
  deleteReviewReply,
} from "../controllers/reviewController";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createReviewValidator,
  updateReviewValidator,
  updateReviewStatusValidator,
} from "../validators/reviewValidator";

const router = express.Router();

// Public routes
router.get("/products/:productId", getProductReviews);

// Protected routes (authentication required)
router.use(authenticate);

// Customer routes
router.post("/", createReviewValidator, validate, createReview);
router.get("/my-reviews", getMyReviews);
router.get("/check-eligibility/:orderId", checkReviewEligibility);
router.put("/:id", updateReviewValidator, validate, updateReview);
router.delete("/:id", deleteReview);
router.post("/:id/helpful", markReviewHelpful);

// Admin routes
router.get("/", authorize("admin", "top_manager", "customer_manager"), getReviews);
router.get("/:id", authorize("admin", "top_manager", "customer_manager"), getReview);
router.patch(
  "/:id/status",
  authorize("admin", "top_manager", "customer_manager"),
  updateReviewStatusValidator,
  validate,
  updateReviewStatus
);
router.post(
  "/:id/reply",
  authorize("admin", "top_manager", "customer_manager", "staff"),
  addReviewReply
);
router.delete(
  "/:id/reply",
  authorize("admin", "top_manager", "customer_manager", "staff"),
  deleteReviewReply
);

export default router;
