import express from "express";
import {
  getAttendanceByDate,
  checkIn,
  checkOut,
  getAttendanceHistory,
  getMyAttendance,
} from "../controllers/attendanceController";
import { authenticate, authorize } from "../middlewares/auth";

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "top_manager", "employee_manager"), getAttendanceByDate);
router.get("/my-attendance", getMyAttendance); // All authenticated users can view their own attendance
router.get("/history", authorize("admin", "top_manager", "employee_manager"), getAttendanceHistory);
router.post("/check-in", checkIn); // All authenticated users can check in
router.post("/check-out", checkOut); // All authenticated users can check out

export default router;
