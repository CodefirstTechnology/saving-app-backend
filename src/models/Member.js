import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const { Schema } = mongoose;

const memberSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    group_id: { type: String, required: true },
    user_id: { type: String, default: null },
    name_marathi: { type: String, required: true },
    name_english: { type: String, required: true },
    phone: { type: String, default: null },
    savings_balance: { type: Number, required: true, default: 0 },
    is_active: { type: Boolean, required: true, default: true },
    missed_payments_count: { type: Number, required: true, default: 0 },
    fines_total: { type: Number, required: true, default: 0 },
  },
  {
    collection: 'members',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

memberSchema.index({ group_id: 1 });
memberSchema.index({ phone: 1 });
memberSchema.index({ group_id: 1, phone: 1 });

export default mongoose.model('Member', memberSchema);
