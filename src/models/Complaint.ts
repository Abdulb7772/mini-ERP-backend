import mongoose, { Schema, Document } from "mongoose";

export interface IComplaint extends Document {
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  status: "pending" | "in-review" | "resolved" | "rejected";
  priority: "low" | "medium" | "high";
  attachments?: string[];
  response?: string;
  respondedBy?: mongoose.Types.ObjectId;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-review", "resolved", "rejected"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    attachments: {
      type: [String],
      default: [],
    },
    response: {
      type: String,
      trim: true,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
ComplaintSchema.index({ customerId: 1, createdAt: -1 });
ComplaintSchema.index({ orderId: 1 });
ComplaintSchema.index({ status: 1 });

export default mongoose.model<IComplaint>("Complaint", ComplaintSchema);
