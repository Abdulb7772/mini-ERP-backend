import express from "express";
import { getStats } from "../controllers/dashboardController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

router.use(authenticate);

router.get("/stats", getStats);

export default router;
