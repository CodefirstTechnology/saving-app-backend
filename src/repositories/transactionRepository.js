import { Transaction, Member } from '../models/index.js';
import { createWithOptionalSession } from '../utils/mongooseCreate.js';

async function attachMembersToTransactions(rows) {
  const memberIds = [...new Set(rows.map((r) => r.member_id).filter(Boolean))];
  if (!memberIds.length) return rows;
  const members = await Member.find({ _id: { $in: memberIds } })
    .select('name_marathi name_english phone')
    .lean({ virtuals: true });
  const map = new Map(members.map((m) => [m._id, m]));
  for (const r of rows) {
    if (r.member_id) r.member = map.get(r.member_id) || null;
  }
  return rows;
}

const transactionRepository = {
  async findById(id, groupId) {
    const row = await Transaction.findOne({ _id: id, group_id: groupId }).lean({ virtuals: true });
    if (!row) return null;
    const [withMember] = await attachMembersToTransactions([row]);
    return withMember;
  },
  async create(data, options = {}) {
    return createWithOptionalSession(Transaction, data, options);
  },
  async listByGroup(groupId, { offset, limit, memberId, category, categories, entryType, entryTypes, dateFrom, dateTo }) {
    const where = { group_id: groupId };
    if (memberId) where.member_id = memberId;
    if (categories?.length) where.category = { $in: categories };
    else if (category) where.category = category;
    if (entryTypes?.length) where.entry_type = { $in: entryTypes };
    else if (entryType) where.entry_type = entryType;
    if (dateFrom || dateTo) {
      where.occurred_at = {};
      if (dateFrom) where.occurred_at.$gte = dateFrom;
      if (dateTo) where.occurred_at.$lte = dateTo;
    }
    const [rows, count] = await Promise.all([
      Transaction.find(where)
        .sort({ occurred_at: -1, created_at: -1 })
        .skip(offset)
        .limit(limit)
        .lean({ virtuals: true }),
      Transaction.countDocuments(where),
    ]);
    await attachMembersToTransactions(rows);
    return { rows, count };
  },
  async sumAmountWhere(groupId, { category, entryType } = {}) {
    const where = { group_id: groupId };
    if (category) where.category = category;
    if (entryType) where.entry_type = entryType;
    const r = await Transaction.aggregate([
      { $match: where },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return r[0]?.total != null ? Number(r[0].total) : 0;
  },

  async aggregateByCategory(groupId, { dateFrom, dateTo }) {
    const where = { group_id: groupId };
    if (dateFrom || dateTo) {
      where.occurred_at = {};
      if (dateFrom) where.occurred_at.$gte = dateFrom;
      if (dateTo) where.occurred_at.$lte = dateTo;
    }
    const rows = await Transaction.aggregate([
      { $match: where },
      {
        $group: {
          _id: { category: '$category', entry_type: '$entry_type' },
          total: { $sum: '$amount' },
        },
      },
    ]);
    return rows.map((r) => ({
      category: r._id.category,
      entry_type: r._id.entry_type,
      total: r.total,
    }));
  },
};

export default transactionRepository;
