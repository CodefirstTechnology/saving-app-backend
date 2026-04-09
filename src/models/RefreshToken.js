import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const { Schema } = mongoose;

const refreshTokenSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    user_id: { type: String, required: true },
    token_hash: { type: String, required: true, unique: true },
    device_id: { type: String, default: null },
    expires_at: { type: Date, required: true },
    revoked_at: { type: Date, default: null },
  },
  {
    collection: 'refresh_tokens',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export default mongoose.model('RefreshToken', refreshTokenSchema);
