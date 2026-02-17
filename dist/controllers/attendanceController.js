"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceHistory = exports.getMyAttendance = exports.checkOut = exports.checkIn = exports.getAttendanceByDate = void 0;
const Attendance_1 = __importDefault(require("../models/Attendance"));
const User_1 = __importDefault(require("../models/User"));
const errorHandler_1 = require("../middlewares/errorHandler");
// Get attendance for a specific date
const getAttendanceByDate = async (req, res, next) => {
    try {
        const { date } = req.query;
        if (!date) {
            throw new errorHandler_1.AppError("Date is required", 400);
        }
        // Parse the date and set to start of day
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        // Get all active users
        const users = await User_1.default.find({ isActive: true }).select("-password");
        // Get attendance records for this date
        const attendanceRecords = await Attendance_1.default.find({
            date: targetDate,
        }).populate("userId", "name email role");
        // Create a map of attendance by userId
        const attendanceMap = new Map();
        attendanceRecords.forEach((record) => {
            attendanceMap.set(record.userId._id.toString(), record);
        });
        // Combine users with their attendance records
        const result = users.map((user) => {
            const attendance = attendanceMap.get(user._id.toString());
            return {
                userId: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                checkIn: attendance?.checkIn || null,
                checkOut: attendance?.checkOut || null,
                totalHours: attendance?.totalHours || 0,
                attendanceId: attendance?._id || null,
            };
        });
        res.status(200).json({
            status: "success",
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAttendanceByDate = getAttendanceByDate;
// Check in
const checkIn = async (req, res, next) => {
    try {
        const { userId, date } = req.body;
        if (!userId || !date) {
            throw new errorHandler_1.AppError("User ID and date are required", 400);
        }
        // Parse the date and set to start of day for comparison
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        // Check if user exists
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errorHandler_1.AppError("User not found", 404);
        }
        // Check if attendance record already exists
        let attendance = await Attendance_1.default.findOne({
            userId,
            date: targetDate,
        });
        if (attendance && attendance.checkIn) {
            throw new errorHandler_1.AppError("Already checked in for this date", 400);
        }
        const checkInTime = new Date();
        if (attendance) {
            // Update existing record
            attendance.checkIn = checkInTime;
            await attendance.save();
        }
        else {
            // Create new record
            attendance = await Attendance_1.default.create({
                userId,
                date: targetDate,
                checkIn: checkInTime,
            });
        }
        await attendance.populate("userId", "name email role");
        res.status(200).json({
            status: "success",
            data: attendance,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.checkIn = checkIn;
// Check out
const checkOut = async (req, res, next) => {
    try {
        const { userId, date } = req.body;
        if (!userId || !date) {
            throw new errorHandler_1.AppError("User ID and date are required", 400);
        }
        // Parse the date and set to start of day for comparison
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        // Find attendance record
        const attendance = await Attendance_1.default.findOne({
            userId,
            date: targetDate,
        });
        if (!attendance) {
            throw new errorHandler_1.AppError("No check-in record found for this date", 404);
        }
        if (!attendance.checkIn) {
            throw new errorHandler_1.AppError("Must check in before checking out", 400);
        }
        if (attendance.checkOut) {
            throw new errorHandler_1.AppError("Already checked out for this date", 400);
        }
        const checkOutTime = new Date();
        attendance.checkOut = checkOutTime;
        // Calculate total hours
        const diffMs = checkOutTime.getTime() - attendance.checkIn.getTime();
        const totalHours = diffMs / (1000 * 60 * 60); // Convert to hours
        attendance.totalHours = Math.round(totalHours * 100) / 100; // Round to 2 decimals
        await attendance.save();
        await attendance.populate("userId", "name email role");
        res.status(200).json({
            status: "success",
            data: attendance,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.checkOut = checkOut;
// Get own attendance status (for staff users)
const getMyAttendance = async (req, res, next) => {
    try {
        const { date } = req.query;
        const userId = req.user?.userId;
        if (!userId) {
            throw new errorHandler_1.AppError("Unauthorized", 401);
        }
        if (!date) {
            throw new errorHandler_1.AppError("Date is required", 400);
        }
        // Parse the date and set to start of day
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        // Get user info
        const user = await User_1.default.findById(userId).select("-password");
        if (!user) {
            throw new errorHandler_1.AppError("User not found", 404);
        }
        // Get attendance record for this date
        const attendance = await Attendance_1.default.findOne({
            userId,
            date: targetDate,
        });
        const result = {
            userId: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            checkIn: attendance?.checkIn || null,
            checkOut: attendance?.checkOut || null,
            totalHours: attendance?.totalHours || 0,
            attendanceId: attendance?._id || null,
        };
        res.status(200).json({
            status: "success",
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyAttendance = getMyAttendance;
// Get attendance history
const getAttendanceHistory = async (req, res, next) => {
    try {
        const { userId, startDate, endDate } = req.query;
        const query = {};
        if (userId) {
            query.userId = userId;
        }
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                query.date.$lte = new Date(endDate);
            }
        }
        const attendance = await Attendance_1.default.find(query)
            .populate("userId", "name email role")
            .sort({ date: -1 });
        res.status(200).json({
            status: "success",
            data: attendance,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAttendanceHistory = getAttendanceHistory;
