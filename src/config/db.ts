import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/mini-erp", {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected successfully");
    console.log(`Database: ${conn.connection.name}`);
  } catch (error: any) {
    console.error("❌ MongoDB connection error:", error.message);
    
    // Log specific error details
    if (error.message.includes("IP")) {
      console.error("\n🔒 ACTION REQUIRED:");
      console.error("   1. Go to https://cloud.mongodb.com/");
      console.error("   2. Select your cluster");
      console.error("   3. Go to 'Network Access' → 'Add IP Address'");
      console.error("   4. Add 0.0.0.0/0 to allow all IPs (for development)");
      console.error("   5. Wait 1-2 minutes for changes to take effect\n");
    }
    
    // Don't crash the server, just log the error
    console.error("⚠️  Server will continue running but database operations will fail");
    console.error("⚠️  Please fix the MongoDB connection and restart the server\n");
  }
};
