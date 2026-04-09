import memberService from '../services/memberService.js';

export async function list(req, res, next) {
  try {
    const data = await memberService.list(req.user, req.query, req.groupScopeId);
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
}

export async function summary(req, res, next) {
  try {
    const data = await memberService.summary(req.user, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getById(req, res, next) {
  try {
    const data = await memberService.getById(req.user, req.params.id, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const data = await memberService.create(req.user, req.body, req.groupScopeId);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const data = await memberService.update(req.user, req.params.id, req.body, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const data = await memberService.delete(req.user, req.params.id, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
