import mongoose, { Schema, Document } from 'mongoose';

export type TransactionType = 'credit' | 'debit';
export type TransactionSource = 'refund' | 'purchase' | 'admin_credit' | 'admin_debit' | 'order_cancellation';

export interface IWalletTransaction extends Document {
  walletId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: TransactionType; // credit (add points) or debit (use points)
  amount: number; // Points amount
  source: TransactionSource; // Where the points came from
  orderId?: mongoose.Types.ObjectId; // Reference order if applicable
  description: string;
  balanceAfter: number; // Balance after this transaction
  processedBy?: mongoose.Types.ObjectId; // Admin who processed (for refunds)
  createdAt: Date;
  updatedAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    source: {
      type: String,
      enum: ['refund', 'purchase', 'admin_credit', 'admin_debit', 'order_cancellation'],
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    description: {
      type: String,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ orderId: 1 });

export default mongoose.model<IWalletTransaction>('WalletTransaction', walletTransactionSchema);
