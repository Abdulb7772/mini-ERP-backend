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
    const { name, email, password, role, phone, address } = req.body;

    // Determine if this is a customer registration
    const isCustomer = !role || role === "customer";

    // Check if email already exists in either table
    const existingUser = await User.findOne({ email });
    const existingCustomer = await Customer.findOne({ email });
    
    if (existingUser || existingCustomer) {
      throw new AppError("Email already registered", 400);
    }

    const hashedPassword = await hashPassword(password);
    
    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    let createdUser;

    if (isCustomer) {
      // Create customer record only
      if (!phone) {
        throw new AppError("Phone number is required for customer registration", 400);
      }
      
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
    } else {
      // Create staff/admin/manager user
      createdUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        verificationToken,
        verificationTokenExpires,
        isVerified: false,
      });
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      // Don't fail registration if email fails
    }

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
    next(error);
  }
};

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Check both User and Customer tables
    const user = await User.findOne({ email });
    const customer = await Customer.findOne({ email });
    
    const account = user || customer;
    
    if (!account) {
      throw new AppError("Invalid credentials", 401);
    }

    if (!account.isVerified) {
      throw new AppError("Please verify your email before logging in", 403);
    }

    if (!account.isActive) {
      throw new AppError("Account is deactivated", 403);
    }

    const isPasswordValid = await comparePassword(password, account.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    const role = user ? user.role : "customer";

    const token = generateToken({
      userId: account._id.toString(),
      email: account.email,
      role: role,
    });

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
  } catch (error) {
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
