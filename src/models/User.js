import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { ROLE_VALUES } from '../constants/roles.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    email: { type: String, lowercase: true, trim: true, default: null },
    mobile_number: { type: String, trim: true, default: null },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      default: 'user',
      enum: ROLE_VALUES,
    },
    group_id: { type: String, default: null },
    member_id: { type: String, default: null },
    full_name: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    town: { type: String, default: null },
    pincode: { type: String, default: null },
  },
  {
    collection: 'users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

userSchema.index({ group_id: 1 });
userSchema.index({ role: 1 });
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string', $gt: '' } } }
);
userSchema.index(
  { mobile_number: 1, group_id: 1 },
  {
    unique: true,
    partialFilterExpression: { mobile_number: { $type: 'string', $nin: [null, ''] } },
  }
);

const User = mongoose.model('User', userSchema);
export default User;
export { ROLE_VALUES as USER_ROLE_VALUES };
