import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryLog extends Document {
  productId: mongoose.Types.ObjectId;
  variationId?: mongoose.Types.ObjectId;
  type: "stock_in" | "stock_out";
  quantity: number;
  reason: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const inventoryLogSchema = new Schema<IInventoryLog>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variationId: {
      type: Schema.Types.ObjectId,
      ref: "Variation",
    },
    type: {
      type: String,
      enum: ["stock_in", "stock_out"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IInventoryLog>("InventoryLog", inventoryLogSchema);
