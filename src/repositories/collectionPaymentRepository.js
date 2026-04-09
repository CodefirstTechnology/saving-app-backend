import { Op } from 'sequelize';
import { CollectionPayment, Member } from '../models/index.js';

const collectionPaymentRepository = {
  async findById(id, groupId, options = {}) {
    return CollectionPayment.findOne({
      where: { id, group_id: groupId },
      include: [{ model: Member, as: 'member', attributes: ['id', 'name_marathi', 'name_english', 'phone'] }],
      ...options,
    });
  },

  async create(data, options = {}) {
    return CollectionPayment.create(data, options);
  },

  async listByGroup(groupId, { status, memberId, limit = 100, offset = 0 } = {}, options = {}) {
    const where = { group_id: groupId };
    if (status) where.status = status;
    if (memberId) where.member_id = memberId;
    return CollectionPayment.findAll({
      where,
      include: [{ model: Member, as: 'member', attributes: ['id', 'name_marathi', 'name_english', 'phone'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      ...options,
    });
  },

  async sumCollected(groupId, options = {}) {
    const total = await CollectionPayment.sum('amount', {
      where: { group_id: groupId, status: 'collected' },
      ...options,
    });
    return total != null ? Number(total) : 0;
  },

  async sumCollectedBetween(groupId, startInclusive, endInclusive, options = {}) {
    const where = {
      group_id: groupId,
      status: 'collected',
      collected_at: {},
    };
    if (startInclusive) where.collected_at[Op.gte] = startInclusive;
    if (endInclusive) where.collected_at[Op.lte] = endInclusive;
    if (!Object.keys(where.collected_at).length) delete where.collected_at;
    const total = await CollectionPayment.sum('amount', { where, ...options });
    return total != null ? Number(total) : 0;
  },
};

export default collectionPaymentRepository;
