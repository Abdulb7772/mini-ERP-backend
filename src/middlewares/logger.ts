import { Request, Response, NextFunction } from "express";

// Middleware to log all incoming requests
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
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
    if (safeBody.password) safeBody.password = "[REDACTED]";
    if (safeBody.currentPassword) safeBody.currentPassword = "[REDACTED]";
    if (safeBody.newPassword) safeBody.newPassword = "[REDACTED]";
    console.log(JSON.stringify(safeBody, null, 2));
  }
  
  console.log("=".repeat(80) + "\n");
  
  // Capture the original send and json functions
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override res.send
  res.send = function (data: any) {
    logResponse(req, res, data);
    return originalSend.call(this, data);
  };
  
  // Override res.json
  res.json = function (data: any) {
    logResponse(req, res, data);
    return originalJson.call(this, data);
  };
  
  next();
};

// Function to log response
const logResponse = (req: Request, res: Response, data: any) => {
  const timestamp = new Date().toISOString();
  
  console.log("\n" + "=".repeat(80));
  console.log(`📤 OUTGOING RESPONSE - ${timestamp}`);
  console.log("=".repeat(80));
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage || getStatusMessage(res.statusCode)}`);
  
  // Determine response type
  const contentType = res.get("content-type");
  console.log(`Content-Type: ${contentType || "N/A"}`);
  
  // Log response data
  console.log("\n📨 Response Data:");
  try {
    if (typeof data === "string") {
      // Try to parse if it's JSON string
      try {
        const parsed = JSON.parse(data);
        console.log(JSON.stringify(parsed, null, 2));
      } catch {
        // Not JSON, log as string (truncate if too long)
        if (data.length > 1000) {
          console.log(data.substring(0, 1000) + "...[TRUNCATED]");
        } else {
          console.log(data);
        }
      }
    } else if (typeof data === "object") {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  } catch (error) {
    console.log("Unable to stringify response data:", error);
  }
  
  console.log("=".repeat(80) + "\n");
};

// Helper function to get status message
const getStatusMessage = (statusCode: number): string => {
  const statusMessages: { [key: number]: string } = {
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
  };
  
  return statusMessages[statusCode] || "Unknown Status";
};

// Middleware to log errors
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
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
