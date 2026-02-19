"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBalance = exports.deductPoints = exports.addPoints = exports.getWalletTransactions = exports.getOrCreateWallet = void 0;
const Wallet_1 = __importDefault(require("../models/Wallet"));
const WalletTransaction_1 = __importDefault(require("../models/WalletTransaction"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Get or create wallet for a user
 */
const getOrCreateWallet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        let wallet = await Wallet_1.default.findOne({ userId });
        // Create wallet if it doesn't exist
        if (!wallet) {
            wallet = await Wallet_1.default.create({
                userId,
                balance: 0,
                totalEarned: 0,
                totalSpent: 0,
            });
        }
        res.status(200).json({
            success: true,
            data: wallet,
        });
    }
    catch (error) {
        console.error('Error getting/creating wallet:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get wallet',
        });
    }
};
exports.getOrCreateWallet = getOrCreateWallet;
/**
 * Get wallet transactions history
 */
const getWalletTransactions = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { page = '1', limit = '10', type } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const wallet = await Wallet_1.default.findOne({ userId });
        if (!wallet) {
            res.status(404).json({
                success: false,
                message: 'Wallet not found',
            });
            return;
        }
        // Build query
        const query = { walletId: wallet._id };
        if (type && (type === 'credit' || type === 'debit')) {
            query.type = type;
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [transactions, total] = await Promise.all([
            WalletTransaction_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('orderId', 'orderNumber totalAmount')
                .populate('processedBy', 'name email'),
            WalletTransaction_1.default.countDocuments(query),
        ]);
        res.status(200).json({
            success: true,
            data: transactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total,
                itemsPerPage: parseInt(limit),
            },
        });
    }
    catch (error) {
        console.error('Error getting wallet transactions:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get transactions',
        });
    }
};
exports.getWalletTransactions = getWalletTransactions;
/**
 * Add points to wallet (used internally by other controllers)
 * This is a utility function, not an API endpoint
 */
const addPoints = async (userId, amount, source, description, orderId, processedBy) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // Get or create wallet
        let wallet = await Wallet_1.default.findOne({ userId }).session(session);
        if (!wallet) {
            const createdWallet = await Wallet_1.default.create([
                {
                    userId,
                    balance: 0,
                    totalEarned: 0,
                    totalSpent: 0,
                },
            ], { session });
            wallet = createdWallet[0];
        }
        // Update wallet balance
        wallet.balance += amount;
        wallet.totalEarned += amount;
        await wallet.save({ session });
        // Create transaction record
        const transaction = await WalletTransaction_1.default.create([
            {
                walletId: wallet._id,
                userId,
                type: 'credit',
                amount,
                source,
                description,
                orderId,
                balanceAfter: wallet.balance,
                processedBy,
            },
        ], { session });
        await session.commitTransaction();
        return {
            success: true,
            wallet,
            transaction: transaction[0],
        };
    }
    catch (error) {
        await session.abortTransaction();
        console.error('Error adding points:', error);
        return {
            success: false,
            message: error.message || 'Failed to add points',
        };
    }
    finally {
        session.endSession();
    }
};
exports.addPoints = addPoints;
/**
 * Deduct points from wallet (used internally, e.g., during checkout)
 */
const deductPoints = async (userId, amount, source, description, orderId, processedBy) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const wallet = await Wallet_1.default.findOne({ userId }).session(session);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        if (wallet.balance < amount) {
            throw new Error('Insufficient wallet balance');
        }
        // Update wallet balance
        wallet.balance -= amount;
        wallet.totalSpent += amount;
        await wallet.save({ session });
        // Create transaction record
        const transaction = await WalletTransaction_1.default.create([
            {
                walletId: wallet._id,
                userId,
                type: 'debit',
                amount,
                source,
                description,
                orderId,
                balanceAfter: wallet.balance,
                processedBy,
            },
        ], { session });
        await session.commitTransaction();
        return {
            success: true,
            wallet,
            transaction: transaction[0],
        };
    }
    catch (error) {
        await session.abortTransaction();
        console.error('Error deducting points:', error);
        return {
            success: false,
            message: error.message || 'Failed to deduct points',
        };
    }
    finally {
        session.endSession();
    }
};
exports.deductPoints = deductPoints;
/**
 * Check if user has sufficient balance
 */
const checkBalance = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { amount } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const wallet = await Wallet_1.default.findOne({ userId });
        if (!wallet) {
            res.status(200).json({
                success: true,
                data: {
                    hasSufficientBalance: false,
                    currentBalance: 0,
                    requiredAmount: parseFloat(amount) || 0,
                },
            });
            return;
        }
        const requiredAmount = parseFloat(amount) || 0;
        res.status(200).json({
            success: true,
            data: {
                hasSufficientBalance: wallet.balance >= requiredAmount,
                currentBalance: wallet.balance,
                requiredAmount,
            },
        });
    }
    catch (error) {
        console.error('Error checking balance:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to check balance',
        });
    }
};
exports.checkBalance = checkBalance;
