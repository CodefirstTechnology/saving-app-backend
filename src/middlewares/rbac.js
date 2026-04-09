import { AppError } from './errorHandler.js';

/**
 * Role guard (roleMiddleware pattern): require one of the given roles (OR).
 * @example router.post('/x', authenticate, authorizeRoles('super_admin', 'admin'), handler)
 */
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Access denied'));
    }
    next();
  };
}

/** @deprecated use authorizeRoles */
export const requireRole = authorizeRoles;
