import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Member } from '../models/index.js';

const memberRepository = {
  async findById(id, groupId) {
    const where = { id };
    if (groupId) where.group_id = groupId;
    return Member.findOne({ where });
  },
  async create(data, options = {}) {
    return Member.create(data, options);
  },
  async update(id, groupId, data, options = {}) {
    const m = await this.findById(id, groupId);
    if (!m) return null;
    await m.update(data, options);
    return m;
  },
  async delete(id, groupId) {
    const m = await this.findById(id, groupId);
    if (!m) return false;
    await m.destroy();
    return true;
  },
  async listByGroup(groupId, { offset, limit, search, isActive }) {
    const where = { group_id: groupId };
    if (typeof isActive === 'boolean') where.is_active = isActive;
    if (search) {
      const term = `%${search}%`;
      where[Op.or] = [
        { name_marathi: { [Op.like]: term } },
        { name_english: { [Op.like]: term } },
        { phone: { [Op.like]: term } },
      ];
    }
    const { rows, count } = await Member.findAndCountAll({
      where,
      offset,
      limit,
      order: [['name_english', 'ASC']],
    });
    return { rows, count };
  },
  async sumBalance(groupId) {
    const r = await Member.findOne({
      attributes: [[sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('savings_balance')), 0), 'total']],
      where: { group_id: groupId },
      raw: true,
    });
    return r?.total ?? 0;
  },
  async countByGroup(groupId, { activeOnly } = {}) {
    const where = { group_id: groupId };
    if (activeOnly) where.is_active = true;
    return Member.count({ where });
  },
  async countActiveExcluding(groupId, excludeMemberId) {
    const where = { group_id: groupId, is_active: true };
    if (excludeMemberId) where.id = { [Op.ne]: excludeMemberId };
    return Member.count({ where });
  },
  /** Active members in group (for loan voting pending lists). */
  async listActiveMembersInGroup(groupId) {
    return Member.findAll({
      where: { group_id: groupId, is_active: true },
      attributes: ['id', 'name_marathi', 'name_english'],
      order: [['name_english', 'ASC']],
      raw: true,
    });
  },
  /** User ids linked to active members in the group (for in-app notifications). */
  async listActiveUserIdsInGroup(groupId) {
    const rows = await Member.findAll({
      where: { group_id: groupId, is_active: true },
      attributes: ['user_id'],
      raw: true,
    });
    const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    return ids;
  },
};

export default memberRepository;
