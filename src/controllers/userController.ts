import { Response, NextFunction } from "express";
import User from "../models/User";
import Customer from "../models/Customer";
import { hashPassword } from "../utils/password";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/auth";
import {
  generateVerificationToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/email";

export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("teams", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, role, teams } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already registered", 400);
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    console.log("Creating user with verification token:", verificationToken);
    console.log("Token length:", verificationToken.length);
    console.log("Token expiry:", verificationTokenExpires);

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      teams: teams || [],
      verificationToken,
      verificationTokenExpires,
    });

    console.log("User created with ID:", user._id);
    console.log("Stored token:", user.verificationToken);

    // Send verification email with credentials
    try {
      await sendVerificationEmail(email, name, verificationToken, password);
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Don't fail user creation if email fails
    }

    res.status(201).json({
      status: "success",
      message: "User created successfully. Verification email sent.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, email, role, teams } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (teams !== undefined) user.teams = teams;

    await user.save();

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      status: "success",
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Accept token from query params or body
    const token = req.query.token as string || req.body.token;

    if (!token) {
      throw new AppError("Verification token is required", 400);
    }

    console.log("Verification attempt with token:", token);
    console.log("Token length:", token.length);

    // Check both User and Customer tables
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    const customer = await Customer.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    const account = user || customer;

    if (!account) {
      // Check if token exists but expired
      const expiredUser = await User.findOne({ verificationToken: token });
      const expiredCustomer = await Customer.findOne({ verificationToken: token });
      
      if (expiredUser || expiredCustomer) {
        console.log("Token found but expired");
        throw new AppError("Verification token has expired. Please request a new verification email.", 400);
      }
      
      throw new AppError("Invalid verification token", 400);
    }

    console.log("Account found, verifying:", account.email);

    account.isVerified = true;
    account.verificationToken = undefined;
    account.verificationTokenExpires = undefined;
    await account.save();

    res.status(200).json({
      status: "success",
      message: "Email verified successfully",
      data: {
        user: {
          id: account._id,
          name: account.name,
          email: account.email,
          isVerified: account.isVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Log req.body for debugging
    console.log("📧 Resend verification request - Body:", req.body);
    console.log("📧 Resend verification request - Params:", req.params);

    // Check if email service is configured
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    if (!process.env.EMAIL_USER || !emailPassword) {
      console.error("❌ Email service not configured on server");
      return res.status(503).json({
        status: "error",
        message: "Email service is not configured. Please contact support.",
      });
    }

    let account: any = null;
    let email: string = "";

    // Check if this is an admin route with user ID in params
    if (req.params.id) {
      console.log(`📧 Fetching user by ID: ${req.params.id}`);
      
      // Try to find user by ID in both User and Customer collections
      const user = await User.findById(req.params.id);
      const customer = await Customer.findById(req.params.id);
      
      account = user || customer;

      if (!account) {
        console.error(`❌ User not found with ID: ${req.params.id}`);
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      email = account.email;

      if (!email) {
        console.error(`❌ Email missing for user ID: ${req.params.id}`);
        return res.status(400).json({
          status: "error",
          message: "User email is missing",
        });
      }
    } else {
      // Public route - accept email from body
      email = req.body?.email;

      if (!email) {
        console.error("❌ Email is required in request body");
        return res.status(400).json({
          status: "error",
          message: "Email is required",
        });
      }

      console.log(`📧 Fetching user by email: ${email}`);

      // Check both User and Customer tables
      const user = await User.findOne({ email });
      const customer = await Customer.findOne({ email });
      
      account = user || customer;

      if (!account) {
        console.error(`❌ Account not found with email: ${email}`);
        return res.status(404).json({
          status: "error",
          message: "Account not found",
        });
      }
    }

    if (account.isVerified) {
      console.log(`ℹ️ Account already verified: ${email}`);
      return res.status(400).json({
        status: "error",
        message: "Account is already verified",
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    account.verificationToken = verificationToken;
    account.verificationTokenExpires = verificationTokenExpires;
    await account.save();

    console.log(`✅ Verification token generated for: ${email}`);

    // Send verification email (without password since user already has credentials)
    try {
      await sendVerificationEmail(account.email, account.name, verificationToken);
      console.log(`✅ Verification email sent to: ${email}`);
    } catch (emailError: any) {
      console.error("❌ Failed to send verification email:", emailError);
      if (emailError?.code === "ETIMEDOUT") {
        return res.status(503).json({
          status: "error",
          message: "Email service connection timed out. Please try again later.",
        });
      }
      if (emailError?.code === "EAUTH") {
        return res.status(503).json({
          status: "error",
          message: "Email authentication failed. Please contact support.",
        });
      }
      return res.status(500).json({
        status: "error",
        message: "Failed to send verification email. Please try again.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Verification email sent successfully",
    });
  } catch (error: any) {
    console.error("❌ Resend verification error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "An unexpected error occurred while resending verification email",
    });
  }
};

