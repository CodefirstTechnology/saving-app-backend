import memberRepository from '../repositories/memberRepository.js';
import loanRepository from '../repositories/loanRepository.js';
import transactionRepository from '../repositories/transactionRepository.js';
import groupRepository from '../repositories/groupRepository.js';
import { getGroupFundSnapshot } from './groupFundService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { ROLES, isSuperAdmin } from '../constants/roles.js';

const DEFAULT_GOAL = Number(process.env.SAVINGS_GOAL_AMOUNT) || 500000;

const dashboardService = {
  /**
   * @param {object} user
   * @param {string|null} groupId - from req.groupScopeId; null for super_admin "all groups" view
   */
  async summary(user, groupId) {
    if (isSuperAdmin(user) && !groupId) {
      const groups = await groupRepository.list();
      const summaries = await Promise.all(
        groups.map(async (g) => {
          const [totalMembers, totalSavingsStr, outstandingStr] = await Promise.all([
            memberRepository.countByGroup(g.id),
            memberRepository.sumBalance(g.id),
            loanRepository.sumOutstanding(g.id, ['active', 'overdue']),
          ]);
          return {
            groupId: g.id,
            nameMarathi: g.name_marathi,
            nameEnglish: g.name_english,
            totalMembers,
            totalSavings: String(totalSavingsStr),
            outstandingLoans: String(outstandingStr),
          };
        })
      );
      return {
        view: 'super_admin',
        groups: summaries,
        savingsGoalAmount: DEFAULT_GOAL,
        recentTransactions: [],
      };
    }

    if (!groupId) throw new AppError(400, 'groupId missing');

    if (user.role === ROLES.USER && user.memberId) {
      const m = await memberRepository.findById(user.memberId, groupId);
      if (!m) throw new AppError(404, 'Member profile not found');
      const [group, recent] = await Promise.all([
        groupRepository.findById(groupId),
        transactionRepository.listByGroup(groupId, {
          offset: 0,
          limit: 8,
          memberId: user.memberId,
        }),
      ]);
      const totalSavings = Number(m.savings_balance);
      const goalPercent = Math.min(100, Math.round((totalSavings / DEFAULT_GOAL) * 100));
      const groupFund = await getGroupFundSnapshot(groupId);
      return {
        view: 'member',
        group: serializeGroup(group),
        totalMembers: 1,
        totalSavings: String(totalSavings),
        outstandingLoans: '0',
        savingsGoalAmount: DEFAULT_GOAL,
        progressBloomPercent: goalPercent,
        recentTransactions: recent.rows.map(mapTx),
        groupFund,
      };
    }

    const [group, totalMembers, totalSavingsStr, outstandingStr, recent] = await Promise.all([
      groupRepository.findById(groupId),
      memberRepository.countByGroup(groupId),
      memberRepository.sumBalance(groupId),
      loanRepository.sumOutstanding(groupId, ['active', 'overdue']),
      transactionRepository.listByGroup(groupId, { offset: 0, limit: 8 }),
    ]);

    const totalSavings = Number(totalSavingsStr);
    const outstandingLoans = Number(outstandingStr);
    const goalPercent = Math.min(100, Math.round((totalSavings / DEFAULT_GOAL) * 100));

    const groupFund = await getGroupFundSnapshot(groupId);
    return {
      view: user.role === ROLES.SUPER_ADMIN ? 'group_scoped' : 'admin',
      group: serializeGroup(group),
      totalMembers,
      totalSavings: String(totalSavings),
      outstandingLoans: String(outstandingLoans),
      savingsGoalAmount: DEFAULT_GOAL,
      progressBloomPercent: goalPercent,
      recentTransactions: recent.rows.map(mapTx),
      groupFund,
    };
  },
};

function serializeGroup(g) {
  if (!g) return null;
  const cycleDays = g.contribution_cycle_days ?? g.get?.('contribution_cycle_days');
  return {
    id: g.id,
    nameMarathi: g.name_marathi,
    nameEnglish: g.name_english,
    loanInterestRateMonthlyPercent: String(g.loan_interest_rate_monthly_percent ?? g.get?.('loan_interest_rate_monthly_percent') ?? ''),
    maxMembers: g.max_members ?? g.get?.('max_members'),
    contributionCycleType: g.contribution_cycle_type ?? g.get?.('contribution_cycle_type'),
    contributionCycleDays: cycleDays != null ? Number(cycleDays) : null,
  };
}

function mapTx(tx) {
  return {
    id: tx.id,
    entryType: tx.entry_type,
    category: tx.category,
    amount: String(tx.amount),
    occurredAt: tx.occurred_at,
    member: tx.member
      ? { nameMarathi: tx.member.name_marathi, nameEnglish: tx.member.name_english }
      : null,
  };
}

export default dashboardService;
