"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const employeeController_1 = require("../controllers/employeeController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
// Public routes
router.get("/active", employeeController_1.getActiveEmployees);
router.get("/:id", employeeController_1.getEmployeeById);
// Admin routes
router.get("/", auth_1.authenticate, (0, auth_1.authorize)("admin"), employeeController_1.getAllEmployees);
router.post("/", auth_1.authenticate, (0, auth_1.authorize)("admin"), employeeController_1.createEmployee);
router.put("/:id", auth_1.authenticate, (0, auth_1.authorize)("admin"), employeeController_1.updateEmployee);
router.patch("/:id/toggle-status", auth_1.authenticate, (0, auth_1.authorize)("admin"), employeeController_1.toggleEmployeeStatus);
router.delete("/:id", auth_1.authenticate, (0, auth_1.authorize)("admin"), employeeController_1.deleteEmployee);
exports.default = router;
