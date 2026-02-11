import { Response, NextFunction } from "express";
import User from "../models/User";
import Customer from "../models/Customer";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/auth";
import { generateVerificationToken, sendVerificationEmail } from "../utils/email";

export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("\n📝 ==================== REGISTRATION ATTEMPT ====================");
    const { name, email, password, role, phone, address } = req.body;
    console.log("📋 Registration data:");
    console.log("   - Name:", name);
    console.log("   - Email:", email);
    console.log("   - Role:", role || "customer (default)");
    console.log("   - Phone:", phone || "Not provided");
    console.log("   - Address:", address || "Not provided");

    // Determine if this is a customer registration
    const isCustomer = !role || role === "customer";
    console.log("👤 Registration type:", isCustomer ? "Customer" : "Staff/Admin");

    console.log("\n🔍 Checking for existing accounts...");
    // Check if email already exists in either table
    const existingUser = await User.findOne({ email });
    console.log("   - Existing User:", existingUser ? `Found (${existingUser._id})` : "Not found");
    
    const existingCustomer = await Customer.findOne({ email });
    console.log("   - Existing Customer:", existingCustomer ? `Found (${existingCustomer._id})` : "Not found");
    
    if (existingUser || existingCustomer) {
      console.log("❌ REGISTRATION FAILED: Email already registered");
      console.log("==================== END REGISTRATION ATTEMPT ====================\n");
      throw new AppError("Email already registered", 400);
    }

    console.log("\n🔐 Hashing password...");
    const hashedPassword = await hashPassword(password);
    console.log("✅ Password hashed successfully");
    
    // Generate verification token
    console.log("🎫 Generating verification token...");
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    console.log("✅ Verification token generated");

    let createdUser;

    if (isCustomer) {
      // Create customer record only
      if (!phone) {
        console.log("❌ REGISTRATION FAILED: Phone number required for customer");
        console.log("==================== END REGISTRATION ATTEMPT ====================\n");
        throw new AppError("Phone number is required for customer registration", 400);
      }
      
      console.log("\n💾 Creating customer record...");
      createdUser = await Customer.create({
        name,
        email,
        password: hashedPassword,
        phone,
        address,
        verificationToken,
        verificationTokenExpires,
        isVerified: false,
        isActive: true,
      });
      console.log("✅ Customer created with ID:", createdUser._id);
    } else {
      // Create staff/admin/manager user
      console.log("\n💾 Creating user record...");
      createdUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        verificationToken,
        verificationTokenExpires,
        isVerified: false,
      });
      console.log("✅ User created with ID:", createdUser._id);
    }

    // Send verification email
    console.log("\n📧 Sending verification email...");
    try {
      await sendVerificationEmail(email, name, verificationToken);
      console.log("✅ Verification email sent successfully");
    } catch (emailError) {
      console.error("⚠️ Error sending verification email:", emailError);
      console.log("⚠️ Registration will continue despite email error");
      // Don't fail registration if email fails
    }

    console.log("\n✅ REGISTRATION SUCCESSFUL for:", email);
    console.log("==================== END REGISTRATION ATTEMPT ====================\n");

    res.status(201).json({
      status: "success",
      message: "Registration successful. Please check your email to verify your account.",
      data: {
        user: {
          id: createdUser._id,
          name: createdUser.name,
          email: createdUser.email,
          role: isCustomer ? "customer" : (createdUser as any).role,
          isVerified: createdUser.isVerified,
        },
      },
    });
  } catch (error) {
    console.log("\n💥 REGISTRATION ERROR CAUGHT:");
    if (error instanceof Error) {
      console.log("Error message:", error.message);
      console.log("Error stack:", error.stack);
    }
    console.log("==================== END REGISTRATION ATTEMPT ====================\n");
    next(error);
  }
};

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("\n🔐 ==================== LOGIN ATTEMPT ====================");
    console.log("📧 Email:", req.body.email);
    console.log("🔑 Password provided:", req.body.password ? "Yes" : "No");
    console.log("📝 Request body keys:", Object.keys(req.body));
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("❌ Missing email or password");
      throw new AppError("Email and password are required", 400);
    }

    console.log("\n🔍 Searching for user in database...");
    console.log("📊 Checking User collection...");
    // Check both User and Customer tables
    const user = await User.findOne({ email });
    console.log("👤 User found:", user ? `Yes (ID: ${user._id})` : "No");
    
    console.log("📊 Checking Customer collection...");
    const customer = await Customer.findOne({ email });
    console.log("👥 Customer found:", customer ? `Yes (ID: ${customer._id})` : "No");
    
    const account = user || customer;
    
    if (!account) {
      console.log("❌ LOGIN FAILED: No account found with this email");
      console.log("==================== END LOGIN ATTEMPT ====================\n");
      throw new AppError("Invalid credentials", 401);
    }

    console.log("\n✅ Account found!");
    console.log("📋 Account details:");
    console.log("   - ID:", account._id);
    console.log("   - Name:", account.name);
    console.log("   - Email:", account.email);
    console.log("   - Role:", user ? user.role : "customer");
    console.log("   - Is Verified:", account.isVerified);
    console.log("   - Is Active:", account.isActive);

    if (!account.isVerified) {
      console.log("❌ LOGIN FAILED: Account not verified");
      console.log("==================== END LOGIN ATTEMPT ====================\n");
      throw new AppError("Please verify your email before logging in", 403);
    }

    if (!account.isActive) {
      console.log("❌ LOGIN FAILED: Account is deactivated");
      console.log("==================== END LOGIN ATTEMPT ====================\n");
      throw new AppError("Account is deactivated", 403);
    }

    console.log("\n🔐 Validating password...");
    const isPasswordValid = await comparePassword(password, account.password);
    console.log("✓ Password validation result:", isPasswordValid ? "Valid ✅" : "Invalid ❌");
    
    if (!isPasswordValid) {
      console.log("❌ LOGIN FAILED: Invalid password");
      console.log("==================== END LOGIN ATTEMPT ====================\n");
      throw new AppError("Invalid credentials", 401);
    }

    const role = user ? user.role : "customer";
    console.log("\n🎫 Generating JWT token...");
    console.log("   - User ID:", account._id.toString());
    console.log("   - Email:", account.email);
    console.log("   - Role:", role);

    const token = generateToken({
      userId: account._id.toString(),
      email: account.email,
      role: role,
    });

    console.log("✅ Token generated successfully");
    console.log("📤 Sending success response...");

    res.status(200).json({
      status: "success",
      data: {
        token,
        user: {
          id: account._id,
          name: account.name,
          email: account.email,
          role: role,
        },
      },
    });
    
    console.log("✅ LOGIN SUCCESSFUL for:", email);
    console.log("==================== END LOGIN ATTEMPT ====================\n");
  } catch (error) {
    console.log("\n💥 LOGIN ERROR CAUGHT:");
    console.log("Error type:", error instanceof AppError ? "AppError" : "Unknown Error");
    if (error instanceof Error) {
      console.log("Error message:", error.message);
      console.log("Error stack:", error.stack);
    }
    console.log("==================== END LOGIN ATTEMPT ====================\n");
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check both User and Customer tables
    const user = await User.findById(req.user?.userId).select("-password");
    const customer = await Customer.findById(req.user?.userId).select("-password");
    
    const account = user || customer;
    
    if (!account) {
      throw new AppError("User not found", 404);
    }

    res.status(200).json({
      status: "success",
      data: { user: account },
    });
  } catch (error) {
    next(error);
  }
};
