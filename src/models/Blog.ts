import mongoose, { Document, Schema } from "mongoose";

export interface IBlog extends Document {
  title: string;
  description: string;
  imageUrl?: string;
  author: string;
  status: "published" | "blocked";
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    author: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["published", "blocked"],
      default: "published",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IBlog>("Blog", blogSchema);
