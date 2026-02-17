import express from "express";
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customerController";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createCustomerValidator,
  updateCustomerValidator,
} from "../validators/customerValidator";

const router = express.Router();

router.use(authenticate);

router.get("/", getCustomers);
router.get("/:id", getCustomer);
router.post(
  "/",
  authorize("admin", "manager"),
  createCustomerValidator,
  validate,
  createCustomer
);
router.put(
  "/:id",
  authorize("admin", "manager"),
  updateCustomerValidator,
  validate,
  updateCustomer
);
router.delete(
  "/:id",
  authorize("admin"),
  deleteCustomer
);

export default router;
