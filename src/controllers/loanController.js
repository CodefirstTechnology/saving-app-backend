import loanService from '../services/loanService.js';

export async function list(req, res, next) {
  try {
    const data = await loanService.list(req.user, req.query, req.groupScopeId);
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
}

export async function request(req, res, next) {
  try {
    const data = await loanService.request(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function approve(req, res, next) {
  try {
    const data = await loanService.approve(req.user, req.params.id, req.body, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function reject(req, res, next) {
  try {
    const data = await loanService.reject(req.user, req.params.id, req.groupScopeId, req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function eligibility(req, res, next) {
  try {
    const data = await loanService.eligibility(req.user);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function vote(req, res, next) {
  try {
    const data = await loanService.vote(req.user, req.params.id, req.body, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function issue(req, res, next) {
  try {
    const data = await loanService.issue(req.user, req.body, req.groupScopeId);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function repay(req, res, next) {
  try {
    const data = await loanService.repay(req.user, req.body, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function setStatus(req, res, next) {
  try {
    const data = await loanService.setStatus(req.user, req.params.id, req.body.status, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
