import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    user_id: { type: String, required: true },
    category: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: null },
    read_at: { type: Date, default: null },
  },
  {
    collection: 'notifications',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

notificationSchema.index({ user_id: 1 });
notificationSchema.index({ user_id: 1, read_at: 1 });

export default mongoose.model('Notification', notificationSchema);
