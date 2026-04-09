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
