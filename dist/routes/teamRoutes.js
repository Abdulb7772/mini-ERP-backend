"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const teamController_1 = require("../controllers/teamController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const teamValidator_1 = require("../validators/teamValidator");
const router = express_1.default.Router();
// Protected routes
router.use(auth_1.authenticate);
router.get("/", teamController_1.getTeams); // Allow all authenticated users to view teams for chat
router.get("/:id", (0, auth_1.authorize)("admin"), teamController_1.getTeam);
router.post("/", (0, auth_1.authorize)("admin"), teamValidator_1.createTeamValidator, validate_1.validate, teamController_1.createTeam);
router.put("/:id", (0, auth_1.authorize)("admin"), teamValidator_1.updateTeamValidator, validate_1.validate, teamController_1.updateTeam);
router.delete("/:id", (0, auth_1.authorize)("admin"), teamController_1.deleteTeam);
router.patch("/:id/toggle-status", (0, auth_1.authorize)("admin"), teamController_1.toggleTeamStatus);
exports.default = router;
