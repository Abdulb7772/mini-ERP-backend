"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const orderValidator_1 = require("../validators/orderValidator");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get("/my-orders", orderController_1.getMyOrders);
router.get("/", (0, auth_1.authorize)("admin", "top_manager", "order_manager", "staff"), orderController_1.getOrders);
router.get("/:id", orderController_1.getOrder); // Allow customers to view their own orders
router.post("/", orderValidator_1.createOrderValidator, validate_1.validate, orderController_1.createOrder);
router.put("/:id", (0, auth_1.authorize)("admin", "top_manager", "order_manager", "staff"), orderController_1.updateOrder);
router.post("/create-payment-intent", orderController_1.createPaymentIntent);
router.patch("/:id/status", (0, auth_1.authorize)("admin", "top_manager", "order_manager", "staff"), orderValidator_1.updateOrderStatusValidator, validate_1.validate, orderController_1.updateOrderStatus);
router.post("/:id/cancel", orderController_1.cancelOrder); // Customers can cancel their own orders
exports.default = router;
