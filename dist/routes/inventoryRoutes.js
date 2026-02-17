"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const inventoryController_1 = require("../controllers/inventoryController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const inventoryValidator_1 = require("../validators/inventoryValidator");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.post("/stock-in", (0, auth_1.authorize)("admin", "manager"), inventoryValidator_1.stockInValidator, validate_1.validate, inventoryController_1.stockIn);
router.post("/stock-out", (0, auth_1.authorize)("admin", "manager"), inventoryValidator_1.stockOutValidator, validate_1.validate, inventoryController_1.stockOut);
router.get("/logs", inventoryController_1.getLogs);
router.get("/low-stock", inventoryController_1.getLowStock);
exports.default = router;
