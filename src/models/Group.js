import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const { Schema } = mongoose;

const groupSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    name_marathi: { type: String, required: true },
    name_english: { type: String, required: true },
    loan_interest_rate_monthly_percent: { type: Number, required: true, default: 1.5 },
    max_members: { type: Number, required: true, default: 50 },
    contribution_cycle_type: { type: String, required: true, default: 'monthly' },
    contribution_cycle_days: { type: Number, default: null },
    creator_user_id: { type: String, default: null },
  },
  {
    collection: 'groups',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.model('Group', groupSchema);
