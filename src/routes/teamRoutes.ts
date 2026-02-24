import express from "express";
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  toggleTeamStatus,
} from "../controllers/teamController";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createTeamValidator,
  updateTeamValidator,
} from "../validators/teamValidator";

const router = express.Router();

// Protected routes
router.use(authenticate);

router.get("/", getTeams); // Allow all authenticated users to view teams for chat
router.get("/:id", authorize("admin"), getTeam);
router.post("/", authorize("admin"), createTeamValidator, validate, createTeam);
router.put("/:id", authorize("admin"), updateTeamValidator, validate, updateTeam);
router.delete("/:id", authorize("admin"), deleteTeam);
router.patch("/:id/toggle-status", authorize("admin"), toggleTeamStatus);

export default router;
