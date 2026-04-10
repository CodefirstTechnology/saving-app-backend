import { Group } from '../models/index.js';
import { createWithOptionalSession } from '../utils/mongooseCreate.js';
import { normalizeEntityId } from '../utils/idCompare.js';

const groupRepository = {
  async findById(id) {
    if (id == null || id === '') return null;
    const canon = normalizeEntityId(id);
    return Group.findById(canon || id);
  },
  async create(data, options = {}) {
    return createWithOptionalSession(Group, data, options);
  },
  async list() {
    return Group.find().sort({ created_at: 1 });
  },
  async countByCreator(creatorUserId) {
    return Group.countDocuments({ creator_user_id: creatorUserId });
  },
  async listByCreator(creatorUserId) {
    return Group.find({ creator_user_id: creatorUserId }).sort({ created_at: 1 });
  },
  async setCreator(groupId, creatorUserId, options = {}) {
    const opts = options.session ? { session: options.session } : {};
    const r = await Group.updateOne({ _id: groupId }, { creator_user_id: creatorUserId }, opts);
    return r.matchedCount > 0;
  },
};

export default groupRepository;
