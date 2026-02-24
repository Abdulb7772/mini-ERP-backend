import express from "express";
import {
  stockIn,
  stockOut,
  getLogs,
  getLowStock,
} from "../controllers/inventoryController";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  stockInValidator,
  stockOutValidator,
} from "../validators/inventoryValidator";

const router = express.Router();

router.use(authenticate);

router.post(
  "/stock-in",
  authorize("admin", "inventory_manager"),
  stockInValidator,
  validate,
  stockIn
);
router.post(
  "/stock-out",
  authorize("admin", "inventory_manager"),
  stockOutValidator,
  validate,
  stockOut
);
router.get("/logs", authorize("admin", "inventory_manager", "staff"), getLogs);
router.get("/low-stock", authorize("admin", "inventory_manager", "staff"), getLowStock);

export default router;
