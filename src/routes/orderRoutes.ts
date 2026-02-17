import express from "express";
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
  createPaymentIntent,
} from "../controllers/orderController";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createOrderValidator,
  updateOrderStatusValidator,
} from "../validators/orderValidator";

const router = express.Router();

router.use(authenticate);

router.get("/", getOrders);
router.get("/:id", getOrder);
router.post(
  "/",
  createOrderValidator,
  validate,
  createOrder
);
router.put(
  "/:id",
  authorize("admin", "manager", "staff"),
  updateOrder
);
router.post("/create-payment-intent", createPaymentIntent);
router.patch(
  "/:id/status",
  authorize("admin", "manager", "staff"),
  updateOrderStatusValidator,
  validate,
  updateOrderStatus
);
router.post("/:id/cancel", cancelOrder); // Customers can cancel their own orders

export default router;
