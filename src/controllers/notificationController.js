import notificationService from '../services/notificationService.js';

export async function list(req, res, next) {
  try {
    const data = await notificationService.listForUser(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function markRead(req, res, next) {
  try {
    const data = await notificationService.markRead(req.user.id, req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function markUnread(req, res, next) {
  try {
    const data = await notificationService.markUnread(req.user.id, req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function unreadCount(req, res, next) {
  try {
    const count = await notificationService.unreadCount(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (e) {
    next(e);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const data = await notificationService.markAllRead(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function registerToken(req, res, next) {
  try {
    const { token } = req.body;
    if (token && req.user?.id) {
      await notificationService.registerPushToken(req.user.id, token);
    }
    res.json({ success: true, message: 'Push notification token registered', token });
  } catch (e) {
    next(e);
  }
}

