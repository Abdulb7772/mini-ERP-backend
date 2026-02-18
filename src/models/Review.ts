import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variationId?: mongoose.Types.ObjectId;
  rating: number;
  description: string;
  images?: string[];
  status: "pending" | "approved" | "rejected";
  isVerified: boolean; // Verified purchase
  helpful: number; // Helpful count
  helpfulBy: mongoose.Types.ObjectId[]; // Users who marked as helpful
  adminReply?: string; // Admin/Staff reply to review
  repliedBy?: mongoose.Types.ObjectId; // User who replied
  repliedAt?: Date; // When reply was added
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variationId: {
      type: Schema.Types.ObjectId,
      ref: "Variation",
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    description: {
      type: String,
      required: [true, "Review description is required"],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    isVerified: {
      type: Boolean,
      default: true, // Set to true since reviews are from orders
    },
    helpful: {
      type: Number,
      default: 0,
    },
    helpfulBy: {
      type: [Schema.Types.ObjectId],
      ref: "Customer",
      default: [],
    },
    adminReply: {
      type: String,
      trim: true,
    },
    repliedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    repliedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ customerId: 1 });
reviewSchema.index({ orderId: 1 });

export default mongoose.model<IReview>("Review", reviewSchema);
