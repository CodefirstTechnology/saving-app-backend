import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const { Schema } = mongoose;

const DEPOSIT_METHODS = ['cash', 'upi', 'bank_transfer'];

const bankDepositSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    group_id: { type: String, required: true },
    amount: { type: Number, required: true },
    deposit_date: { type: String, required: true },
    bank_name: { type: String, required: true },
    deposit_method: { type: String, required: true, enum: DEPOSIT_METHODS },
    proof_relative_path: { type: String, required: true },
    submitted_by_user_id: { type: String, default: null },
    status: { type: String, required: true, default: 'deposit_submitted' },
  },
  {
    collection: 'bank_deposits',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

bankDepositSchema.index({ group_id: 1 });

const BankDeposit = mongoose.model('BankDeposit', bankDepositSchema);
export default BankDeposit;
export { DEPOSIT_METHODS };
