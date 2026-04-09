import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const { Schema } = mongoose;

const LOAN_STATUSES = ['pending', 'active', 'paid', 'overdue', 'rejected'];

const loanSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    group_id: { type: String, required: true },
    member_id: { type: String, required: true },
    reference_code: { type: String, default: null },
    principal: { type: Number, required: true },
    interest_rate_percent: { type: Number, required: true, default: 0 },
    term_months: { type: Number, required: true },
    outstanding_balance: { type: Number, required: true },
    status: { type: String, required: true, default: 'pending', enum: LOAN_STATUSES },
    issued_at: { type: String, default: null },
    due_at: { type: String, default: null },
    reason: { type: String, default: null },
    emi_amount: { type: Number, default: null },
    suggested_tier: { type: String, default: null },
    installments_paid: { type: Number, required: true, default: 0 },
    next_due_date: { type: String, default: null },
    reject_reason: { type: String, default: null },
  },
  {
    collection: 'loans',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

loanSchema.index({ group_id: 1 });
loanSchema.index({ member_id: 1 });
loanSchema.index({ status: 1 });
loanSchema.index(
  { group_id: 1, reference_code: 1 },
  { unique: true, partialFilterExpression: { reference_code: { $type: 'string', $ne: '' } } }
);

const Loan = mongoose.model('Loan', loanSchema);
export default Loan;
export { LOAN_STATUSES };
