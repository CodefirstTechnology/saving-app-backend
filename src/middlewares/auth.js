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

    if (user.account_status && user.account_status !== 'ACTIVE') {
      throw new AppError(403, 'Your account is currently suspended or disabled');
    }

    const uid = normalizeEntityId(user.id) || user.id;
    req.user = {
      id: uid,
      userId: user.user_id || uid,
      firebaseUid: user.firebase_uid || null,
      role: normalizeRoleString(user.role),
      accountStatus: user.account_status || 'ACTIVE',
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
