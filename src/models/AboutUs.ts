import mongoose, { Schema, Document } from "mongoose";

export interface IBlock {
  id: string;
  type: "text" | "image" | "heading" | "hero";
  content: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  style?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
  };
}

export interface IAboutUs extends Document {
  blocks: IBlock[];
  pageBackgroundColor?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const blockSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["text", "image", "heading", "hero"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  size: {
    width: { type: Number, default: 300 },
    height: { type: Number, default: 100 },
  },
  style: {
    fontSize: String,
    fontWeight: String,
    color: String,
    backgroundColor: String,
    textAlign: String,
  },
});

const aboutUsSchema = new Schema<IAboutUs>(
  {
    blocks: {
      type: [blockSchema],
      default: [],
    },
    pageBackgroundColor: {
      type: String,
      default: "#ffffff",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAboutUs>("AboutUs", aboutUsSchema);
