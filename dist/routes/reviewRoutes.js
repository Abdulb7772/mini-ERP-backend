"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reviewController_1 = require("../controllers/reviewController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const reviewValidator_1 = require("../validators/reviewValidator");
const router = express_1.default.Router();
// Public routes
router.get("/products/:productId", reviewController_1.getProductReviews);
// Protected routes (authentication required)
router.use(auth_1.authenticate);
// Customer routes
router.post("/", reviewValidator_1.createReviewValidator, validate_1.validate, reviewController_1.createReview);
router.get("/my-reviews", reviewController_1.getMyReviews);
router.get("/check-eligibility/:orderId", reviewController_1.checkReviewEligibility);
router.put("/:id", reviewValidator_1.updateReviewValidator, validate_1.validate, reviewController_1.updateReview);
router.delete("/:id", reviewController_1.deleteReview);
router.post("/:id/helpful", reviewController_1.markReviewHelpful);
// Admin routes
router.get("/", (0, auth_1.authorize)("admin", "manager"), reviewController_1.getReviews);
router.get("/:id", (0, auth_1.authorize)("admin", "manager"), reviewController_1.getReview);
router.patch("/:id/status", (0, auth_1.authorize)("admin", "manager"), reviewValidator_1.updateReviewStatusValidator, validate_1.validate, reviewController_1.updateReviewStatus);
router.post("/:id/reply", (0, auth_1.authorize)("admin", "manager", "staff"), reviewController_1.addReviewReply);
router.delete("/:id/reply", (0, auth_1.authorize)("admin", "manager", "staff"), reviewController_1.deleteReviewReply);
exports.default = router;
