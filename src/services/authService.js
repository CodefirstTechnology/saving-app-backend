import { randomUUID } from 'crypto';
import { withMongoTransaction } from '../config/database.js';
import userRepository from '../repositories/userRepository.js';
import groupRepository from '../repositories/groupRepository.js';
import refreshTokenRepository from '../repositories/refreshTokenRepository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { generateOpaqueToken, hashOpaqueToken } from '../utils/tokenHash.js';
import { durationToMs } from '../utils/durationMs.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { AppError } from '../middlewares/errorHandler.js';
import { ROLES, normalizeRoleString } from '../constants/roles.js';
import { normalizeMobile, isValidMobileDigits } from '../utils/mobile.js';

function serializeUserPublic(user) {
  const permId = user.user_id || user.member_id || user.id;
  return {
    id: user.id,
    userId: permId,
    user_id: permId,
    name: user.full_name,
    mobile_number: user.mobile_number,
    role: normalizeRoleString(user.role),
    accountStatus: user.account_status || 'ACTIVE',
    groupId: user.group_id,
    memberId: permId,
    member_id: permId,
  };
}

async function buildTokenResponse(user, device_id) {
  const token = signAccessToken({
    sub: user.id,
    role: user.role,
    groupId: user.group_id,
    memberId: user.member_id,
  });
  const payload = {
    token,
    user: serializeUserPublic(user),
  };
  try {
    const rawRefresh = generateOpaqueToken(48);
    const token_hash = hashOpaqueToken(rawRefresh);
    const expires_at = new Date(Date.now() + durationToMs(env.jwtRefreshExpiresIn));
    await refreshTokenRepository.create({
      id: randomUUID(),
      user_id: user.id,
      token_hash,
      device_id: device_id || null,
      expires_at,
    });
    payload.refreshToken = rawRefresh;
  } catch (e) {
    logger.warn(
      'refresh_tokens insert failed — login still returns access JWT. Check MongoDB connection and indexes.',
      e.message
    );
  }
  return payload;
}

const authService = {
  /** First install: one `super_admin`. Optional `group` seeds an empty Bachat Gat. */
  async registerBootstrap({ mobile_number, password, name, group }, { device_id } = {}) {
    const m = normalizeMobile(mobile_number);
    if (!isValidMobileDigits(m)) throw new AppError(400, 'Invalid mobile number');
    const count = await userRepository.count();
    if (count > 0) {
      throw new AppError(403, 'Registration closed. Use an administrator to create users.');
    }
    if (await userRepository.hasAnyUserWithMobile(m)) throw new AppError(409, 'Mobile number already registered');

    let user;
    try {
      await withMongoTransaction(async (session) => {
        if (group) {
          await groupRepository.create(
            {
              name_marathi: group.nameMarathi,
              name_english: group.nameEnglish,
            },
            { session }
          );
        }
        user = await userRepository.create(
          {
            email: null,
            mobile_number: m,
            password_hash: await hashPassword(password),
            full_name: name,
            role: ROLES.SUPER_ADMIN,
            group_id: null,
            member_id: null,
          },
          { session }
        );
      });
    } catch (e) {
      throw e;
    }
    return buildTokenResponse(user, device_id);
  },

  /**
   * Self-service group admin registration — user only; first Bachat Gat from app (Create group).
   */
  async registerAdmin(
    {
      first_name,
      last_name,
      email,
      phone,
      city,
      state,
      town,
      pincode,
      password,
      role,
    },
    _ctx = {}
  ) {
    const m = normalizeMobile(phone);
    if (!isValidMobileDigits(m)) {
      throw new AppError(
        400,
        'Enter a valid 10-digit Indian mobile number (it must start with 6, 7, 8, or 9).'
      );
    }

    const emailNorm = email.trim().toLowerCase();
    const existingEmail = await userRepository.findByEmail(emailNorm);
    if (existingEmail) {
      throw new AppError(409, 'हा ईमेल आयडी आधीच नोंदणीकृत आहे (This email address is already registered)');
    }
    if (await userRepository.hasAnyUserWithMobile(m)) {
      throw new AppError(409, 'हा मोबाईल नंबर आधीच नोंदणीकृत आहे (This mobile phone number is already registered)');
    }

    const full_name = `${first_name.trim()} ${last_name.trim()}`.trim();
    const pin = pincode.trim();
    const userRole = role === 'user' ? ROLES.USER : ROLES.ADMIN;

    try {
      await withMongoTransaction(async (session) => {
        await userRepository.create(
          {
            email: emailNorm,
            mobile_number: m,
            password_hash: await hashPassword(password),
            full_name,
            role: userRole,
            group_id: null,
            member_id: null,
            city: city.trim(),
            state: state.trim(),
            town: town.trim(),
            pincode: pin,
          },
          { session }
        );
      });
      return {
        message:
          'Registration successful. Sign in with your phone number and password.',
      };
    } catch (e) {
      if (e?.code === 11000 || e?.codeName === 'DuplicateKey') {
        throw new AppError(409, 'हा मोबाईल नंबर किंवा ईमेल आधीच नोंदणीकृत आहे (Mobile number or email already registered)');
      }
      throw e;
    }
  },

  /** SUPER_ADMIN creates a group admin (secretary / leader). */
  async createAdminBySuperAdmin(_actor, { name, mobile_number, password, group_id }) {
    const m = normalizeMobile(mobile_number);
    if (!isValidMobileDigits(m)) throw new AppError(400, 'Invalid mobile number');
    const existingInGroup = await userRepository.findByMobileNumberAndGroupId(m, group_id);
    if (existingInGroup) throw new AppError(409, 'User already exists in this group');
    const g = await groupRepository.findById(group_id);
    if (!g) throw new AppError(404, 'Group not found');

    const user = await userRepository.create({
      email: null,
      mobile_number: m,
      password_hash: await hashPassword(password),
      full_name: name,
      role: ROLES.ADMIN,
      group_id,
      member_id: null,
    });
    return { user: serializeUserPublic(user) };
  },

  async login({ mobile_number, password }, { device_id } = {}) {
    const m = normalizeMobile(mobile_number);
    if (!m) throw new AppError(401, 'Invalid credentials');
    const candidates = await userRepository.findAllByMobileNumber(m);
    if (!candidates.length) throw new AppError(401, 'Invalid credentials');
    let user = null;
    for (const u of candidates) {
      if (await verifyPassword(password, u.password_hash)) {
        user = u;
        break;
      }
    }
    if (!user) throw new AppError(401, 'Invalid credentials');
    if (user.account_status && user.account_status !== 'ACTIVE') {
      throw new AppError(403, 'Your account is currently suspended or disabled');
    }
    return buildTokenResponse(user, device_id);
  },

  async refresh({ refreshToken, device_id }) {
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new AppError(400, 'refreshToken required');
    }
    const token_hash = hashOpaqueToken(refreshToken);
    const row = await refreshTokenRepository.findValidByHash(token_hash);
    if (!row) throw new AppError(401, 'Invalid refresh token');
    if (device_id && row.device_id && row.device_id !== device_id) {
      throw new AppError(401, 'Device mismatch');
    }
    const user = await userRepository.findById(row.user_id);
    if (!user) throw new AppError(401, 'Invalid refresh token');
    await refreshTokenRepository.revokeByHash(token_hash);
    return buildTokenResponse(user, device_id || row.device_id);
  },

  async logout({ refreshToken }) {
    if (refreshToken && typeof refreshToken === 'string') {
      const token_hash = hashOpaqueToken(refreshToken);
      await refreshTokenRepository.revokeByHash(token_hash);
    }
    return { ok: true };
  },

  async logoutAll(userId) {
    await refreshTokenRepository.revokeAllForUser(userId);
    return { ok: true };
  },

  async googleLogin({ idToken, email, name, photo, device_id, role } = {}) {
    const userEmail = (email || 'user.google@gmail.com').trim().toLowerCase();
    let user = await userRepository.findByEmail(userEmail);
    const assignedRole = role === 'admin' ? ROLES.ADMIN : ROLES.USER;

    if (!user) {
      user = await userRepository.create({
        email: userEmail,
        mobile_number: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password_hash: await hashPassword(randomUUID()),
        full_name: name || 'Google User',
        role: assignedRole,
        account_status: 'ACTIVE',
        group_id: null,
        member_id: null,
      });
    } else {
      // If user exists, update their name or role if role was specified
      const updates = {};
      if (name && name !== user.full_name) {
        updates.full_name = name;
      }
      if (role && user.role !== assignedRole && user.role !== ROLES.SUPER_ADMIN) {
        updates.role = assignedRole;
      }
      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: user.id }, { $set: updates });
        user = await userRepository.findById(user.id);
      }
    }

    if (user.account_status && user.account_status !== 'ACTIVE') {
      throw new AppError(403, 'Your account is currently suspended or disabled');
    }

    return buildTokenResponse(user, device_id);
  },
};


export default authService;
