// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger, errorLogger } from "./middlewares/logger";

// Import routes
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import customerRoutes from "./routes/customerRoutes";
import orderRoutes from "./routes/orderRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import cartRoutes from "./routes/cartRoutes";
import wishlistRoutes from "./routes/wishlistRoutes";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Add request logging middleware (BEFORE routes)
app.use(requestLogger);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);

// Add error logging middleware (BEFORE error handler)
app.use(errorLogger);

// Error handler (must be last)
app.use(errorHandler);

// Log environment configuration
console.log("\n" + "🔧".repeat(40));
console.log("ENVIRONMENT CONFIGURATION");
console.log("🔧".repeat(40));
console.log(`NODE_ENV: ${process.env.NODE_ENV || "development"}`);
console.log(`PORT: ${PORT}`);
console.log(`MONGO_URI: ${process.env.MONGO_URI ? "✅ Set" : "❌ Missing"}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? "✅ Set" : "❌ Missing"}`);
console.log(`STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? "✅ Set" : "❌ Missing"}`);
console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? "✅ Set" : "❌ Missing"}`);
console.log(`EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? "✅ Set" : "❌ Missing"}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || "Not set (using default)"}`);
console.log("🔧".repeat(40) + "\n");

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log("\n" + "🚀".repeat(40));
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📡 API Ready: http://localhost:${PORT}/api`);
      console.log("🚀".repeat(40) + "\n");
    });
  })
  .catch((error) => {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  });
