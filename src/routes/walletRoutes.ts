import express from 'express';
import {
  getOrCreateWallet,
  getWalletTransactions,
  checkBalance,
} from '../controllers/walletController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get or create wallet for logged-in user
router.get('/', getOrCreateWallet);

// Get wallet transactions history
router.get('/transactions', getWalletTransactions);

// Check if user has sufficient balance
router.get('/check-balance', checkBalance);

export default router;
