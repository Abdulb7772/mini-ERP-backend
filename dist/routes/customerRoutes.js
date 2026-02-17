"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customerController_1 = require("../controllers/customerController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const customerValidator_1 = require("../validators/customerValidator");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get("/", customerController_1.getCustomers);
router.get("/:id", customerController_1.getCustomer);
router.post("/", (0, auth_1.authorize)("admin", "manager"), customerValidator_1.createCustomerValidator, validate_1.validate, customerController_1.createCustomer);
router.put("/:id", (0, auth_1.authorize)("admin", "manager"), customerValidator_1.updateCustomerValidator, validate_1.validate, customerController_1.updateCustomer);
router.delete("/:id", (0, auth_1.authorize)("admin"), customerController_1.deleteCustomer);
exports.default = router;
