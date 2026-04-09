import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Transaction, Member } from '../models/index.js';

const transactionRepository = {
  async findById(id, groupId) {
    return Transaction.findOne({ where: { id, group_id: groupId }, include: [{ model: Member, as: 'member' }] });
  },
  async create(data, options = {}) {
    return Transaction.create(data, options);
  },
  async listByGroup(groupId, { offset, limit, memberId, category, categories, entryType, entryTypes, dateFrom, dateTo }) {
    const where = { group_id: groupId };
    if (memberId) where.member_id = memberId;
    if (categories?.length) where.category = { [Op.in]: categories };
    else if (category) where.category = category;
    if (entryTypes?.length) where.entry_type = { [Op.in]: entryTypes };
    else if (entryType) where.entry_type = entryType;
    if (dateFrom || dateTo) {
      where.occurred_at = {};
      if (dateFrom) where.occurred_at[Op.gte] = dateFrom;
      if (dateTo) where.occurred_at[Op.lte] = dateTo;
    }
    const { rows, count } = await Transaction.findAndCountAll({
      where,
      include: [{ model: Member, as: 'member', attributes: ['id', 'name_marathi', 'name_english', 'phone'] }],
      offset,
      limit,
      order: [['occurred_at', 'DESC'], ['created_at', 'DESC']],
    });
    return { rows, count };
  },
  async sumAmountWhere(groupId, { category, entryType } = {}) {
    const where = { group_id: groupId };
    if (category) where.category = category;
    if (entryType) where.entry_type = entryType;
    const total = await Transaction.sum('amount', { where });
    return total != null ? Number(total) : 0;
  },

  async aggregateByCategory(groupId, { dateFrom, dateTo }) {
    const where = { group_id: groupId };
    if (dateFrom || dateTo) {
      where.occurred_at = {};
      if (dateFrom) where.occurred_at[Op.gte] = dateFrom;
      if (dateTo) where.occurred_at[Op.lte] = dateTo;
    }
    return Transaction.findAll({
      attributes: [
        'category',
        'entry_type',
        [sequelize.fn('SUM', sequelize.cast(sequelize.col('amount'), 'DECIMAL')), 'total'],
      ],
      where,
      group: ['category', 'entry_type'],
      raw: true,
    });
  },
};

export default transactionRepository;
