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
router.get("/", authenticate, authorize("admin"), getAllEmployees);
router.post("/", authenticate, authorize("admin"), createEmployee);
router.put("/:id", authenticate, authorize("admin"), updateEmployee);
router.patch("/:id/toggle-status", authenticate, authorize("admin"), toggleEmployeeStatus);
router.delete("/:id", authenticate, authorize("admin"), deleteEmployee);

export default router;
