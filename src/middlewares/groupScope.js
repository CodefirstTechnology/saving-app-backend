import { AppError } from './errorHandler.js';
import { isSuperAdmin, ROLES } from '../constants/roles.js';
import groupService from '../services/groupService.js';
import { sameId } from '../utils/idCompare.js';

function runAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Sets `req.groupScopeId` for list/mutation routes.
 * - super_admin: must pass `groupId` in query or `params.groupId`
 * - admin: must pass `groupId`; must be a group they created or their assigned `users.group_id`
 * - user: locked to `req.user.groupId`; rejects mismatched `groupId` in query
 */
export const groupScopeMiddleware = runAsync(async (req, res, next) => {
  const fromParam = req.params.groupId;
  const fromQuery = req.query.groupId;
  const raw = fromParam || fromQuery;
  const explicit = raw != null && String(raw).trim() !== '' ? String(raw).trim() : null;

  if (isSuperAdmin(req.user)) {
    if (!explicit) throw new AppError(400, 'groupId is required (query or route param)');
    req.groupScopeId = explicit;
    return next();
  }

  if (req.user.role === ROLES.ADMIN) {
    if (!explicit) throw new AppError(400, 'groupId is required');
    const ok = await groupService.adminHasGroupAccess(req.user.id, explicit);
    if (!ok) throw new AppError(403, 'Cannot access this group');
    req.groupScopeId = explicit;
    return next();
  }

  if (!req.user.groupId) throw new AppError(403, 'No group assigned');
  if (explicit && !sameId(explicit, req.user.groupId)) {
    throw new AppError(403, 'Cannot access another group');
  }
  req.groupScopeId = req.user.groupId;
  next();
});

/**
 * Like groupScopeMiddleware but allows super_admin with no groupId (`req.groupScopeId` may be null).
 */
export const groupScopeOptionalForSuperAdmin = runAsync(async (req, res, next) => {
  const raw = req.params.groupId || req.query.groupId;
  const explicit = raw != null && String(raw).trim() !== '' ? String(raw).trim() : null;

  if (isSuperAdmin(req.user)) {
    req.groupScopeId = explicit || null;
    return next();
  }

  if (req.user.role === ROLES.ADMIN) {
    if (!explicit) throw new AppError(400, 'groupId is required');
    const ok = await groupService.adminHasGroupAccess(req.user.id, explicit);
    if (!ok) throw new AppError(403, 'Cannot access this group');
    req.groupScopeId = explicit;
    return next();
  }

  if (!req.user.groupId) throw new AppError(403, 'No group assigned');
  if (explicit && !sameId(explicit, req.user.groupId)) {
    throw new AppError(403, 'Cannot access another group');
  }
  req.groupScopeId = req.user.groupId;
  next();
});
