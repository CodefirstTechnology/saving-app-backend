import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const { Schema } = mongoose;

const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer'];
const COLLECTION_STATUSES = ['initiated', 'collected', 'rejected'];

const collectionPaymentSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    group_id: { type: String, required: true },
    member_id: { type: String, required: true },
    submitted_by_user_id: { type: String, default: null },
    amount: { type: Number, required: true },
    payment_method: { type: String, required: true, enum: PAYMENT_METHODS },
    transaction_reference: { type: String, default: null },
    paid_at: { type: Date, required: true },
    status: { type: String, required: true, default: 'initiated', enum: COLLECTION_STATUSES },
    digitally_traceable: { type: Boolean, required: true, default: false },
    requires_admin_confirm: { type: Boolean, required: true, default: true },
    collected_at: { type: Date, default: null },
    confirmed_by_user_id: { type: String, default: null },
    rejected_at: { type: Date, default: null },
    rejected_by_user_id: { type: String, default: null },
    linked_transaction_id: { type: String, default: null },
  },
  {
    collection: 'collection_payments',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

collectionPaymentSchema.index({ group_id: 1, status: 1 });
collectionPaymentSchema.index({ group_id: 1, member_id: 1 });

const CollectionPayment = mongoose.model('CollectionPayment', collectionPaymentSchema);
export default CollectionPayment;
export { PAYMENT_METHODS, COLLECTION_STATUSES };
