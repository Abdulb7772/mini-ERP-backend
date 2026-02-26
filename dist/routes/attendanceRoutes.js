"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const attendanceController_1 = require("../controllers/attendanceController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get("/", (0, auth_1.authorize)("admin", "top_manager", "employee_manager"), attendanceController_1.getAttendanceByDate);
router.get("/my-attendance", attendanceController_1.getMyAttendance); // All authenticated users can view their own attendance
router.get("/history", (0, auth_1.authorize)("admin", "top_manager", "employee_manager"), attendanceController_1.getAttendanceHistory);
router.post("/check-in", attendanceController_1.checkIn); // All authenticated users can check in
router.post("/check-out", attendanceController_1.checkOut); // All authenticated users can check out
exports.default = router;
