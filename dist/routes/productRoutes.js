"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const productValidator_1 = require("../validators/productValidator");
const router = express_1.default.Router();
// Public routes (no authentication required)
router.get("/", productController_1.getProducts);
router.get("/:id", productController_1.getProduct);
// Protected routes (authentication required)
router.use(auth_1.authenticate);
router.post("/", (0, auth_1.authorize)("admin", "manager"), productValidator_1.createProductValidator, validate_1.validate, productController_1.createProduct);
router.put("/:id", (0, auth_1.authorize)("admin", "manager"), productValidator_1.updateProductValidator, validate_1.validate, productController_1.updateProduct);
router.delete("/:id", (0, auth_1.authorize)("admin", "manager"), productController_1.deleteProduct);
router.patch("/:id/stock", (0, auth_1.authorize)("admin", "manager", "staff"), productController_1.updateProductStock);
router.patch("/variations/:id/stock", (0, auth_1.authorize)("admin", "manager", "staff"), productController_1.updateVariationStock);
exports.default = router;
