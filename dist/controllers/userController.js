"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerificationEmail = exports.verifyEmail = exports.deleteUser = exports.toggleUserStatus = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const Customer_1 = __importDefault(require("../models/Customer"));
const password_1 = require("../utils/password");
const errorHandler_1 = require("../middlewares/errorHandler");
const email_1 = require("../utils/email");
const getUsers = async (req, res, next) => {
    try {
        const users = await User_1.default.find().select("-password").sort({ createdAt: -1 });
        res.status(200).json({
            status: "success",
            data: users,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            throw new errorHandler_1.AppError("Email already registered", 400);
        }
        // Generate verification token
        const verificationToken = (0, email_1.generateVerificationToken)();
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        console.log("Creating user with verification token:", verificationToken);
        console.log("Token length:", verificationToken.length);
        console.log("Token expiry:", verificationTokenExpires);
        const hashedPassword = await (0, password_1.hashPassword)(password);
        const user = await User_1.default.create({
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
            await (0, email_1.sendVerificationEmail)(email, name, verificationToken, password);
        }
        catch (emailError) {
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
    }
    catch (error) {
        next(error);
    }
};
exports.createUser = createUser;
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;
        const user = await User_1.default.findById(id);
        if (!user) {
            throw new errorHandler_1.AppError("User not found", 404);
        }
        if (name)
            user.name = name;
        if (email)
            user.email = email;
        if (role)
            user.role = role;
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateUser = updateUser;
const toggleUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            throw new errorHandler_1.AppError("User not found", 404);
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
    }
    catch (error) {
        next(error);
    }
};
exports.toggleUserStatus = toggleUserStatus;
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            throw new errorHandler_1.AppError("User not found", 404);
        }
        await User_1.default.findByIdAndDelete(id);
        res.status(200).json({
            status: "success",
            message: "User deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteUser = deleteUser;
const verifyEmail = async (req, res, next) => {
    try {
        // Accept token from query params or body
        const token = req.query.token || req.body.token;
        if (!token) {
            throw new errorHandler_1.AppError("Verification token is required", 400);
        }
        console.log("Verification attempt with token:", token);
        console.log("Token length:", token.length);
        // Check both User and Customer tables
        const user = await User_1.default.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() },
        });
        const customer = await Customer_1.default.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() },
        });
        const account = user || customer;
        if (!account) {
            // Check if token exists but expired
            const expiredUser = await User_1.default.findOne({ verificationToken: token });
            const expiredCustomer = await Customer_1.default.findOne({ verificationToken: token });
            if (expiredUser || expiredCustomer) {
                console.log("Token found but expired");
                throw new errorHandler_1.AppError("Verification token has expired. Please request a new verification email.", 400);
            }
            throw new errorHandler_1.AppError("Invalid verification token", 400);
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
    }
    catch (error) {
        next(error);
    }
};
exports.verifyEmail = verifyEmail;
const resendVerificationEmail = async (req, res, next) => {
    try {
        // Accept email from body (public route)
        const { email } = req.body;
        if (!email) {
            throw new errorHandler_1.AppError("Email is required", 400);
        }
        // Check both User and Customer tables
        const user = await User_1.default.findOne({ email });
        const customer = await Customer_1.default.findOne({ email });
        const account = user || customer;
        if (!account) {
            throw new errorHandler_1.AppError("Account not found", 404);
        }
        if (account.isVerified) {
            throw new errorHandler_1.AppError("Account is already verified", 400);
        }
        // Generate new verification token
        const verificationToken = (0, email_1.generateVerificationToken)();
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        account.verificationToken = verificationToken;
        account.verificationTokenExpires = verificationTokenExpires;
        await account.save();
        // Send verification email (without password since user already has credentials)
        try {
            await (0, email_1.sendVerificationEmail)(account.email, account.name, verificationToken);
        }
        catch (emailError) {
            console.error("Failed to send email:", emailError);
            throw new errorHandler_1.AppError("Failed to send verification email", 500);
        }
        res.status(200).json({
            status: "success",
            message: "Verification email sent successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resendVerificationEmail = resendVerificationEmail;
