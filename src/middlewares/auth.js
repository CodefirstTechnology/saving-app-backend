import { verifyToken } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';
import userRepository from '../repositories/userRepository.js';
import { normalizeRoleString } from '../constants/roles.js';
import { normalizeEntityId } from '../utils/idCompare.js';

/** JWT verification; sets `req.user` (alias: authMiddleware). */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required');
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);
    const user = await userRepository.findById(decoded.sub);
    if (!user) throw new AppError(401, 'Invalid token');
    const uid = normalizeEntityId(user.id) || user.id;
    req.user = {
      id: uid,
      role: normalizeRoleString(user.role),
      groupId: user.group_id,
      memberId: user.member_id,
      name: user.full_name,
      mobile_number: user.mobile_number,
    };
    next();
  } catch (e) {
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      return next(new AppError(401, 'Invalid or expired token'));
    }
    next(e);
  }
}

export const authMiddleware = authenticate;
