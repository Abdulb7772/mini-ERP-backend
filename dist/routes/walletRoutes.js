"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const walletController_1 = require("../controllers/walletController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Get or create wallet for logged-in user
router.get('/', walletController_1.getOrCreateWallet);
// Get wallet transactions history
router.get('/transactions', walletController_1.getWalletTransactions);
// Check if user has sufficient balance
router.get('/check-balance', walletController_1.checkBalance);
exports.default = router;
