import { Notification } from '../models/index.js';
import { createWithOptionalSession } from '../utils/mongooseCreate.js';

const notificationRepository = {
  async create(data, options = {}) {
    return createWithOptionalSession(Notification, data, options);
  },
  async listForUser(userId, { limit = 50, unreadOnly = false } = {}) {
    const where = { user_id: userId };
    if (unreadOnly) where.read_at = null;
    return Notification.find(where).sort({ created_at: -1 }).limit(limit);
  },
  async markRead(id, userId) {
    const n = await Notification.findOne({ _id: id, user_id: userId });
    if (!n) return null;
    if (!n.read_at) {
      n.read_at = new Date();
      await n.save();
    }
    return n;
  },

  async markUnread(id, userId) {
    const n = await Notification.findOne({ _id: id, user_id: userId });
    if (!n) return null;
    n.read_at = null;
    await n.save();
    return n;
  },
  async countUnread(userId) {
    return Notification.countDocuments({ user_id: userId, read_at: null });
  },

  async markAllReadForUser(userId, options = {}) {
    const opts = options.session ? { session: options.session } : {};
    const r = await Notification.updateMany(
      { user_id: userId, read_at: null },
      { $set: { read_at: new Date() } },
      opts
    );
    return r.modifiedCount;
  },
};

export default notificationRepository;
