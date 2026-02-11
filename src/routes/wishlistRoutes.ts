import { Router } from "express";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  clearWishlist,
  checkWishlistItem,
} from "../controllers/wishlistController";
import { authenticate } from "../middlewares/auth";

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

router.post("/", addToWishlist);
router.get("/", getWishlist);
router.get("/check", checkWishlistItem);
router.delete("/remove", removeFromWishlist);
router.delete("/clear", clearWishlist);

export default router;
