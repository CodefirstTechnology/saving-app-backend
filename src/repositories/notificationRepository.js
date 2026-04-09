import { Notification } from '../models/index.js';

const notificationRepository = {
  async create(data, options = {}) {
    return Notification.create(data, options);
  },
  async listForUser(userId, { limit = 50, unreadOnly = false } = {}) {
    const where = { user_id: userId };
    if (unreadOnly) where.read_at = null;
    return Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
    });
  },
  async markRead(id, userId) {
    const n = await Notification.findOne({ where: { id, user_id: userId } });
    if (!n) return null;
    if (!n.read_at) await n.update({ read_at: new Date() });
    return n;
  },

  async markUnread(id, userId) {
    const n = await Notification.findOne({ where: { id, user_id: userId } });
    if (!n) return null;
    await n.update({ read_at: null });
    return n;
  },
  async countUnread(userId) {
    return Notification.count({ where: { user_id: userId, read_at: null } });
  },

  async markAllReadForUser(userId) {
    const [affected] = await Notification.update(
      { read_at: new Date() },
      { where: { user_id: userId, read_at: null } }
    );
    return affected;
  },
};

export default notificationRepository;
