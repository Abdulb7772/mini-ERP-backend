import express from "express";
import {
  createComplaint,
  getCustomerComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  deleteComplaint,
  getComplaintStats,
  canFileComplaint,
} from "../controllers/complaintController";
import { authenticate, authorize } from "../middlewares/auth";
import {
  createComplaintValidator,
  updateComplaintValidator,
} from "../validators/complaintValidator";
import { validate } from "../middlewares/validate";

const router = express.Router();

// Customer routes
router.post(
  "/",
  authenticate,
  authorize("customer"),
  createComplaintValidator,
  validate,
  createComplaint
);
router.get("/my-complaints", authenticate, authorize("customer"), getCustomerComplaints);
router.get("/can-file/:orderId", authenticate, authorize("customer"), canFileComplaint);

// Admin/Staff routes
router.get("/", authenticate, authorize("admin", "staff", "manager"), getAllComplaints);
router.get("/stats", authenticate, authorize("admin", "staff", "manager"), getComplaintStats);
router.get("/:id", authenticate, getComplaintById);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "staff", "manager"),
  updateComplaintValidator,
  validate,
  updateComplaintStatus
);
router.delete("/:id", authenticate, authorize("admin"), deleteComplaint);

export default router;
