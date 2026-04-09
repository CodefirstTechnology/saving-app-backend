import { withMongoTransaction } from '../config/database.js';
import transactionRepository from '../repositories/transactionRepository.js';
import memberRepository from '../repositories/memberRepository.js';
import { AppError } from '../middlewares/errorHandler.js';
import { Member } from '../models/index.js';
import { ROLES, canManageGroup } from '../constants/roles.js';

function ensureManager(user) {
  if (!canManageGroup(user)) throw new AppError(403, 'Insufficient permissions');
}

/**
 * Credits member savings (ledger row + balance). Used by admin direct entry and collection confirmation.
 * @param {object} opts
 * @param {*} [session] MongoDB session from `withMongoTransaction`; when set, joins caller transaction (no nested txn).
 */
async function applySavingsCredit(opts, session = undefined) {
  const row = {
    group_id: opts.groupId,
    member_id: opts.memberId,
    loan_id: null,
    entry_type: 'credit',
    category: 'savings',
    amount: opts.amount,
    description_marathi: opts.descriptionMarathi ?? null,
    description_english: opts.descriptionEnglish || 'Monthly savings',
    payment_mode: opts.paymentMode || 'cash',
    occurred_at: opts.occurredAt,
    created_by_user_id: opts.createdByUserId,
  };

  const run = async (s) => {
    const created = await transactionRepository.create(row, { session: s });
    const updated = await Member.findOneAndUpdate(
      { _id: opts.memberId, group_id: opts.groupId },
      { $inc: { savings_balance: opts.amount } },
      { session: s, new: true }
    );
    if (!updated) throw new AppError(404, 'Member not found');
    return created.id;
  };

  if (session) {
    const transactionId = await run(session);
    return { transactionId };
  }

  return withMongoTransaction(async (s) => {
    const transactionId = await run(s);
    return { transactionId };
  });
}

const transactionService = {
  applySavingsCredit,
  async list(user, query, groupId) {
    if (!groupId) throw new AppError(400, 'groupId missing');
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const catIn = query.categoryIn
      ? String(query.categoryIn)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const etIn = query.entryTypeIn
      ? String(query.entryTypeIn)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const filters = {
      offset,
      limit: pageSize,
      memberId: query.memberId || undefined,
      category: query.category || undefined,
      categories: catIn.length ? catIn : undefined,
      entryType: query.entryType || undefined,
      entryTypes: etIn.length ? etIn : undefined,
      dateFrom: query.dateFrom || undefined,
      dateTo: query.dateTo || undefined,
    };
    if (user.role === ROLES.USER && user.memberId) {
      filters.memberId = user.memberId;
    }
    const { rows, count } = await transactionRepository.listByGroup(groupId, filters);
    return {
      data: rows.map(serializeTx),
      meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
    };
  },

  async createSavings(user, body, groupId) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');
    const member = await memberRepository.findById(body.memberId, groupId);
    if (!member) throw new AppError(404, 'Member not found');
    const amount = Number(body.amount);
    if (amount <= 0) throw new AppError(400, 'Amount must be positive');

    await applySavingsCredit({
      groupId,
      memberId: member.id,
      amount,
      paymentMode: body.paymentMode || 'cash',
      occurredAt: body.occurredAt,
      createdByUserId: user.id,
      descriptionMarathi: body.descriptionMarathi,
      descriptionEnglish: body.descriptionEnglish,
    });
    const updated = await memberRepository.findById(member.id, groupId);
    return { member: { id: updated.id, savingsBalance: String(updated.savings_balance) } };
  },

  async createLedgerEntry(user, body, groupId) {
    ensureManager(user);
    if (!groupId) throw new AppError(400, 'groupId missing');
    const amount = Number(body.amount);
    if (amount <= 0) throw new AppError(400, 'Amount must be positive');

    await withMongoTransaction(async (session) => {
      await transactionRepository.create(
        {
          group_id: groupId,
          member_id: body.memberId || null,
          loan_id: body.loanId || null,
          entry_type: body.entryType,
          category: body.category,
          amount,
          description_marathi: body.descriptionMarathi || null,
          description_english: body.descriptionEnglish || null,
          payment_mode: body.paymentMode || null,
          occurred_at: body.occurredAt,
          created_by_user_id: user.id,
        },
        { session }
      );

      if (body.memberId && body.category === 'savings' && body.entryType === 'credit') {
        await Member.findOneAndUpdate(
          { _id: body.memberId, group_id: groupId },
          { $inc: { savings_balance: amount } },
          { session }
        );
      }
      if (body.memberId && body.category === 'savings' && body.entryType === 'debit') {
        await Member.findOneAndUpdate(
          { _id: body.memberId, group_id: groupId },
          { $inc: { savings_balance: -amount } },
          { session }
        );
      }
    });
    return { ok: true };
  },

  async ledgerSummary(user, query, groupId) {
    if (!groupId) throw new AppError(400, 'groupId missing');
    if (user.role === ROLES.USER) throw new AppError(403, 'Insufficient permissions');
    const dateFrom = query.dateFrom || undefined;
    const dateTo = query.dateTo || undefined;
    const rows = await transactionRepository.aggregateByCategory(groupId, { dateFrom, dateTo });
    let inflow = 0;
    let outflow = 0;
    for (const r of rows) {
      const v = Number(r.total);
      if (r.entry_type === 'credit') inflow += v;
      else outflow += v;
    }
    return { inflow, outflow, breakdown: rows };
  },
};

function serializeTx(tx) {
  return {
    id: tx.id,
    groupId: tx.group_id,
    memberId: tx.member_id,
    loanId: tx.loan_id,
    entryType: tx.entry_type,
    category: tx.category,
    amount: String(tx.amount),
    descriptionMarathi: tx.description_marathi,
    descriptionEnglish: tx.description_english,
    paymentMode: tx.payment_mode,
    occurredAt: tx.occurred_at,
    member: tx.member
      ? {
          id: tx.member.id ?? tx.member._id,
          nameMarathi: tx.member.name_marathi,
          nameEnglish: tx.member.name_english,
        }
      : null,
  };
}

export default transactionService;
