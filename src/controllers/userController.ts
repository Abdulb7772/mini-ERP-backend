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
    const users = await User.find().select("-password").sort({ createdAt: -1 });

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
    const { name, email, password, role } = req.body;

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
    const { name, email, role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;

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
    // Accept email from body (public route)
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    // Check both User and Customer tables
    const user = await User.findOne({ email });
    const customer = await Customer.findOne({ email });
    
    const account = user || customer;

    if (!account) {
      throw new AppError("Account not found", 404);
    }

    if (account.isVerified) {
      throw new AppError("Account is already verified", 400);
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    account.verificationToken = verificationToken;
    account.verificationTokenExpires = verificationTokenExpires;
    await account.save();

    // Send verification email (without password since user already has credentials)
    try {
      await sendVerificationEmail(account.email, account.name, verificationToken);
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      throw new AppError("Failed to send verification email", 500);
    }

    res.status(200).json({
      status: "success",
      message: "Verification email sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

