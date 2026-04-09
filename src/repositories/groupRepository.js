import { Group } from '../models/index.js';
import { normalizeEntityId } from '../utils/idCompare.js';

const groupRepository = {
  async findById(id) {
    if (id == null || id === '') return null;
    const canon = normalizeEntityId(id);
    return Group.findByPk(canon || id);
  },
  async create(data, options = {}) {
    return Group.create(data, options);
  },
  async list() {
    return Group.findAll({ order: [['created_at', 'ASC']] });
  },
  async countByCreator(creatorUserId) {
    return Group.count({ where: { creator_user_id: creatorUserId } });
  },
  async listByCreator(creatorUserId) {
    return Group.findAll({
      where: { creator_user_id: creatorUserId },
      order: [['created_at', 'ASC']],
    });
  },
  async setCreator(groupId, creatorUserId, options = {}) {
    const [n] = await Group.update(
      { creator_user_id: creatorUserId },
      { where: { id: groupId }, ...options }
    );
    return n > 0;
  },
};

export default groupRepository;
