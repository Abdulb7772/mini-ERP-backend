import { Response, NextFunction } from "express";
import Attendance from "../models/Attendance";
import User from "../models/User";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/auth";

// Get attendance for a specific date
export const getAttendanceByDate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      throw new AppError("Date is required", 400);
    }

    // Parse the date and set to start of day
    const targetDate = new Date(date as string);
    targetDate.setHours(0, 0, 0, 0);

    // Get all active users
    const users = await User.find({ isActive: true }).select("-password");

    // Get attendance records for this date
    const attendanceRecords = await Attendance.find({
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
  } catch (error) {
    next(error);
  }
};

// Check in
export const checkIn = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, date } = req.body;

    if (!userId || !date) {
      throw new AppError("User ID and date are required", 400);
    }

    // Parse the date and set to start of day for comparison
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Check if attendance record already exists
    let attendance = await Attendance.findOne({
      userId,
      date: targetDate,
    });

    if (attendance && attendance.checkIn) {
      throw new AppError("Already checked in for this date", 400);
    }

    const checkInTime = new Date();

    if (attendance) {
      // Update existing record
      attendance.checkIn = checkInTime;
      await attendance.save();
    } else {
      // Create new record
      attendance = await Attendance.create({
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
  } catch (error) {
    next(error);
  }
};

// Check out
export const checkOut = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, date } = req.body;

    if (!userId || !date) {
      throw new AppError("User ID and date are required", 400);
    }

    // Parse the date and set to start of day for comparison
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Find attendance record
    const attendance = await Attendance.findOne({
      userId,
      date: targetDate,
    });

    if (!attendance) {
      throw new AppError("No check-in record found for this date", 404);
    }

    if (!attendance.checkIn) {
      throw new AppError("Must check in before checking out", 400);
    }

    if (attendance.checkOut) {
      throw new AppError("Already checked out for this date", 400);
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
  } catch (error) {
    next(error);
  }
};

// Get own attendance status (for staff users)
export const getMyAttendance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    if (!date) {
      throw new AppError("Date is required", 400);
    }

    // Parse the date and set to start of day
    const targetDate = new Date(date as string);
    targetDate.setHours(0, 0, 0, 0);

    // Get user info
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Get attendance record for this date
    const attendance = await Attendance.findOne({
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
  } catch (error) {
    next(error);
  }
};

// Get attendance history
export const getAttendanceHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const query: any = {};

    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate as string);
      }
    }

    const attendance = await Attendance.find(query)
      .populate("userId", "name email role")
      .sort({ date: -1 });

    res.status(200).json({
      status: "success",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};
