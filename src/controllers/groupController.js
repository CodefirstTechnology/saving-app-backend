import groupService from '../services/groupService.js';

export async function list(req, res, next) {
  try {
    const data = await groupService.list();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const data = await groupService.create(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listMine(req, res, next) {
  try {
    const data = await groupService.listMine(req.user);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function assignAdmin(req, res, next) {
  try {
    const data = await groupService.assignGroupAdmin(req.user, req.params.groupId, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
