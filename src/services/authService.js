import { randomUUID } from 'crypto';
import { sequelize } from '../models/index.js';
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
  return {
    id: user.id,
    name: user.full_name,
    mobile_number: user.mobile_number,
    role: normalizeRoleString(user.role),
    groupId: user.group_id,
    memberId: user.member_id,
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
      'refresh_tokens insert failed — login still returns access JWT. Run: npx sequelize-cli db:migrate',
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

    const t = await sequelize.transaction();
    try {
      if (group) {
        await groupRepository.create(
          {
            name_marathi: group.nameMarathi,
            name_english: group.nameEnglish,
          },
          { transaction: t }
        );
      }
      const user = await userRepository.create(
        {
          email: null,
          mobile_number: m,
          password_hash: await hashPassword(password),
          full_name: name,
          role: ROLES.SUPER_ADMIN,
          group_id: null,
          member_id: null,
        },
        { transaction: t }
      );
      await t.commit();
      return buildTokenResponse(user, device_id);
    } catch (e) {
      await t.rollback();
      throw e;
    }
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
    if (existingEmail) throw new AppError(409, 'Email already registered');
    if (await userRepository.hasAnyUserWithMobile(m)) throw new AppError(409, 'Mobile number already registered');

    const full_name = `${first_name.trim()} ${last_name.trim()}`.trim();
    const pin = pincode.trim();

    const t = await sequelize.transaction();
    try {
      await userRepository.create(
        {
          email: emailNorm,
          mobile_number: m,
          password_hash: await hashPassword(password),
          full_name,
          role: ROLES.ADMIN,
          group_id: null,
          member_id: null,
          city: city.trim(),
          state: state.trim(),
          town: town.trim(),
          pincode: pin,
        },
        { transaction: t }
      );
      await t.commit();
      return {
        message:
          'Registration successful. Sign in with your phone number and password, then create your first Bachat Gat from the app menu.',
      };
    } catch (e) {
      await t.rollback();
      if (e?.name === 'SequelizeUniqueConstraintError') {
        throw new AppError(409, 'Email or mobile number already registered');
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
};

export default authService;
