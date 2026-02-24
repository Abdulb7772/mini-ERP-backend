import mongoose, { Document, Schema } from "mongoose";

export interface IChat extends Document {
  type: "internal" | "external";
  participants: mongoose.Types.ObjectId[];
  participantRoles: string[];
  isGroup: boolean;
  groupName?: string;
  department?: "sales" | "support" | "inventory" | null;
  contextType?: "order" | "product" | "customer" | "general";
  contextId?: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: Map<string, number>;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    type: {
      type: String,
      enum: ["internal", "external"],
      required: true,
      index: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    participantRoles: [
      {
        type: String,
        required: true,
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      enum: ["sales", "support", "inventory", null],
      default: null,
    },
    contextType: {
      type: String,
      enum: ["order", "product", "customer", "general"],
      default: "general",
    },
    contextId: {
      type: Schema.Types.ObjectId,
      refPath: "contextType",
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
chatSchema.index({ participants: 1 });
chatSchema.index({ type: 1, participants: 1 });
chatSchema.index({ department: 1 });
chatSchema.index({ contextType: 1, contextId: 1 });
chatSchema.index({ lastMessageAt: -1 });

export default mongoose.model<IChat>("Chat", chatSchema);
