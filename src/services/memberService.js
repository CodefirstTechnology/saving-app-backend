import { withMongoTransaction } from '../config/database.js';
import { Loan } from '../models/index.js';
import memberRepository from '../repositories/memberRepository.js';
import userRepository from '../repositories/userRepository.js';
import groupRepository from '../repositories/groupRepository.js';
import { hashPassword } from '../utils/password.js';
import { AppError } from '../middlewares/errorHandler.js';
import { ROLES, canManageGroup } from '../constants/roles.js';
import { normalizeMobile, isValidMobileDigits } from '../utils/mobile.js';
import groupService from './groupService.js';

function ensureManager(user) {
  if (!canManageGroup(user)) throw new AppError(403, 'Access denied');
}

const memberService = {
  async list(user, query, groupId) {
    if (!groupId) throw new AppError(400, 'groupId missing');
    if (user.role === ROLES.USER && user.memberId) {
      const m = await memberRepository.findById(user.memberId, groupId);
      const data = m ? [serializeMember(m)] : [];
      return { data, meta: { page: 1, pageSize: 1, total: data.length, totalPages: 1 } };
    }
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const search = query.search || undefined;
    let isActive;
    if (query.isActive === 'true') isActive = true;
    if (query.isActive === 'false') isActive = false;
    const { rows, count } = await memberRepository.listByGroup(groupId, {
      offset,
      limit: pageSize,
      search,
      isActive,
    });
    return {
      data: rows.map(serializeMember),
      meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
    };
  },

  async getById(user, id, groupId) {
    if (!groupId) throw new AppError(400, 'groupId missing');
    const m = await memberRepository.findById(id, groupId);
    if (!m) throw new AppError(404, 'Member not found');
    if (user.role === ROLES.USER && user.memberId && m.id !== user.memberId) {
      throw new AppError(403, 'Access denied');
    }
    return serializeMember(m);
  },

  async create(user, body, groupId) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');

    let groupRow = null;
    if (user.role === ROLES.SUPER_ADMIN) {
      groupRow = await groupRepository.findById(groupId);
      if (!groupRow) throw new AppError(404, 'Group not found');
    } else if (user.role === ROLES.ADMIN) {
      if (!(await groupService.adminHasGroupAccess(user.id, groupId))) {
        throw new AppError(403, 'Cannot access this group');
      }
      groupRow = await groupRepository.findById(groupId);
      if (!groupRow) throw new AppError(404, 'Group not found');
    } else {
      throw new AppError(403, 'Access denied');
    }
    const maxMembers = Number(groupRow.max_members ?? groupRow.get?.('max_members'));
    const currentCount = await memberRepository.countByGroup(groupId);
    if (Number.isFinite(maxMembers) && maxMembers >= 2 && currentCount >= maxMembers) {
      throw new AppError(400, 'This group has reached its maximum member limit');
    }

    const wantsLogin = Boolean(body.mobile_number || body.password);
    if (wantsLogin) {
      if (!body.mobile_number || !body.password) {
        throw new AppError(400, 'mobile_number and password are both required for app login');
      }
    }

    const mDigits = wantsLogin ? normalizeMobile(body.mobile_number) : null;
    if (wantsLogin) {
      if (!isValidMobileDigits(mDigits)) throw new AppError(400, 'Invalid mobile number');
      const takenInGroup = await userRepository.findByMobileNumberAndGroupId(mDigits, groupId);
      if (takenInGroup) throw new AppError(409, 'User already exists in this group');
    }

    const displayPhone = body.phone?.trim() || (mDigits ? `+91${mDigits}` : null);

    let mem;
    let loginUser = null;
    try {
      await withMongoTransaction(async (session) => {
        mem = await memberRepository.create(
          {
            group_id: groupId,
            name_marathi: body.nameMarathi,
            name_english: body.nameEnglish,
            phone: displayPhone,
            savings_balance: body.savingsBalance ?? 0,
            is_active: body.isActive !== false,
          },
          { session }
        );

        if (wantsLogin) {
          loginUser = await userRepository.create(
            {
              email: null,
              mobile_number: mDigits,
              password_hash: await hashPassword(body.password),
              full_name: body.nameEnglish || body.nameMarathi,
              role: ROLES.USER,
              group_id: groupId,
              member_id: mem.id,
            },
            { session }
          );
          await memberRepository.update(mem.id, groupId, { user_id: loginUser.id }, { session });
        }
      });
      const out = serializeMember(await memberRepository.findById(mem.id, groupId));
      return { ...out, loginCreated: Boolean(loginUser) };
    } catch (e) {
      if (e?.code === 11000 || e?.codeName === 'DuplicateKey') {
        throw new AppError(409, 'User already exists in this group');
      }
      throw e;
    }
  },

  async update(user, id, body, groupId) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');
    const m = await memberRepository.update(id, groupId, {
      name_marathi: body.nameMarathi,
      name_english: body.nameEnglish,
      phone: body.phone,
      is_active: body.isActive,
    });
    if (!m) throw new AppError(404, 'Member not found');
    return serializeMember(m);
  },

  async delete(user, id, groupId) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');
    const ok = await memberRepository.delete(id, groupId);
    if (!ok) throw new AppError(404, 'Member not found');
    return { ok: true };
  },

  async summary(user, groupId) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');
    const [totalMembers, activeMembers, totalBalance] = await Promise.all([
      memberRepository.countByGroup(groupId),
      memberRepository.countByGroup(groupId, { activeOnly: true }),
      memberRepository.sumBalance(groupId),
    ]);
    const overdueLoans = await Loan.countDocuments({ group_id: groupId, status: 'overdue' });
    return {
      totalMembers,
      activeMembers,
      totalBalance: String(totalBalance),
      overdueCount: overdueLoans,
    };
  },
};

function serializeMember(m) {
  return {
    id: m.id,
    groupId: m.group_id,
    nameMarathi: m.name_marathi,
    nameEnglish: m.name_english,
    phone: m.phone,
    savingsBalance: String(m.savings_balance),
    isActive: m.is_active,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

export default memberService;
