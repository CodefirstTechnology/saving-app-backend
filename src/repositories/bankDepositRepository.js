import { BankDeposit } from '../models/index.js';

const bankDepositRepository = {
  async create(data, options = {}) {
    return BankDeposit.create(data, options);
  },

  async listByGroup(groupId, { limit = 100, offset = 0 } = {}, options = {}) {
    return BankDeposit.findAll({
      where: { group_id: groupId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      ...options,
    });
  },

  async sumDeposited(groupId, options = {}) {
    const total = await BankDeposit.sum('amount', { where: { group_id: groupId }, ...options });
    return total != null ? Number(total) : 0;
  },

  async findLatest(groupId, options = {}) {
    return BankDeposit.findOne({
      where: { group_id: groupId },
      order: [['created_at', 'DESC']],
      ...options,
    });
  },
};

export default bankDepositRepository;
