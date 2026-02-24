import express from "express";
import { getStats } from "../controllers/dashboardController";
import { authenticate, authorize } from "../middlewares/auth";

const router = express.Router();

router.use(authenticate);

router.get("/stats", authorize("admin", "top_manager", "inventory_manager", "employee_manager", "blog_manager", "order_manager", "customer_manager", "report_manager", "staff"), getStats);

export default router;
