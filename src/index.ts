
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { connectDB } from "./config/db";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger, errorLogger } from "./middlewares/logger";
import { initializeSocketIO } from "./services/socketService";

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
import aboutUsRoutes from "./routes/aboutUsRoutes";
import blogRoutes from "./routes/blogRoutes";
import employeeRoutes from "./routes/employeeRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import fileProxyRoutes from "./routes/fileProxyRoutes";
import walletRoutes from "./routes/walletRoutes";
import refundRoutes from "./routes/refundRoutes";
import teamRoutes from "./routes/teamRoutes";
import chatRoutes from "./routes/chatRoutes";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Set request timeout to 25 seconds (before Render's 30s limit)
app.use((req, res, next) => {
  req.setTimeout(25000, () => {
    console.error(`⏱️ Request timeout: ${req.method} ${req.path}`);
    res.status(408).json({ 
      success: false, 
      message: 'Request timeout' 
    });
  });
  next();
});

// CORS Configuration
const allowedOrigins = [
  'https://mini-erp-frontend-uzn9.vercel.app',
  'https://mini-erp-admin-side.vercel.app',
  'https://mini-erp-admin-side-mimy.vercel.app',
  'https://mini-erp-client-side.vercel.app',
  'https://mini-erp-client-side-lv6t.vercel.app',
  'https://mini-erp-client-side-r4z1.vercel.app',
  'https://mini-erp-client-side-ej38.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any vercel.app subdomain for mini-erp
    if (origin.includes('vercel.app') && origin.includes('mini-erp')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('⚠️ CORS blocked origin:', origin);
    callback(null, true); // Allow all origins for now to debug
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204,
};

// Initialize Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.includes('vercel.app') && origin.includes('mini-erp')) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
});

// Initialize Socket.IO handlers
initializeSocketIO(io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Add request logging middleware (BEFORE routes)
app.use(requestLogger);

// Health check endpoint (prevents cold starts)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
app.use("/api/about-us", aboutUsRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/file-proxy", fileProxyRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/refund", refundRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/chats", chatRoutes);

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
console.log(`CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? "✅ Set" : "❌ Missing"}`);
console.log(`CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? "✅ Set" : "❌ Missing"}`);
console.log(`CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? "✅ Set" : "❌ Missing"}`);
console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? "✅ Set" : "❌ Missing"}`);
console.log(`EMAIL_PASSWORD/EMAIL_PASS: ${process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS ? "✅ Set" : "❌ Missing"}`);
console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST || "smtp.gmail.com (default)"}`);
console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT || "587 (default)"}`);
console.log(`EMAIL_SECURE: ${process.env.EMAIL_SECURE || "auto"}`);
console.log(`SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? "✅ Set" : "❌ Missing"}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || "Not set (using default)"}`);
console.log("🔧".repeat(40) + "\n");

// Connect to MongoDB and start server
connectDB(); // Fire and forget - server will start regardless

server.listen(PORT, () => {
  console.log("\n" + "🚀".repeat(40));
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 API Ready: http://localhost:${PORT}/api`);
  console.log(`💬 Socket.IO Ready: ws://localhost:${PORT}`);
  console.log("🚀".repeat(40) + "\n");
});

