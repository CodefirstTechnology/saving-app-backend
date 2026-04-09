import { withMongoTransaction } from '../config/database.js';
import { formatISO } from '../utils/date.js';
import collectionPaymentRepository from '../repositories/collectionPaymentRepository.js';
import memberRepository from '../repositories/memberRepository.js';
import transactionService from './transactionService.js';
import notificationService from './notificationService.js';
import reconciliationService from './reconciliationService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { ROLES, canManageGroup } from '../constants/roles.js';

function paymentModeToLedger(mode) {
  return mode === 'cash' ? 'cash' : 'bank';
}

function serializePayment(p) {
  const m = p.member;
  return {
    id: p.id,
    groupId: p.group_id,
    memberId: p.member_id,
    member: m
      ? {
          id: m.id,
          nameMarathi: m.name_marathi,
          nameEnglish: m.name_english,
          phone: m.phone,
        }
      : null,
    amount: String(p.amount),
    paymentMethod: p.payment_method,
    transactionReference: p.transaction_reference,
    paidAt: p.paid_at,
    status: p.status,
    digitallyTraceable: Boolean(p.digitally_traceable),
    requiresAdminConfirm: Boolean(p.requires_admin_confirm),
    collectedAt: p.collected_at,
    confirmedByUserId: p.confirmed_by_user_id,
    rejectedAt: p.rejected_at,
    rejectedByUserId: p.rejected_by_user_id,
    linkedTransactionId: p.linked_transaction_id,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

const collectionPaymentService = {
  serializePayment,

  async submit(user, body, groupId) {
    if (user.role !== ROLES.USER || !user.memberId) {
      throw new AppError(403, 'Only members can submit collection payments');
    }
    if (!groupId || groupId !== user.groupId) throw new AppError(403, 'Invalid group');
    const member = await memberRepository.findById(user.memberId, groupId);
    if (!member) throw new AppError(404, 'Member not found');

    const amount = Number(body.amount);
    if (amount <= 0) throw new AppError(400, 'Amount must be positive');

    const method = body.paymentMethod;
    if (!['cash', 'upi', 'bank_transfer'].includes(method)) {
      throw new AppError(400, 'Invalid payment method');
    }

    const ref = body.transactionReference != null ? String(body.transactionReference).trim() : '';
    if (method === 'upi' || method === 'bank_transfer') {
      if (ref.length < 3) throw new AppError(400, 'Transaction reference is required for UPI and bank transfer');
    }

    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) throw new AppError(400, 'Invalid paidAt');

    const digitallyTraceable = method === 'upi' || method === 'bank_transfer';
    const requiresAdminConfirm = method === 'cash';

    const row = await collectionPaymentRepository.create({
      group_id: groupId,
      member_id: member.id,
      submitted_by_user_id: user.id,
      amount,
      payment_method: method,
      transaction_reference: digitallyTraceable ? ref : ref || null,
      paid_at: paidAt,
      status: 'initiated',
      digitally_traceable: digitallyTraceable,
      requires_admin_confirm: requiresAdminConfirm,
    });

    const full = await collectionPaymentRepository.findById(row.id, groupId);
    const memberName = member.name_english || member.name_marathi || 'Member';

    await notificationService.notifyGroupLeaders(groupId, {
      category: 'payment_submitted',
      title: 'Payment submitted',
      body: `${memberName} submitted ₹${amount} via ${method}.`,
      payload: { collectionPaymentId: row.id },
    });

    return serializePayment(full);
  },

  async list(user, query, groupId) {
    if (!groupId) throw new AppError(400, 'groupId missing');
    const status = query.status || undefined;
    let memberId = query.memberId || undefined;
    if (user.role === ROLES.USER) {
      if (!user.memberId) throw new AppError(403, 'Member profile required');
      memberId = user.memberId;
    } else if (!canManageGroup(user)) {
      throw new AppError(403, 'Insufficient permissions');
    }
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const rows = await collectionPaymentRepository.listByGroup(groupId, { status, memberId, limit });
    return rows.map(serializePayment);
  },

  async confirm(user, paymentId, groupId) {
    if (!canManageGroup(user)) throw new AppError(403, 'Insufficient permissions');
    if (!groupId) throw new AppError(400, 'groupId missing');
    const payment = await collectionPaymentRepository.findById(paymentId, groupId);
    if (!payment) throw new AppError(404, 'Payment record not found');
    if (payment.status !== 'initiated') throw new AppError(400, 'Only initiated payments can be confirmed');

    const occurredAt = formatISO(new Date(payment.paid_at), 'date');
    const ledgerMode = paymentModeToLedger(payment.payment_method);

    await withMongoTransaction(async (session) => {
      const { transactionId } = await transactionService.applySavingsCredit(
        {
          groupId,
          memberId: payment.member_id,
          amount: Number(payment.amount),
          paymentMode: ledgerMode,
          occurredAt,
          createdByUserId: user.id,
          descriptionEnglish: `Collection payment (${payment.payment_method})`,
        },
        session
      );

      await collectionPaymentRepository.patch(
        paymentId,
        groupId,
        {
          status: 'collected',
          collected_at: new Date(),
          confirmed_by_user_id: user.id,
          linked_transaction_id: transactionId,
        },
        { session }
      );
    });

    const refreshed = await collectionPaymentRepository.findById(paymentId, groupId);
    const payer = await memberRepository.findById(payment.member_id, groupId);
    const payerUserId = payer?.user_id;

    if (payerUserId) {
      await notificationService.notifyUser(payerUserId, {
        category: 'payment_confirmed',
        title: 'Payment confirmed',
        body: `Your payment of ₹${payment.amount} was confirmed by the admin.`,
        payload: { collectionPaymentId: paymentId },
      });
    }

    await notificationService.notifyAllUsersInGroup(groupId, {
      category: 'payment_confirmed_broadcast',
      title: 'Payment confirmed',
      body: `A member payment of ₹${payment.amount} was confirmed.`,
      payload: { collectionPaymentId: paymentId },
      excludeUserIds: payerUserId ? [payerUserId] : [],
    });

    const rec = await reconciliationService.getReconciliation(groupId);
    if (rec.state === 'mismatch') {
      await notificationService.notifyAllUsersInGroup(groupId, {
        category: 'deposit_mismatch',
        title: 'Fund mismatch detected',
        body: 'Recorded bank deposits exceed total collected payments. Please review.',
        payload: { state: rec.state },
      });
    } else if (rec.state === 'partial') {
      await notificationService.notifyAllUsersInGroup(groupId, {
        category: 'pending_deposit',
        title: 'Pending bank deposit',
        body: `₹${rec.pendingDepositAmount} is collected but not yet fully deposited to the bank.`,
        payload: { pendingDepositAmount: rec.pendingDepositAmount },
      });
    }

    return serializePayment(refreshed);
  },

  async reject(user, paymentId, groupId) {
    if (!canManageGroup(user)) throw new AppError(403, 'Insufficient permissions');
    if (!groupId) throw new AppError(400, 'groupId missing');
    const payment = await collectionPaymentRepository.findById(paymentId, groupId);
    if (!payment) throw new AppError(404, 'Payment record not found');
    if (payment.status !== 'initiated') throw new AppError(400, 'Only initiated payments can be rejected');

    await collectionPaymentRepository.patch(paymentId, groupId, {
      status: 'rejected',
      rejected_at: new Date(),
      rejected_by_user_id: user.id,
    });

    const refreshed = await collectionPaymentRepository.findById(paymentId, groupId);
    const payer = await memberRepository.findById(payment.member_id, groupId);
    if (payer?.user_id) {
      await notificationService.notifyUser(payer.user_id, {
        category: 'payment_rejected',
        title: 'Payment not confirmed',
        body: `Your payment record of ₹${payment.amount} was rejected. Contact your group leader if this is unexpected.`,
        payload: { collectionPaymentId: paymentId },
      });
    }

    return serializePayment(refreshed);
  },
};

export default collectionPaymentService;
