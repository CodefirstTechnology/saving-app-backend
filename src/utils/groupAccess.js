import { AppError } from '../middlewares/errorHandler.js';
import { isSuperAdmin } from '../constants/roles.js';

/**
 * Resolve the group context for DB queries.
 * @param {object} user - req.user
 * @param {string|null|undefined} explicitGroupId - from query/body/params (super_admin only)
 */
export function resolveGroupId(user, explicitGroupId) {
  if (isSuperAdmin(user)) {
    if (!explicitGroupId) {
      throw new AppError(400, 'groupId is required for this operation');
    }
    return explicitGroupId;
  }
  if (!user.groupId) {
    throw new AppError(403, 'No group assigned to this account');
  }
  if (explicitGroupId && explicitGroupId !== user.groupId) {
    throw new AppError(403, 'Access denied: another group');
  }
  return user.groupId;
}

/**
 * For dashboards: super_admin may omit groupId to receive a multi-group summary.
 */
export function resolveOptionalGroupId(user, explicitGroupId) {
  if (isSuperAdmin(user)) {
    return explicitGroupId || null;
  }
  return resolveGroupId(user, explicitGroupId);
}
