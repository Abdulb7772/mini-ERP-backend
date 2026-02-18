import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Wallet from '../models/Wallet';
import WalletTransaction from '../models/WalletTransaction';
import mongoose from 'mongoose';

/**
 * Get or create wallet for a user
 */
export const getOrCreateWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    let wallet = await Wallet.findOne({ userId });

    // Create wallet if it doesn't exist
    if (!wallet) {
      wallet = await Wallet.create({
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
  } catch (error: any) {
    console.error('Error getting/creating wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get wallet',
    });
  }
};

/**
 * Get wallet transactions history
 */
export const getWalletTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
      return;
    }

    // Build query
    const query: any = { walletId: wallet._id };
    if (type && (type === 'credit' || type === 'debit')) {
      query.type = type;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .populate('orderId', 'orderNumber totalAmount')
        .populate('processedBy', 'name email'),
      WalletTransaction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
        totalItems: total,
        itemsPerPage: parseInt(limit as string),
      },
    });
  } catch (error: any) {
    console.error('Error getting wallet transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get transactions',
    });
  }
};

/**
 * Add points to wallet (used internally by other controllers)
 * This is a utility function, not an API endpoint
 */
export const addPoints = async (
  userId: mongoose.Types.ObjectId,
  amount: number,
  source: 'refund' | 'admin_credit' | 'order_cancellation',
  description: string,
  orderId?: mongoose.Types.ObjectId,
  processedBy?: mongoose.Types.ObjectId
): Promise<{ success: boolean; wallet?: any; transaction?: any; message?: string }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get or create wallet
    let wallet = await Wallet.findOne({ userId }).session(session);

    if (!wallet) {
      const createdWallet = await Wallet.create(
        [
          {
            userId,
            balance: 0,
            totalEarned: 0,
            totalSpent: 0,
          },
        ],
        { session }
      );
      wallet = createdWallet[0];
    }

    // Update wallet balance
    wallet.balance += amount;
    wallet.totalEarned += amount;
    await wallet.save({ session });

    // Create transaction record
    const transaction = await WalletTransaction.create(
      [
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
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      wallet,
      transaction: transaction[0],
    };
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error adding points:', error);
    return {
      success: false,
      message: error.message || 'Failed to add points',
    };
  } finally {
    session.endSession();
  }
};

/**
 * Deduct points from wallet (used internally, e.g., during checkout)
 */
export const deductPoints = async (
  userId: mongoose.Types.ObjectId,
  amount: number,
  source: 'purchase' | 'admin_debit',
  description: string,
  orderId?: mongoose.Types.ObjectId,
  processedBy?: mongoose.Types.ObjectId
): Promise<{ success: boolean; wallet?: any; transaction?: any; message?: string }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await Wallet.findOne({ userId }).session(session);

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
    const transaction = await WalletTransaction.create(
      [
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
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      wallet,
      transaction: transaction[0],
    };
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error deducting points:', error);
    return {
      success: false,
      message: error.message || 'Failed to deduct points',
    };
  } finally {
    session.endSession();
  }
};

/**
 * Check if user has sufficient balance
 */
export const checkBalance = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      res.status(200).json({
        success: true,
        data: {
          hasSufficientBalance: false,
          currentBalance: 0,
          requiredAmount: parseFloat(amount as string) || 0,
        },
      });
      return;
    }

    const requiredAmount = parseFloat(amount as string) || 0;

    res.status(200).json({
      success: true,
      data: {
        hasSufficientBalance: wallet.balance >= requiredAmount,
        currentBalance: wallet.balance,
        requiredAmount,
      },
    });
  } catch (error: any) {
    console.error('Error checking balance:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check balance',
    });
  }
};
