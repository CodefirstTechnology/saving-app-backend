import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const { Schema } = mongoose;

const loanVoteSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    loan_id: { type: String, required: true },
    voter_member_id: { type: String, required: true },
    decision: { type: String, required: true, enum: ['approve', 'reject'] },
    comment: { type: String, default: null },
  },
  {
    collection: 'loan_votes',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

loanVoteSchema.index({ loan_id: 1 });
loanVoteSchema.index({ voter_member_id: 1 });
loanVoteSchema.index({ loan_id: 1, voter_member_id: 1 }, { unique: true });

export default mongoose.model('LoanVote', loanVoteSchema);
