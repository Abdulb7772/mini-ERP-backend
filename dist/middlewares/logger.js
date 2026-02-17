"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = exports.requestLogger = void 0;
// Middleware to log all incoming requests
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log("\n" + "=".repeat(80));
    console.log(`📥 INCOMING REQUEST - ${timestamp}`);
    console.log("=".repeat(80));
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.url}`);
    console.log(`Path: ${req.path}`);
    console.log(`Origin: ${req.get("origin") || "N/A"}`);
    console.log(`User-Agent: ${req.get("user-agent") || "N/A"}`);
    // Log headers (excluding sensitive data)
    console.log("\n📋 Headers:");
    const safeHeaders = { ...req.headers };
    if (safeHeaders.authorization) {
        safeHeaders.authorization = "Bearer [REDACTED]";
    }
    console.log(JSON.stringify(safeHeaders, null, 2));
    // Log query parameters
    if (Object.keys(req.query).length > 0) {
        console.log("\n🔍 Query Parameters:");
        console.log(JSON.stringify(req.query, null, 2));
    }
    // Log request body (excluding sensitive data like passwords)
    if (req.body && Object.keys(req.body).length > 0) {
        console.log("\n📦 Request Body:");
        const safeBody = { ...req.body };
        if (safeBody.password)
            safeBody.password = "[REDACTED]";
        if (safeBody.currentPassword)
            safeBody.currentPassword = "[REDACTED]";
        if (safeBody.newPassword)
            safeBody.newPassword = "[REDACTED]";
        console.log(JSON.stringify(safeBody, null, 2));
    }
    console.log("=".repeat(80) + "\n");
    next();
};
exports.requestLogger = requestLogger;
// Middleware to log errors
const errorLogger = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log("\n" + "🔴".repeat(40));
    console.log(`❌ ERROR OCCURRED - ${timestamp}`);
    console.log("🔴".repeat(40));
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.url}`);
    console.log(`Error Name: ${err.name || "Error"}`);
    console.log(`Error Message: ${err.message || "Unknown error"}`);
    console.log(`Status Code: ${err.statusCode || 500}`);
    if (err.stack) {
        console.log("\n📚 Stack Trace:");
        console.log(err.stack);
    }
    console.log("🔴".repeat(40) + "\n");
    next(err);
};
exports.errorLogger = errorLogger;
