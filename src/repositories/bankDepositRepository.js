import { BankDeposit } from '../models/index.js';
import { createWithOptionalSession } from '../utils/mongooseCreate.js';

const bankDepositRepository = {
  async create(data, options = {}) {
    return createWithOptionalSession(BankDeposit, data, options);
  },

  async listByGroup(groupId, { limit = 100, offset = 0 } = {}, options = {}) {
    let q = BankDeposit.find({ group_id: groupId }).sort({ created_at: -1 }).limit(limit).skip(offset);
    if (options.session) q = q.session(options.session);
    return q;
  },

  async sumDeposited(groupId, options = {}) {
    const pipeline = [{ $match: { group_id: groupId } }, { $group: { _id: null, total: { $sum: '$amount' } } }];
    let agg = BankDeposit.aggregate(pipeline);
    if (options.session) agg = agg.session(options.session);
    const r = await agg;
    return r[0]?.total != null ? Number(r[0].total) : 0;
  },

  async findLatest(groupId, options = {}) {
    let q = BankDeposit.findOne({ group_id: groupId }).sort({ created_at: -1 });
    if (options.session) q = q.session(options.session);
    return q;
  },
};

export default bankDepositRepository;
