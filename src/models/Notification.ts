import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  userModel: "User" | "Customer";
  type: "complaint_filed" | "complaint_replied" | "order_status" | "general";
  title: string;
  message: string;
  relatedId?: mongoose.Types.ObjectId; // complaint ID, order ID, etc.
  relatedModel?: string; // "Complaint", "Order", etc.
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "userModel",
    },
    userModel: {
      type: String,
      required: true,
      enum: ["User", "Customer"],
    },
    type: {
      type: String,
      enum: ["complaint_filed", "complaint_replied", "order_status", "general"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    relatedModel: {
      type: String,
      enum: ["Complaint", "Order"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model<INotification>("Notification", NotificationSchema);
