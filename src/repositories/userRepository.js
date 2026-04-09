import { Op } from 'sequelize';
import { User } from '../models/index.js';

const userRepository = {
  async findById(id) {
    return User.findByPk(id);
  },
  async findByEmail(email) {
    if (!email) return null;
    return User.findOne({ where: { email: email.toLowerCase() } });
  },
  /** First row with this mobile (legacy); prefer findAllByMobileNumber / findByMobileNumberAndGroupId. */
  async findByMobileNumber(mobileDigits) {
    if (!mobileDigits) return null;
    return User.findOne({ where: { mobile_number: mobileDigits } });
  },

  async findAllByMobileNumber(mobileDigits) {
    if (!mobileDigits) return [];
    return User.findAll({
      where: { mobile_number: mobileDigits },
      order: [['created_at', 'ASC']],
    });
  },

  async findByMobileNumberAndGroupId(mobileDigits, groupId) {
    if (!mobileDigits || groupId == null || groupId === '') return null;
    return User.findOne({ where: { mobile_number: mobileDigits, group_id: groupId } });
  },

  async hasAnyUserWithMobile(mobileDigits) {
    if (!mobileDigits) return false;
    const n = await User.count({ where: { mobile_number: mobileDigits } });
    return n > 0;
  },
  async findByMemberId(memberId) {
    if (!memberId) return null;
    return User.findOne({ where: { member_id: memberId } });
  },
  async create(data, options = {}) {
    return User.create(data, options);
  },
  async updateGroupId(id, group_id) {
    const [n] = await User.update({ group_id }, { where: { id } });
    return n > 0;
  },
  async count() {
    return User.count();
  },
  /** Every user account tied to this group (members + leaders) — for transparency broadcasts. */
  async listAllUserIdsInGroup(groupId) {
    if (!groupId) return [];
    const rows = await User.findAll({
      where: { group_id: groupId },
      attributes: ['id'],
      raw: true,
    });
    return [...new Set(rows.map((r) => r.id))];
  },

  /** Group admins (and super_admin scoped to group) for leader notifications. */
  async listStaffUserIdsForGroup(groupId) {
    if (!groupId) return [];
    const rows = await User.findAll({
      where: {
        group_id: groupId,
        role: { [Op.in]: ['admin'] },
      },
      attributes: ['id'],
      raw: true,
    });
    return rows.map((r) => r.id);
  },
};

export default userRepository;
