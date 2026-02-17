"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const complaintController_1 = require("../controllers/complaintController");
const auth_1 = require("../middlewares/auth");
const complaintValidator_1 = require("../validators/complaintValidator");
const validate_1 = require("../middlewares/validate");
const router = express_1.default.Router();
// Customer routes
router.post("/", auth_1.authenticate, (0, auth_1.authorize)("customer"), complaintValidator_1.createComplaintValidator, validate_1.validate, complaintController_1.createComplaint);
router.get("/my-complaints", auth_1.authenticate, (0, auth_1.authorize)("customer"), complaintController_1.getCustomerComplaints);
router.get("/can-file/:orderId", auth_1.authenticate, (0, auth_1.authorize)("customer"), complaintController_1.canFileComplaint);
// Admin/Staff routes
router.get("/", auth_1.authenticate, (0, auth_1.authorize)("admin", "staff", "manager"), complaintController_1.getAllComplaints);
router.get("/stats", auth_1.authenticate, (0, auth_1.authorize)("admin", "staff", "manager"), complaintController_1.getComplaintStats);
router.get("/:id", auth_1.authenticate, complaintController_1.getComplaintById);
router.put("/:id", auth_1.authenticate, (0, auth_1.authorize)("admin", "staff", "manager"), complaintValidator_1.updateComplaintValidator, validate_1.validate, complaintController_1.updateComplaintStatus);
router.delete("/:id", auth_1.authenticate, (0, auth_1.authorize)("admin"), complaintController_1.deleteComplaint);
exports.default = router;
