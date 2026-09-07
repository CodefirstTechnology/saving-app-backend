import notificationRepository from '../repositories/notificationRepository.js';
import memberRepository from '../repositories/memberRepository.js';
import userRepository from '../repositories/userRepository.js';

async function dispatchPushNotifications(userIds, { title, body, payload }) {
  try {
    const tokens = await userRepository.getPushTokensByUserIds(userIds);
    if (!tokens || tokens.length === 0) return;

    // Filter valid Expo Push Tokens if any
    const expoTokens = tokens.filter((t) => typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')));
    if (expoTokens.length > 0) {
      const messages = expoTokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: payload || {},
      }));

      // Non-blocking fetch to Expo Push Service
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      }).catch((err) => {
        console.warn('[Push Notification] Expo Push send error:', err?.message || err);
      });
    }
  } catch (err) {
    console.warn('[Push Notification] Error dispatching push:', err?.message || err);
  }
}

async function createMany(userIds, { category, title, body, payload }) {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const user_id of unique) {
    await notificationRepository.create({ user_id, category, title, body, payload: payload || null });
  }
  if (unique.length > 0) {
    await dispatchPushNotifications(unique, { title, body, payload });
  }
}

const notificationService = {
  async registerPushToken(userId, token) {
    if (!userId || !token) return;
    await userRepository.addPushToken(userId, token);
  },

  async notifyGroupMembers(groupId, { category, title, body, payload, excludeUserIds = [] } = {}) {
    const memberUserIds = await memberRepository.listActiveUserIdsInGroup(groupId);
    const exclude = new Set(excludeUserIds.filter(Boolean));
    const targets = memberUserIds.filter((id) => !exclude.has(id));
    await createMany(targets, { category, title, body, payload });
  },

  async notifyGroupLeaders(groupId, { category, title, body, payload } = {}) {
    const ids = await userRepository.listStaffUserIdsForGroup(groupId);
    await createMany(ids, { category, title, body, payload });
  },

  async notifyAllUsersInGroup(groupId, { category, title, body, payload, excludeUserIds = [] } = {}) {
    const [userIds, memberUserIds] = await Promise.all([
      userRepository.listAllUserIdsInGroup(groupId),
      memberRepository.listActiveUserIdsInGroup(groupId),
    ]);
    const allIds = [...new Set([...userIds, ...memberUserIds])];
    const exclude = new Set(excludeUserIds.filter(Boolean));
    const targets = allIds.filter((id) => !exclude.has(id));
    await createMany(targets, { category, title, body, payload });
  },

  async notifyUser(userId, { category, title, body, payload } = {}) {
    if (!userId) return;
    await notificationRepository.create({ user_id: userId, category, title, body, payload: payload || null });
    await dispatchPushNotifications([userId], { title, body, payload });
  },

  async listForUser(userId, query) {
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const unreadOnly = query.unreadOnly === 'true' || query.unreadOnly === true;
    const rows = await notificationRepository.listForUser(userId, { limit, unreadOnly });
    return rows.map(serializeNotification);
  },

  async markRead(userId, id) {
    const n = await notificationRepository.markRead(id, userId);
    if (!n) return null;
    return serializeNotification(n);
  },

  async markUnread(userId, id) {
    const n = await notificationRepository.markUnread(id, userId);
    if (!n) return null;
    return serializeNotification(n);
  },

  async unreadCount(userId) {
    return notificationRepository.countUnread(userId);
  },

  async markAllRead(userId) {
    const updated = await notificationRepository.markAllReadForUser(userId);
    return { updated };
  },
};

function serializeNotification(n) {
  return {
    id: n.id,
    category: n.category,
    title: n.title,
    body: n.body,
    description: n.body,
    payload: n.payload,
    readAt: n.read_at,
    isRead: Boolean(n.read_at),
    status: n.read_at ? 'read' : 'unread',
    createdAt: n.created_at,
  };
}

export default notificationService;
