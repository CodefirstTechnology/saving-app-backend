import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const { Schema } = mongoose;

const ENTRY_TYPES = ['credit', 'debit'];
const CATEGORIES = ['savings', 'loan_issue', 'loan_repay', 'interest', 'fine', 'other'];

const transactionSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    group_id: { type: String, required: true },
    member_id: { type: String, default: null },
    loan_id: { type: String, default: null },
    entry_type: { type: String, required: true, enum: ENTRY_TYPES },
    category: { type: String, required: true, enum: CATEGORIES },
    amount: { type: Number, required: true },
    description_marathi: { type: String, default: null },
    description_english: { type: String, default: null },
    payment_mode: {
      type: String,
      default: null,
      validate: { validator: (v) => v == null || v === 'cash' || v === 'bank' },
    },
    occurred_at: { type: String, required: true },
    created_by_user_id: { type: String, default: null },
  },
  {
    collection: 'transactions',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

transactionSchema.index({ group_id: 1 });
transactionSchema.index({ member_id: 1 });
transactionSchema.index({ occurred_at: 1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ group_id: 1, occurred_at: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
export { ENTRY_TYPES, CATEGORIES };
