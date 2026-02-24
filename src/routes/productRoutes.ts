import express from "express";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  updateVariationStock,
} from "../controllers/productController";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createProductValidator,
  updateProductValidator,
} from "../validators/productValidator";

const router = express.Router();

// Public routes (no authentication required)
router.get("/", getProducts);
router.get("/:id", getProduct);

// Protected routes (authentication required)
router.use(authenticate);

router.post(
  "/",
  authorize("admin", "inventory_manager"),
  createProductValidator,
  validate,
  createProduct
);
router.put(
  "/:id",
  authorize("admin", "inventory_manager"),
  updateProductValidator,
  validate,
  updateProduct
);
router.delete("/:id", authorize("admin", "inventory_manager"), deleteProduct);
router.patch("/:id/stock", authorize("admin", "inventory_manager", "staff"), updateProductStock);
router.patch("/variations/:id/stock", authorize("admin", "inventory_manager", "staff"), updateVariationStock);

export default router;
