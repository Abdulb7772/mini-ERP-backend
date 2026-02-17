import mongoose, { Document, Schema } from "mongoose";

export interface IEmployee extends Document {
  name: string;
  position: string;
  yearsOfExperience: number;
  imageUrl?: string;
  bio?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      required: true,
      min: 0,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IEmployee>("Employee", employeeSchema);
