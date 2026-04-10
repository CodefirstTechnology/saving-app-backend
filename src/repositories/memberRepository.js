import { Member } from '../models/index.js';
import { createWithOptionalSession } from '../utils/mongooseCreate.js';

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const memberRepository = {
  async findById(id, groupId) {
    const q = { _id: id };
    if (groupId) q.group_id = groupId;
    return Member.findOne(q);
  },
  async create(data, options = {}) {
    return createWithOptionalSession(Member, data, options);
  },
  async update(id, groupId, data, options = {}) {
    const m = await this.findById(id, groupId);
    if (!m) return null;
    Object.assign(m, data);
    const saveOpts = options.session ? { session: options.session } : {};
    await m.save(saveOpts);
    return m;
  },
  async delete(id, groupId, options = {}) {
    const m = await this.findById(id, groupId);
    if (!m) return false;
    const delOpts = options.session ? { session: options.session } : {};
    await m.deleteOne(delOpts);
    return true;
  },
  async listByGroup(groupId, { offset, limit, search, isActive }) {
    const where = { group_id: groupId };
    if (typeof isActive === 'boolean') where.is_active = isActive;
    if (search) {
      const term = escapeRegex(search);
      const re = new RegExp(term, 'i');
      where.$or = [{ name_marathi: re }, { name_english: re }, { phone: re }];
    }
    const [rows, count] = await Promise.all([
      Member.find(where).sort({ name_english: 1 }).skip(offset).limit(limit),
      Member.countDocuments(where),
    ]);
    return { rows, count };
  },
  async sumBalance(groupId) {
    const r = await Member.aggregate([
      { $match: { group_id: groupId } },
      { $group: { _id: null, total: { $sum: '$savings_balance' } } },
    ]);
    return r[0]?.total ?? 0;
  },
  async countByGroup(groupId, { activeOnly } = {}) {
    const where = { group_id: groupId };
    if (activeOnly) where.is_active = true;
    return Member.countDocuments(where);
  },
  async countActiveExcluding(groupId, excludeMemberId) {
    const where = { group_id: groupId, is_active: true };
    if (excludeMemberId) where._id = { $ne: excludeMemberId };
    return Member.countDocuments(where);
  },
  async listActiveMembersInGroup(groupId) {
    return Member.find({ group_id: groupId, is_active: true })
      .select('name_marathi name_english')
      .sort({ name_english: 1 })
      .lean({ virtuals: true });
  },
  async listActiveUserIdsInGroup(groupId) {
    const rows = await Member.find({ group_id: groupId, is_active: true }).select('user_id').lean();
    const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    return ids;
  },
};

export default memberRepository;
