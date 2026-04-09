/** Bachat Gat RBAC — roles stored on `users.role` */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
};

export const ROLE_VALUES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER];

/** Normalize DB/API role strings (whitespace, case) so middleware and RBAC stay consistent. */
export function normalizeRoleString(role) {
  if (typeof role !== 'string') return ROLES.USER;
  const r = role.trim().toLowerCase();
  if (r === ROLES.SUPER_ADMIN || r === ROLES.ADMIN || r === ROLES.USER) return r;
  return role.trim() || ROLES.USER;
}

/** Can manage members, savings, loan approval for a group */
export function canManageGroup(user) {
  return user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
}

/** SHG member app user */
export function isMemberUser(user) {
  return user?.role === ROLES.USER;
}

export function isSuperAdmin(user) {
  return user?.role === ROLES.SUPER_ADMIN;
}
