import { AppError } from './errorHandler.js';
import { isSuperAdmin, ROLES } from '../constants/roles.js';
import groupService from '../services/groupService.js';
import groupRepository from '../repositories/groupRepository.js';
import { sameId } from '../utils/idCompare.js';

function runAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Sets `req.groupScopeId` for list/mutation routes.
 * - super_admin: must pass `groupId` in query or `params.groupId` or header
 * - admin: must pass `groupId`; or fallback to assigned/created group
 * - user: locked to `req.user.groupId`; rejects mismatched `groupId` in query
 */
export const groupScopeMiddleware = runAsync(async (req, res, next) => {
  const fromParam = req.params.groupId;
  const fromQuery = req.query.groupId;
  const fromHeader = req.headers['x-group-id'];
  const raw = fromParam || fromQuery || fromHeader;
  let explicit = raw != null && String(raw).trim() !== '' ? String(raw).trim() : null;

  if (isSuperAdmin(req.user)) {
    if (!explicit) throw new AppError(400, 'groupId is required (header, query or route param)');
    req.groupScopeId = explicit;
    return next();
  }

  if (req.user.role === ROLES.ADMIN) {
    if (!explicit) {
      if (req.user.groupId) {
        explicit = req.user.groupId;
      } else {
        const created = await groupRepository.listByCreator(req.user.id);
        if (created.length > 0) {
          explicit = created[0].id;
        }
      }
    }

    if (!explicit) throw new AppError(400, 'Please select or create a Bachat Gat first');
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
 * Like groupScopeMiddleware but allows super_admin and admin with no groups yet (`req.groupScopeId` may be null).
 */
export const groupScopeOptionalForSuperAdmin = runAsync(async (req, res, next) => {
  const fromParam = req.params.groupId;
  const fromQuery = req.query.groupId;
  const fromHeader = req.headers['x-group-id'];
  const raw = fromParam || fromQuery || fromHeader;
  let explicit = raw != null && String(raw).trim() !== '' ? String(raw).trim() : null;

  if (isSuperAdmin(req.user)) {
    req.groupScopeId = explicit || null;
    return next();
  }

  if (req.user.role === ROLES.ADMIN) {
    if (!explicit) {
      if (req.user.groupId) {
        explicit = req.user.groupId;
      } else {
        const created = await groupRepository.listByCreator(req.user.id);
        if (created.length > 0) {
          explicit = created[0].id;
        }
      }
    }

    if (!explicit) {
      req.groupScopeId = null;
      return next();
    }

    const ok = await groupService.adminHasGroupAccess(req.user.id, explicit);
    if (!ok) throw new AppError(403, 'Cannot access this group');
    req.groupScopeId = explicit;
    return next();
  }

  if (!req.user.groupId) {
    req.groupScopeId = null;
    return next();
  }

  if (explicit && !sameId(explicit, req.user.groupId)) {
    throw new AppError(403, 'Cannot access another group');
  }
  req.groupScopeId = req.user.groupId;
  next();
});
