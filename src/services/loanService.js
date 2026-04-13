import { addMonths, formatISO } from '../utils/date.js';
import { withMongoTransaction } from '../config/database.js';
import loanRepository from '../repositories/loanRepository.js';
import loanVoteRepository from '../repositories/loanVoteRepository.js';
import groupRepository from '../repositories/groupRepository.js';
import memberRepository from '../repositories/memberRepository.js';
import transactionRepository from '../repositories/transactionRepository.js';
import userRepository from '../repositories/userRepository.js';
import notificationService from './notificationService.js';
import fundControlService from './fundControlService.js';
import { getGroupFundSnapshot, roundMoney } from './groupFundService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { ROLES, canManageGroup } from '../constants/roles.js';

const DEFAULT_MONTHLY_RATE = Number(process.env.SHG_DEFAULT_MONTHLY_INTEREST_PERCENT) || 1.5;

function groupRowAttr(row, key) {
  if (!row) return undefined;
  return row.get ? row.get(key) : row[key];
}

/** Group-configured monthly loan rate, or env/default for legacy rows. */
async function getGroupMonthlyInterestPercent(groupId) {
  if (!groupId) return DEFAULT_MONTHLY_RATE;
  const g = await groupRepository.findById(groupId);
  if (!g) return DEFAULT_MONTHLY_RATE;
  const raw = groupRowAttr(g, 'loan_interest_rate_monthly_percent');
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MONTHLY_RATE;
}
const VOTE_FRACTION = Number(process.env.SHG_VOTE_APPROVAL_FRACTION) || 0.75;

function computeEmiBreakdown(principal, monthlyRatePercent, termMonths) {
  const P = Number(principal);
  const r = Number(monthlyRatePercent) / 100;
  const n = Math.max(1, Number(termMonths) || 12);
  const interestTotal = P * r * n;
  const totalRepayment = P + interestTotal;
  const emi = totalRepayment / n;
  return {
    interestTotal: roundMoney(interestTotal),
    totalRepayment: roundMoney(totalRepayment),
    emi: roundMoney(emi),
  };
}

function buildSuggestionOptions({ savings, available, blocking, missed, fines }) {
  if (blocking || savings <= 0) {
    return {
      suggestions: [],
      blockReason: blocking ? 'existing_pending_or_active_loan' : 'no_savings_recorded',
    };
  }

  const penalized =
    Math.min(0.85, 1 - Math.min(missed || 0, 10) * 0.07 - (Number(fines) > 0 ? 0.06 : 0)) || 0.15;

  const fundCap = Math.max(0, Number(available)) * 0.9;
  const lowFund = Number(available) < savings * 0.5;
  let capMult = 1;
  if (lowFund) capMult *= 0.55;
  const strongFund = Number(available) >= savings * 3;

  const rawTier = (mult) => roundMoney(Math.min(savings * mult * penalized * capMult, fundCap));

  const tiers = [];
  const safe = rawTier(1);
  if (safe > 0) tiers.push({ tier: 'safe', label: 'Safe (1× savings)', principal: String(safe), multiplier: 1 });

  const med = rawTier(2);
  if (med > 0 && med >= safe) tiers.push({ tier: 'medium', label: 'Medium (2× savings)', principal: String(med), multiplier: 2 });

  if (!lowFund && missed <= 1) {
    const hm = strongFund ? 4 : 3;
    const hi = rawTier(hm);
    if (hi > 0 && hi >= med) tiers.push({ tier: 'high', label: strongFund ? 'High (4× savings)' : 'High (3× savings)', principal: String(hi), multiplier: hm });
  }

  const deduped = [];
  let prev = -1;
  for (const t of tiers) {
    const p = Number(t.principal);
    if (p - prev >= 1) {
      deduped.push({ ...t, principal: String(p) });
      prev = p;
    }
  }
  return { suggestions: deduped };
}

function pendingVotersFromLists(loan, activeMembers) {
  if (!loan || !activeMembers?.length) return [];
  const borrowerId = String(loan.member_id);
  const voted = new Set((loan.votes || []).map((v) => String(v.voter_member_id)));
  return activeMembers
    .filter((m) => String(m.id) !== borrowerId && !voted.has(String(m.id)))
    .map((m) => ({
      id: m.id,
      nameMarathi: m.name_marathi,
      nameEnglish: m.name_english,
    }));
}

function voteRollup(votes, electorateCount, requiredApprovals) {
  let approve = 0;
  let reject = 0;
  for (const v of votes) {
    if (v.decision === 'approve') approve += 1;
    else reject += 1;
  }
  const pending = Math.max(0, electorateCount - approve - reject);
  return {
    approve,
    reject,
    pending,
    electorateCount,
    requiredApprovals,
    thresholdMet: requiredApprovals === 0 || approve >= requiredApprovals,
  };
}

async function computeVotingMeta(loan, groupId) {
  const electorate = await memberRepository.countActiveExcluding(groupId, loan.member_id);
  const requiredApprovals = electorate <= 0 ? 0 : Math.ceil(VOTE_FRACTION * electorate);
  const votes = loan.votes || [];
  return voteRollup(votes, electorate, requiredApprovals);
}

function chartData(loan, availableBalanceNum, voting) {
  const P = Number(loan.principal);
  const rem = roundMoney(Math.max(0, availableBalanceNum - P));
  return {
    fundImpact: [
      { key: 'loan', label: 'Loan', value: P },
      { key: 'remaining', label: 'Fund after', value: rem },
    ],
    voting: [
      { key: 'approve', label: 'Approved', value: voting.approve },
      { key: 'reject', label: 'Rejected', value: voting.reject },
      { key: 'pending', label: 'Pending', value: voting.pending },
    ],
  };
}

function serializeLoan(loan, ctx = {}) {
  if (!loan) return null;
  const m = loan.member;
  const votes = loan.votes || [];
  const voting =
    ctx.voting ||
    voteRollup(votes, ctx.electorateCount ?? 0, ctx.requiredApprovals ?? 0);
  const avail = ctx.availableBalanceNum != null ? ctx.availableBalanceNum : 0;
  const charts = ctx.skipCharts ? null : chartData(loan, avail, voting);
  let myVote = null;
  if (ctx.myMemberId) {
    const mv = votes.find((v) => String(v.voter_member_id) === String(ctx.myMemberId));
    if (mv) myVote = { decision: mv.decision, comment: mv.comment };
  }
  return {
    id: loan._id ?? loan.id,
    groupId: loan.group_id,
    memberId: loan.member_id,
    referenceCode: loan.reference_code,
    principal: String(loan.principal),
    interestRatePercent: String(loan.interest_rate_percent),
    termMonths: loan.term_months,
    outstandingBalance: String(loan.outstanding_balance),
    status: loan.status,
    issuedAt: loan.issued_at,
    dueAt: loan.due_at,
    reason: loan.reason,
    emiAmount: loan.emi_amount != null ? String(loan.emi_amount) : null,
    suggestedTier: loan.suggested_tier,
    installmentsPaid: loan.installments_paid ?? 0,
    nextDueDate: loan.next_due_date,
    rejectReason: loan.reject_reason,
    createdAt: loan.created_at,
    member: m
      ? {
          id: m.id,
          nameMarathi: m.name_marathi,
          nameEnglish: m.name_english,
        }
      : null,
    voteSummary: voting,
    myVote,
    charts,
    votes: votes.map((v) => ({
      decision: v.decision,
      comment: v.comment,
      voterMemberId: v.voter_member_id ?? v.voterMemberId,
      voter: v.voter
        ? {
            id: v.voter.id,
            nameMarathi: v.voter.name_marathi ?? v.voter.nameMarathi,
            nameEnglish: v.voter.name_english ?? v.voter.nameEnglish,
          }
        : null,
      createdAt: v.createdAt ?? v.created_at,
    })),
    pendingVoters:
      ctx.pendingVoters ?? (ctx.activeMembers ? pendingVotersFromLists(loan, ctx.activeMembers) : []),
  };
}

function ensureManager(user) {
  if (!canManageGroup(user)) throw new AppError(403, 'Insufficient permissions');
}

function refCode() {
  return `LOAN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const loanService = {
  async eligibility(user) {
    if (user.role !== ROLES.USER) throw new AppError(403, 'Only members can view loan eligibility');
    if (!user.groupId || !user.memberId) throw new AppError(400, 'Member context required');
    const member = await memberRepository.findById(user.memberId, user.groupId);
    if (!member) throw new AppError(404, 'Member not found');
    const blocking = await loanRepository.findBlockingLoanForMember(user.groupId, user.memberId);
    const fund = await getGroupFundSnapshot(user.groupId);
    const availableNum = Number(fund.availableBalance);
    const savings = Number(member.savings_balance);
    const groupRate = await getGroupMonthlyInterestPercent(user.groupId);
    const { suggestions, blockReason } = buildSuggestionOptions({
      savings,
      available: availableNum,
      blocking: Boolean(blocking),
      missed: member.missed_payments_count || 0,
      fines: member.fines_total || 0,
    });
    const disciplineScore = Math.max(
      0,
      Math.min(100, 100 - (member.missed_payments_count || 0) * 8 - (Number(member.fines_total) > 0 ? 8 : 0))
    );
    return {
      eligibility: {
        memberTotalSavings: String(roundMoney(savings)),
        hasBlockingLoan: Boolean(blocking),
        blockReason: blockReason || null,
        missedPaymentsCount: member.missed_payments_count ?? 0,
        finesTotal: String(member.fines_total ?? 0),
        disciplineScore,
        defaultInterestRatePercent: String(groupRate),
      },
      groupFund: fund,
      suggestions,
    };
  },

  async list(user, query, groupId) {
    if (!groupId) throw new AppError(400, 'groupId missing');
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    let status = query.status || undefined;
    if (query.statusIn) {
      status = String(query.statusIn)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    let memberId = query.memberId || undefined;
    if (user.role === ROLES.USER) {
      memberId = undefined;
    }

    const { rows, count } = await loanRepository.listByGroup(groupId, {
      offset,
      limit: pageSize,
      status,
      memberId,
    });
    const fund = await getGroupFundSnapshot(groupId);
    const availableBalanceNum = Number(fund.availableBalance);
    const activeMembers = await memberRepository.listActiveMembersInGroup(groupId);
    const serialized = await Promise.all(
      rows.map(async (loan) => {
        const voting = await computeVotingMeta(loan, groupId);
        return serializeLoan(loan, {
          availableBalanceNum,
          voting,
          electorateCount: voting.electorateCount,
          requiredApprovals: voting.requiredApprovals,
          myMemberId: user.memberId || null,
          activeMembers,
        });
      })
    );
    return {
      data: serialized,
      meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize), groupFund: fund },
    };
  },

  async request(user, body) {
    if (user.role !== ROLES.USER) throw new AppError(403, 'Only members can request a loan');
    if (!user.groupId) throw new AppError(400, 'No group assigned');
    if (!user.memberId) throw new AppError(400, 'Member profile is not linked to this login');

    const member = await memberRepository.findById(user.memberId, user.groupId);
    if (!member) throw new AppError(404, 'Member not found');
    await fundControlService.assertLoansAllowed(user.groupId);
    const blocking = await loanRepository.findBlockingLoanForMember(user.groupId, user.memberId);
    if (blocking) throw new AppError(400, 'You already have a pending or active loan');

    const fund = await getGroupFundSnapshot(user.groupId);
    const availableNum = Number(fund.availableBalance);
    const savings = Number(member.savings_balance);
    const { suggestions } = buildSuggestionOptions({
      savings,
      available: availableNum,
      blocking: false,
      missed: member.missed_payments_count || 0,
      fines: member.fines_total || 0,
    });
    if (!suggestions.length) throw new AppError(400, 'No eligible loan options for your savings or group fund');

    const termMonths = Number(body.termMonths) || 12;
    const interestRate = await getGroupMonthlyInterestPercent(user.groupId);
    const reason = (body.reason && String(body.reason).trim()) || 'Not provided';

    let selected = null;
    if (body.selectedTier) {
      selected = suggestions.find((s) => s.tier === body.selectedTier);
      if (!selected) throw new AppError(400, 'Selected tier is not available; refresh eligibility');
    }
    if (body.principal != null) {
      const p = roundMoney(body.principal);
      const match = suggestions.find((s) => Math.abs(Number(s.principal) - p) < 0.02);
      if (!match) throw new AppError(400, 'Loan amount must be chosen from suggested options only');
      if (selected && selected.tier !== match.tier) throw new AppError(400, 'Amount does not match selected tier');
      selected = match;
    } else if (!selected) {
      throw new AppError(400, 'Select a suggested loan tier (safe / medium / high)');
    }

    const principal = roundMoney(selected.principal);
    if (principal > availableNum + 1e-6) throw new AppError(400, 'Group fund cannot support this amount right now');

    const { emi } = computeEmiBreakdown(principal, interestRate, termMonths);
    const requestedStart = body.requestedStartDate || formatISO(new Date(), 'date');
    const dueAt = addMonths(requestedStart, termMonths);

    const loan = await loanRepository.create({
      group_id: user.groupId,
      member_id: user.memberId,
      reference_code: refCode(),
      principal,
      interest_rate_percent: interestRate,
      term_months: termMonths,
      outstanding_balance: principal,
      status: 'pending',
      issued_at: null,
      due_at: dueAt,
      reason,
      emi_amount: emi,
      suggested_tier: selected.tier,
      installments_paid: 0,
      next_due_date: null,
      reject_reason: null,
    });

    const full = await loanRepository.findById(loan.id, user.groupId);
    await notificationService.notifyGroupMembers(user.groupId, {
      category: 'loan_request',
      title: 'New loan request',
      body: `A member requested a loan of ₹${principal}. Please review and vote.`,
      payload: { loanId: loan.id },
    });
    await notificationService.notifyGroupLeaders(user.groupId, {
      category: 'loan_vote_open',
      title: 'Loan needs member votes',
      body: `Reference ${full.reference_code}: voting is open until the group reaches the approval threshold.`,
      payload: { loanId: loan.id },
    });

    const voting = await computeVotingMeta(full, user.groupId);
    const activeMembers = await memberRepository.listActiveMembersInGroup(user.groupId);
    return serializeLoan(full, {
      availableBalanceNum: availableNum,
      voting,
      myMemberId: user.memberId,
      activeMembers,
    });
  },

  async vote(user, loanId, body, groupId) {
    if (user.role !== ROLES.USER || !user.memberId) throw new AppError(403, 'Only member accounts can vote');
    if (!groupId || groupId !== user.groupId) throw new AppError(403, 'Wrong group scope');
    const loan = await loanRepository.findById(loanId, groupId);
    if (!loan) throw new AppError(404, 'Loan not found');
    if (loan.status !== 'pending') throw new AppError(400, 'Voting is closed for this loan');
    if (String(loan.member_id) === String(user.memberId)) throw new AppError(403, 'You cannot vote on your own loan request');

    const existing = await loanVoteRepository.findVote(loanId, user.memberId);
    if (existing) throw new AppError(400, 'You have already voted on this request');

    const decision = body.decision;
    const finalComment =
      decision === 'reject'
        ? (body.comment && String(body.comment).trim()) || (body.rejectReason && String(body.rejectReason).trim()) || null
        : body.comment?.trim() || null;

    await loanVoteRepository.create({
      loan_id: loanId,
      voter_member_id: user.memberId,
      decision,
      comment: finalComment,
    });

    const refreshed = await loanRepository.findById(loanId, groupId);
    const voting = await computeVotingMeta(refreshed, groupId);

    if (voting.thresholdMet) {
      await notificationService.notifyGroupLeaders(groupId, {
        category: 'loan_vote_passed',
        title: 'Loan passed group vote',
        body: `Request ${refreshed.reference_code} reached ${VOTE_FRACTION * 100}% approvals. Leader may disburse if the fund has balance.`,
        payload: { loanId },
      });
    }

    const fund = await getGroupFundSnapshot(groupId);
    const activeMembers = await memberRepository.listActiveMembersInGroup(groupId);
    return serializeLoan(refreshed, {
      availableBalanceNum: Number(fund.availableBalance),
      voting,
      myMemberId: user.memberId,
      activeMembers,
    });
  },

  async approve(user, loanId, body, groupId) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');
    await fundControlService.assertLoansAllowed(groupId);
    const loan = await loanRepository.findById(loanId, groupId);
    if (!loan) throw new AppError(404, 'Loan not found');
    if (loan.status !== 'pending') throw new AppError(400, 'Loan is not pending approval');

    const voting = await computeVotingMeta(loan, groupId);
    if (!voting.thresholdMet) {
      throw new AppError(400, `Group approval (${VOTE_FRACTION * 100}%) not reached yet`);
    }

    const principal = Number(loan.principal);
    const termMonths = loan.term_months;
    const issuedAt = body?.issuedAt || formatISO(new Date(), 'date');
    const dueAt = body?.dueAt || addMonths(issuedAt, termMonths);

    const fund = await getGroupFundSnapshot(groupId);
    if (Number(fund.availableBalance) + 1e-6 < principal) {
      throw new AppError(400, 'Insufficient group fund balance to approve this loan');
    }

    const nextDue = addMonths(issuedAt, 1);

    await withMongoTransaction(async (session) => {
      await loanRepository.update(
        loan,
        {
          status: 'active',
          outstanding_balance: principal,
          issued_at: issuedAt,
          due_at: dueAt,
          next_due_date: nextDue,
        },
        { session }
      );
      await transactionRepository.create(
        {
          group_id: groupId,
          member_id: loan.member_id,
          loan_id: loan.id,
          entry_type: 'debit',
          category: 'loan_issue',
          amount: principal,
          description_marathi: null,
          description_english: `Loan issued — ${loan.reason || ''}`.trim(),
          payment_mode: null,
          occurred_at: issuedAt,
          created_by_user_id: user.id,
        },
        { session }
      );
    });

    const after = await loanRepository.findById(loanId, groupId);
    const borrower = await userRepository.findByMemberId(loan.member_id);
    if (borrower?.id) {
      await notificationService.notifyUser(borrower.id, {
        category: 'loan_approved',
        title: 'Loan approved',
        body: `Your loan of ₹${principal} was approved and disbursed.`,
        payload: { loanId },
      });
    }
    await notificationService.notifyGroupMembers(groupId, {
      category: 'loan_approved_broadcast',
      title: 'Loan approved',
      body: `A group loan (${after.reference_code}) was approved by the leader.`,
      payload: { loanId },
      excludeUserIds: borrower?.id ? [borrower.id] : [],
    });

    const snap = await getGroupFundSnapshot(groupId);
    const votingAfter = await computeVotingMeta(after, groupId);
    const activeMembers = await memberRepository.listActiveMembersInGroup(groupId);
    return serializeLoan(after, {
      availableBalanceNum: Number(snap.availableBalance),
      voting: votingAfter,
      activeMembers,
    });
  },

  async reject(user, loanId, groupId, body = {}) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');
    const loan = await loanRepository.findById(loanId, groupId);
    if (!loan) throw new AppError(404, 'Loan not found');
    if (loan.status !== 'pending') throw new AppError(400, 'Only pending requests can be rejected');
    const reason = body.rejectReason?.trim() || body.reason?.trim() || null;
    await loanRepository.update(loan, { status: 'rejected', outstanding_balance: 0, reject_reason: reason });
    const after = await loanRepository.findById(loanId, groupId);
    const borrower = await userRepository.findByMemberId(loan.member_id);
    if (borrower?.id) {
      await notificationService.notifyUser(borrower.id, {
        category: 'loan_rejected',
        title: 'Loan request rejected',
        body: reason ? `Reason: ${reason}` : 'Your loan request was rejected by the group leader.',
        payload: { loanId },
      });
    }
    const snap = await getGroupFundSnapshot(groupId);
    const votingAfter = await computeVotingMeta(after, groupId);
    const activeMembers = await memberRepository.listActiveMembersInGroup(groupId);
    return serializeLoan(after, {
      availableBalanceNum: Number(snap.availableBalance),
      voting: votingAfter,
      activeMembers,
    });
  },

  async issue(user, body, groupId) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');
    await fundControlService.assertLoansAllowed(groupId);
    const member = await memberRepository.findById(body.memberId, groupId);
    if (!member) throw new AppError(404, 'Member not found');
    const principal = Number(body.principal);
    if (principal <= 0) throw new AppError(400, 'Invalid principal');
    const termMonths = Number(body.termMonths) || 12;
    const groupRate = await getGroupMonthlyInterestPercent(groupId);
    const interestRate =
      body.interestRatePercent != null && body.interestRatePercent !== ''
        ? Number(body.interestRatePercent)
        : groupRate;
    if (!(interestRate > 0)) throw new AppError(400, 'Interest rate must be greater than 0');
    const issuedAt = body.issuedAt || formatISO(new Date(), 'date');
    const dueAt = body.dueAt || addMonths(issuedAt, termMonths);
    const { emi } = computeEmiBreakdown(principal, interestRate, termMonths);
    const nextDue = addMonths(issuedAt, 1);
    let loan;
    await withMongoTransaction(async (session) => {
      loan = await loanRepository.create(
        {
          group_id: groupId,
          member_id: member.id,
          reference_code: refCode(),
          principal,
          interest_rate_percent: interestRate,
          term_months: termMonths,
          outstanding_balance: principal,
          status: 'active',
          issued_at: issuedAt,
          due_at: dueAt,
          reason: body.reason || 'Direct issue by admin',
          emi_amount: emi,
          suggested_tier: null,
          installments_paid: 0,
          next_due_date: nextDue,
          reject_reason: null,
        },
        { session }
      );
      await transactionRepository.create(
        {
          group_id: groupId,
          member_id: member.id,
          loan_id: loan.id,
          entry_type: 'debit',
          category: 'loan_issue',
          amount: principal,
          description_marathi: null,
          description_english: 'Loan issued',
          payment_mode: null,
          occurred_at: issuedAt,
          created_by_user_id: user.id,
        },
        { session }
      );
    });
    return serializeLoan(await loanRepository.findById(loan.id, groupId), { skipCharts: true });
  },

  async repay(user, body, groupId) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');
    const loan = await loanRepository.findById(body.loanId, groupId);
    if (!loan) throw new AppError(404, 'Loan not found');
    if (!['active', 'overdue'].includes(loan.status)) throw new AppError(400, 'Loan not repayable');
    const amount = Number(body.amount);
    if (amount <= 0) throw new AppError(400, 'Invalid amount');
    const outstanding = Number(loan.outstanding_balance);
    if (amount > outstanding) throw new AppError(400, 'Amount exceeds balance');
    const newBal = outstanding - amount;
    const newStatus = newBal <= 0 ? 'paid' : loan.status;
    const installmentsPaid = (loan.installments_paid || 0) + 1;
    let nextDue = loan.next_due_date;
    if (newStatus !== 'paid' && nextDue) {
      nextDue = addMonths(nextDue, 1);
    } else if (newStatus === 'paid') {
      nextDue = null;
    }
    await withMongoTransaction(async (session) => {
      await transactionRepository.create(
        {
          group_id: groupId,
          member_id: loan.member_id,
          loan_id: loan.id,
          entry_type: 'credit',
          category: 'loan_repay',
          amount,
          description_marathi: null,
          description_english: 'Loan repayment',
          payment_mode: body.paymentMode || 'cash',
          occurred_at: body.occurredAt || formatISO(new Date(), 'date'),
          created_by_user_id: user.id,
        },
        { session }
      );
      await loanRepository.update(
        loan,
        {
          outstanding_balance: Math.max(0, newBal),
          status: newStatus,
          installments_paid: installmentsPaid,
          next_due_date: nextDue,
        },
        { session }
      );
    });

    const after = await loanRepository.findById(loan.id, groupId);
    const borrower = await userRepository.findByMemberId(loan.member_id);
    if (borrower?.id && newStatus === 'paid') {
      await notificationService.notifyUser(borrower.id, {
        category: 'loan_closed',
        title: 'Loan closed',
        body: `Loan ${after.reference_code} is fully repaid.`,
        payload: { loanId: loan.id },
      });
    }
    return serializeLoan(after, { skipCharts: true });
  },

  async setStatus(user, loanId, status, groupId) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');
    const loan = await loanRepository.findById(loanId, groupId);
    if (!loan) throw new AppError(404, 'Loan not found');
    await loanRepository.update(loan, { status });
    return serializeLoan(await loanRepository.findById(loanId, groupId), { skipCharts: true });
  },
};

export default loanService;
