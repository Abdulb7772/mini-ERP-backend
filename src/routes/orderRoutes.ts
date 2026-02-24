import express from "express";
import {
  getOrders,
  getMyOrders,
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

router.get("/my-orders", getMyOrders);
router.get("/", authorize("admin", "top_manager", "order_manager", "staff"), getOrders);
router.get("/:id", getOrder); // Allow customers to view their own orders
router.post(
  "/",
  createOrderValidator,
  validate,
  createOrder
);
router.put(
  "/:id",
  authorize("admin", "top_manager", "order_manager", "staff"),
  updateOrder
);
router.post("/create-payment-intent", createPaymentIntent);
router.patch(
  "/:id/status",
  authorize("admin", "top_manager", "order_manager", "staff"),
  updateOrderStatusValidator,
  validate,
  updateOrderStatus
);
router.post("/:id/cancel", cancelOrder); // Customers can cancel their own orders

export default router;
