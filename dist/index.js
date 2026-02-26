"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
const errorHandler_1 = require("./middlewares/errorHandler");
const logger_1 = require("./middlewares/logger");
const socketService_1 = require("./services/socketService");
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const customerRoutes_1 = __importDefault(require("./routes/customerRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const inventoryRoutes_1 = __importDefault(require("./routes/inventoryRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const cartRoutes_1 = __importDefault(require("./routes/cartRoutes"));
const wishlistRoutes_1 = __importDefault(require("./routes/wishlistRoutes"));
const aboutUsRoutes_1 = __importDefault(require("./routes/aboutUsRoutes"));
const blogRoutes_1 = __importDefault(require("./routes/blogRoutes"));
const employeeRoutes_1 = __importDefault(require("./routes/employeeRoutes"));
const complaintRoutes_1 = __importDefault(require("./routes/complaintRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const fileProxyRoutes_1 = __importDefault(require("./routes/fileProxyRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const refundRoutes_1 = __importDefault(require("./routes/refundRoutes"));
const teamRoutes_1 = __importDefault(require("./routes/teamRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
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
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
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
const io = new socket_io_1.Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
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
(0, socketService_1.initializeSocketIO)(io);
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
// Add request logging middleware (BEFORE routes)
app.use(logger_1.requestLogger);
// Health check endpoint (prevents cold starts)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
app.use("/api/auth", authRoutes_1.default);
app.use("/api/users", userRoutes_1.default);
app.use("/api/products", productRoutes_1.default);
app.use("/api/customers", customerRoutes_1.default);
app.use("/api/orders", orderRoutes_1.default);
app.use("/api/inventory", inventoryRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/attendance", attendanceRoutes_1.default);
app.use("/api/cart", cartRoutes_1.default);
app.use("/api/wishlist", wishlistRoutes_1.default);
app.use("/api/about-us", aboutUsRoutes_1.default);
app.use("/api/blogs", blogRoutes_1.default);
app.use("/api/employees", employeeRoutes_1.default);
app.use("/api/complaints", complaintRoutes_1.default);
app.use("/api/notifications", notificationRoutes_1.default);
app.use("/api/reviews", reviewRoutes_1.default);
app.use("/api/upload", uploadRoutes_1.default);
app.use("/api/file-proxy", fileProxyRoutes_1.default);
app.use("/api/wallet", walletRoutes_1.default);
app.use("/api/refund", refundRoutes_1.default);
app.use("/api/teams", teamRoutes_1.default);
app.use("/api/chats", chatRoutes_1.default);
// Add error logging middleware (BEFORE error handler)
app.use(logger_1.errorLogger);
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
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
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || "Not set (using default)"}`);
console.log("🔧".repeat(40) + "\n");
// Connect to MongoDB and start server
(0, db_1.connectDB)(); // Fire and forget - server will start regardless
server.listen(PORT, () => {
    console.log("\n" + "🚀".repeat(40));
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`📡 API Ready: http://localhost:${PORT}/api`);
    console.log(`💬 Socket.IO Ready: ws://localhost:${PORT}`);
    console.log("🚀".repeat(40) + "\n");
});
