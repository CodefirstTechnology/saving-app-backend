import groupRepository from '../repositories/groupRepository.js';
import userRepository from '../repositories/userRepository.js';
import authService from './authService.js';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../middlewares/errorHandler.js';
import { sameId, normalizeEntityId } from '../utils/idCompare.js';

/** Max Bachat Gats an `admin` may create (independent of super_admin). */
export const MAX_GROUPS_PER_ADMIN = 3;

function attr(row, key) {
  if (row?.get) return row.get(key);
  return row?.[key];
}

function serializeGroup(g) {
  if (!g) return null;
  const cycleDays = attr(g, 'contribution_cycle_days');
  return {
    id: attr(g, 'id'),
    nameMarathi: attr(g, 'name_marathi'),
    nameEnglish: attr(g, 'name_english'),
    loanInterestRateMonthlyPercent: String(attr(g, 'loan_interest_rate_monthly_percent') ?? ''),
    maxMembers: attr(g, 'max_members'),
    contributionCycleType: attr(g, 'contribution_cycle_type'),
    contributionCycleDays: cycleDays != null ? Number(cycleDays) : null,
    createdAt: attr(g, 'created_at'),
    updatedAt: attr(g, 'updated_at'),
  };
}

function serializeMyGroup(g, userId) {
  const creator = attr(g, 'creator_user_id');
  return {
    ...serializeGroup(g),
    isCreator: Boolean(creator != null && sameId(creator, userId)),
  };
}

const groupService = {
  async list() {
    const rows = await groupRepository.list();
    return rows.map(serializeGroup);
  },

  /** Groups an admin may open in the app: created by them, plus legacy `users.group_id` assignment. */
  async listMine(user) {
    if (user.role !== ROLES.ADMIN) {
      throw new AppError(403, 'Only group admins can list their groups');
    }
    const created = await groupRepository.listByCreator(user.id);
    const byId = new Map(created.map((row) => [row.id, row]));
    if (user.groupId) {
      const assigned = await groupRepository.findById(user.groupId);
      if (assigned && !byId.has(assigned.id)) {
        byId.set(assigned.id, assigned);
      }
    }
    const merged = [...byId.values()].sort(
      (a, b) => new Date(attr(a, 'created_at')) - new Date(attr(b, 'created_at'))
    );
    const createdCount = await groupRepository.countByCreator(user.id);
    return {
      groups: merged.map((row) => serializeMyGroup(row, user.id)),
      createdCount,
      maxCreated: MAX_GROUPS_PER_ADMIN,
    };
  },

  /**
   * Whether this admin may scope API requests to the given group.
   * Matches `/groups/mine`: created groups (creator_user_id) OR legacy `users.group_id`.
   */
  async adminHasGroupAccess(userId, groupId) {
    const gid = normalizeEntityId(groupId);
    if (!gid) return false;

    const group = await groupRepository.findById(groupId);
    if (!group) return false;

    const creator = attr(group, 'creator_user_id');
    if (creator != null && sameId(creator, userId)) return true;

    const u = await userRepository.findById(userId);
    if (!u) return false;
    const assigned = attr(u, 'group_id');
    if (assigned != null && sameId(assigned, groupId)) return true;

    const created = await groupRepository.listByCreator(userId);
    for (const row of created) {
      if (sameId(attr(row, 'id'), gid)) return true;
    }

    return false;
  },

  /**
   * Create a Bachat Gat. `admin`: capped at MAX_GROUPS_PER_ADMIN, sets `creator_user_id`.
   * `super_admin`: no cap, no creator (org console).
   */
  async create(actor, body) {
    if (actor.role === ROLES.ADMIN) {
      const n = await groupRepository.countByCreator(actor.id);
      if (n >= MAX_GROUPS_PER_ADMIN) {
        throw new AppError(403, `You can create at most ${MAX_GROUPS_PER_ADMIN} Bachat Gats`);
      }
    }
    const cycleType = body.contributionCycleType;
    const payload = {
      name_marathi: body.nameMarathi,
      name_english: body.nameEnglish,
      loan_interest_rate_monthly_percent: Number(body.loanInterestRateMonthlyPercent),
      max_members: Number(body.maxMembers),
      contribution_cycle_type: cycleType,
      contribution_cycle_days: cycleType === 'custom' ? Number(body.contributionCycleDays) : null,
    };
    if (actor.role === ROLES.ADMIN) {
      payload.creator_user_id = actor.id;
    }
    const g = await groupRepository.create(payload);
    return serializeMyGroup(g, actor.id);
  },

  /** @deprecated Prefer POST /admin/create-admin with `group_id` in body */
  async assignGroupAdmin(actor, groupId, body) {
    return authService.createAdminBySuperAdmin(actor, {
      name: body.name,
      mobile_number: body.mobile_number,
      password: body.password,
      group_id: groupId,
    });
  },
};

export default groupService;
