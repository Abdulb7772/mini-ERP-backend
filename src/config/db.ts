import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully");
    console.log(`📦 Database: ${conn.connection.name}`);
    console.log(`🌍 Host: ${conn.connection.host}`);

  } catch (error: any) {
    console.error("❌ MongoDB connection error:", error.message);

    if (error.message.includes("IP")) {
      console.error("\n🔒 ACTION REQUIRED (MongoDB Atlas):");
      console.error("1. Go to https://cloud.mongodb.com/");
      console.error("2. Open your cluster");
      console.error("3. Network Access → Add IP Address");
      console.error("4. Add 0.0.0.0/0 (for development)");
      console.error("5. Wait 1–2 minutes\n");
    }

    // In production (Render), exit the app if DB fails
    if (process.env.NODE_ENV === "production") {
      console.error("🚨 Exiting process due to database failure");
      process.exit(1);
    }
  }
};
