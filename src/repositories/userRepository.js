import { User } from '../models/index.js';
import { createWithOptionalSession } from '../utils/mongooseCreate.js';

const userRepository = {
  async findById(id) {
    return User.findById(id);
  },
  async findByEmail(email) {
    if (!email) return null;
    return User.findOne({ email: email.toLowerCase() });
  },
  async findByMobileNumber(mobileDigits) {
    if (!mobileDigits) return null;
    return User.findOne({ mobile_number: mobileDigits });
  },

  async findAllByMobileNumber(mobileDigits) {
    if (!mobileDigits) return [];
    return User.find({ mobile_number: mobileDigits }).sort({ created_at: 1 });
  },

  async findByMobileNumberAndGroupId(mobileDigits, groupId) {
    if (!mobileDigits || groupId == null || groupId === '') return null;
    return User.findOne({ mobile_number: mobileDigits, group_id: groupId });
  },

  async hasAnyUserWithMobile(mobileDigits) {
    if (!mobileDigits) return false;
    const n = await User.countDocuments({ mobile_number: mobileDigits });
    return n > 0;
  },
  async findByMemberId(memberId) {
    if (!memberId) return null;
    return User.findOne({ member_id: memberId });
  },
  async findByUserId(userId) {
    if (!userId) return null;
    return User.findOne({ user_id: userId.trim() });
  },
  async findByFirebaseUid(firebaseUid) {
    if (!firebaseUid) return null;
    return User.findOne({ firebase_uid: firebaseUid.trim() });
  },
  async generateUniqueUserId() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 100) {
      attempts++;
      let randStr = '';
      for (let i = 0; i < 6; i++) {
        randStr += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `BG-${randStr}`;
      const existing = await User.findOne({ user_id: code });
      if (!existing) {
        isUnique = true;
      }
    }
    if (!isUnique) {
      const count = await User.countDocuments();
      code = `BG-${(count + 1).toString().padStart(6, '0')}`;
    }
    return code;
  },
  async create(data, options = {}) {
    if (!data.user_id) {
      data.user_id = await this.generateUniqueUserId();
    }
    if (!data.account_status) {
      data.account_status = 'ACTIVE';
    }
    return createWithOptionalSession(User, data, options);
  },
  async updateGroupId(id, group_id, options = {}) {
    const opts = options.session ? { session: options.session } : {};
    const r = await User.updateOne({ _id: id }, { group_id }, opts);
    return r.matchedCount > 0;
  },
  async count() {
    return User.countDocuments();
  },
  async listAllUserIdsInGroup(groupId) {
    if (!groupId) return [];
    const rows = await User.find({ group_id: groupId }).select('_id').lean();
    return [...new Set(rows.map((r) => r._id))];
  },

  async listStaffUserIdsForGroup(groupId) {
    if (!groupId) return [];
    const rows = await User.find({ group_id: groupId, role: { $in: ['admin'] } })
      .select('_id')
      .lean();
    return rows.map((r) => r._id);
  },

  async addPushToken(userId, token) {
    if (!userId || !token) return;
    await User.updateOne({ _id: userId }, { $addToSet: { push_tokens: token } });
  },

  async getPushTokensByUserIds(userIds) {
    if (!userIds || userIds.length === 0) return [];
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const users = await User.find({ _id: { $in: uniqueIds }, push_tokens: { $exists: true, $ne: [] } })
      .select('push_tokens')
      .lean();
    const tokens = [];
    for (const u of users) {
      if (Array.isArray(u.push_tokens)) {
        tokens.push(...u.push_tokens);
      }
    }
    return [...new Set(tokens.filter(Boolean))];
  },
};

export default userRepository;
