import { Router } from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cartController";
import { authenticate } from "../middlewares/auth";

const router = Router();

// All cart routes require authentication
router.use(authenticate);

router.post("/", addToCart);
router.get("/", getCart);
router.put("/update", updateCartItem);
router.delete("/remove", removeFromCart);
router.delete("/clear", clearCart);

export default router;
