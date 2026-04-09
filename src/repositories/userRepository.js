import { User } from '../models/index.js';

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
  async create(data, options = {}) {
    const opts = options.session ? { session: options.session } : {};
    return User.create(data, opts);
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
};

export default userRepository;
