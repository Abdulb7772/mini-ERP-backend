import express from "express";
import {
  getAllEmployees,
  getActiveEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
} from "../controllers/employeeController";
import { authenticate, authorize } from "../middlewares/auth";

const router = express.Router();

// Public routes
router.get("/active", getActiveEmployees);
router.get("/:id", getEmployeeById);

// Admin routes
router.get("/", authenticate, authorize("admin", "top_manager", "employee_manager"), getAllEmployees);
router.post("/", authenticate, authorize("admin", "top_manager", "employee_manager"), createEmployee);
router.put("/:id", authenticate, authorize("admin", "top_manager", "employee_manager"), updateEmployee);
router.patch("/:id/toggle-status", authenticate, authorize("admin", "top_manager", "employee_manager"), toggleEmployeeStatus);
router.delete("/:id", authenticate, authorize("admin", "top_manager", "employee_manager"), deleteEmployee);

export default router;
