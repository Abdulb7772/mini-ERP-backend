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

    const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    const canSendEmail = Boolean(process.env.EMAIL_USER && emailPassword);

    // Send verification email in background so registration response is never blocked by SMTP delays.
    console.log("\n📧 Queueing verification email...");
    if (canSendEmail) {
      setImmediate(async () => {
        try {
          await sendVerificationEmail(email, name, verificationToken);
          console.log("✅ Verification email sent successfully");
        } catch (emailError: any) {
          console.error("⚠️ Error sending verification email:");
          console.error("   Error message:", emailError?.message);
          console.error("   Error details:", emailError);
          console.log("⚠️ Registration completed, user can request email resend later");
        }
      });
    } else {
      console.log("⚠️ EMAIL_USER/EMAIL_PASSWORD (or EMAIL_PASS) not configured. Skipping verification email send.");
    }

    console.log("\n✅ REGISTRATION SUCCESSFUL for:", email);
    console.log("==================== END REGISTRATION ATTEMPT ====================\n");

    res.status(201).json({
      status: "success",
      message: canSendEmail
        ? "Registration successful. Please check your email to verify your account."
        : "Registration successful. Verification email could not be sent. Please contact support or try resending verification email.",
      data: {
        user: {
          id: createdUser._id,
          name: createdUser.name,
          email: createdUser.email,
          role: isCustomer ? "customer" : (createdUser as any).role,
          isVerified: createdUser.isVerified,
        },
        emailSent: canSendEmail,
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
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("📧 Email:", req.body.email);
    console.log("🔑 Password provided:", req.body.password ? "Yes" : "No");
    console.log("📝 Request body keys:", Object.keys(req.body));
    console.log("🌐 Request IP:", req.ip || req.connection.remoteAddress);
    console.log("📱 User-Agent:", req.get("user-agent")?.substring(0, 100));
    
    const { email, password } = req.body;

    console.log("\n✓ Step 1: Validating input...");
    if (!email || !password) {
      console.log("❌ Validation FAILED: Missing email or password");
      console.log("   - Email present:", !!email);
      console.log("   - Password present:", !!password);
      console.log("==================== END LOGIN ATTEMPT ====================\n");
      throw new AppError("Email and password are required", 400);
    }
    console.log("✅ Input validation PASSED");

    console.log("\n✓ Step 2: Searching for user in database...");
    console.log("📊 Querying User and Customer collections in parallel with email:", email);
    const startQuery = Date.now();
    
    // Run both queries in parallel for faster response
    const [user, customer] = await Promise.all([
      User.findOne({ email }).lean(),
      Customer.findOne({ email }).lean()
    ]);
    
    const queryTime = Date.now() - startQuery;
    console.log("⏱️  Parallel queries completed in:", queryTime, "ms");
    console.log("👤 User collection result:", user ? `FOUND (ID: ${user._id}, Name: ${user.name})` : "NOT FOUND");
    console.log("👥 Customer collection result:", customer ? `FOUND (ID: ${customer._id}, Name: ${customer.name})` : "NOT FOUND");
    
    console.log("\n📝 Database search summary:");
    console.log("   - User found:", user ? "✅ YES" : "❌ NO");
    console.log("   - Customer found:", customer ? "✅ YES" : "❌ NO");
    
    const account = user || customer;
    
    console.log("\n✓ Step 3: Account existence check...");
    if (!account) {
      console.log("❌ Account check FAILED: No account found with email:", email);
      console.log("💡 Suggestion: User needs to register first");
      console.log("==================== END LOGIN ATTEMPT ====================\n");
      throw new AppError("Invalid credentials", 401);
    }
    console.log("✅ Account EXISTS!");

    console.log("\n✓ Step 4: Checking account details...");
    console.log("📋 Account Information:");
    console.log("   ├─ ID:", account._id);
    console.log("   ├─ Name:", account.name);
    console.log("   ├─ Email:", account.email);
    console.log("   ├─ Account Type:", user ? "Staff/Admin User" : "Customer");
    console.log("   ├─ Role:", user ? user.role : "customer");
    console.log("   ├─ Is Verified:", account.isVerified ? "✅ YES" : "❌ NO");
    console.log("   ├─ Is Active:", account.isActive ? "✅ YES" : "❌ NO");
    console.log("   └─ Created At:", account.createdAt);

    console.log("\n✓ Step 5: Verification status check...");
    if (!account.isVerified) {
      console.log("❌ Verification check FAILED: Account not verified");
      console.log("📧 User needs to verify email before login");
      console.log("💡 Suggestion: Check inbox for verification email");
      console.log("==================== END LOGIN ATTEMPT ====================\n");
      throw new AppError("Please verify your email before logging in", 403);
    }
    console.log("✅ Account is VERIFIED");

    console.log("\n✓ Step 6: Active status check...");
    if (!account.isActive) {
      console.log("❌ Active status check FAILED: Account is deactivated");
      console.log("🚫 Account has been deactivated by administrator");
      console.log("==================== END LOGIN ATTEMPT ====================\n");
      throw new AppError("Account is deactivated", 403);
    }
    console.log("✅ Account is ACTIVE");

    console.log("\n✓ Step 7: Password validation...");
    console.log("🔐 Comparing provided password with stored hash...");
    const startPasswordCheck = Date.now();
    const isPasswordValid = await comparePassword(password, account.password);
    const passwordCheckTime = Date.now() - startPasswordCheck;
    console.log("⏱️  Password comparison completed in:", passwordCheckTime, "ms");
    console.log("🔑 Password validation result:", isPasswordValid ? "✅ VALID" : "❌ INVALID");
    
    if (!isPasswordValid) {
      console.log("❌ Password validation FAILED");
      console.log("⚠️  Incorrect password provided for email:", email);
      console.log("==================== END LOGIN ATTEMPT ====================\n");
      throw new AppError("Invalid credentials", 401);
    }
    console.log("✅ Password is CORRECT");

    const role = user ? user.role : "customer";
    console.log("\n✓ Step 8: JWT token generation...");
    console.log("🎫 Token payload:");
    console.log("   ├─ User ID:", account._id.toString());
    console.log("   ├─ Email:", account.email);
    console.log("   └─ Role:", role);
    
    const startTokenGen = Date.now();
    const token = generateToken({
      userId: account._id.toString(),
      email: account.email,
      role: role,
    });
    const tokenGenTime = Date.now() - startTokenGen;
    console.log("⏱️  Token generation completed in:", tokenGenTime, "ms");
    console.log("✅ JWT token generated successfully");
    console.log("🔑 Token length:", token.length, "characters");

    console.log("\n✓ Step 9: Preparing response...");
    const responseData = {
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
    };
    console.log("📦 Response data prepared");
    console.log("📤 Sending success response with status 200...");

    res.status(200).json(responseData);
    
    console.log("\n✅✅✅ LOGIN SUCCESSFUL ✅✅✅");
    console.log("👤 User:", account.name);
    console.log("📧 Email:", email);
    console.log("🎭 Role:", role);
    console.log("==================== END LOGIN ATTEMPT ====================\n");
  } catch (error) {
    console.log("\n💥💥💥 LOGIN ERROR CAUGHT 💥💥💥");
    console.log("⏰ Error timestamp:", new Date().toISOString());
    console.log("🔍 Error type:", error instanceof AppError ? "AppError (Expected)" : "Unknown Error (Unexpected)");
    if (error instanceof Error) {
      console.log("📛 Error name:", error.name);
      console.log("💬 Error message:", error.message);
      if (error instanceof AppError) {
        console.log("📊 Status code:", (error as any).statusCode);
      }
      console.log("\n📚 Stack trace:");
      console.log(error.stack);
    } else {
      console.log("⚠️  Non-Error object thrown:", error);
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
// This function should be removed as NextFunction is already imported from Express
// The next parameter in each handler already has the correct implementation
function next(error: any) {
  throw new Error("Function not implemented.");
}

