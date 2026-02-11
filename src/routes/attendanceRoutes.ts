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

router.get("/", authorize("admin", "manager"), getAttendanceByDate);
router.get("/my-attendance", authorize("staff"), getMyAttendance);
router.get("/history", authorize("admin", "manager"), getAttendanceHistory);
router.post("/check-in", authorize("admin", "manager", "staff"), checkIn);
router.post("/check-out", authorize("admin", "manager", "staff"), checkOut);

export default router;
