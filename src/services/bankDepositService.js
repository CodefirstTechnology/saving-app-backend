import bankDepositRepository from '../repositories/bankDepositRepository.js';
import reconciliationService from './reconciliationService.js';
import notificationService from './notificationService.js';
import { publicUrlForPath } from '../utils/publicUrl.js';
import { AppError } from '../middlewares/errorHandler.js';
import { canManageGroup } from '../constants/roles.js';

function serializeDeposit(d) {
  const proofPath = d.proof_relative_path;
  return {
    id: d.id,
    groupId: d.group_id,
    amount: String(d.amount),
    depositDate: d.deposit_date,
    bankName: d.bank_name,
    depositMethod: d.deposit_method,
    proofRelativePath: proofPath,
    proofUrl: publicUrlForPath(proofPath),
    status: d.status,
    submittedByUserId: d.submitted_by_user_id,
    createdAt: d.created_at,
  };
}

const bankDepositService = {
  serializeDeposit,

  async create(user, groupId, body) {
    if (!canManageGroup(user)) throw new AppError(403, 'Insufficient permissions');
    if (!groupId) throw new AppError(400, 'groupId missing');
    const amount = Number(body.amount);
    if (amount <= 0) throw new AppError(400, 'Amount must be positive');
    if (!body.depositDate) throw new AppError(400, 'depositDate is required');
    if (!body.bankName || String(body.bankName).trim().length < 2) {
      throw new AppError(400, 'bankName is required');
    }
    const method = body.depositMethod;
    if (!['cash', 'upi', 'bank_transfer'].includes(method)) {
      throw new AppError(400, 'Invalid deposit method');
    }
    const proofRelativePath = body.proofRelativePath;
    if (!proofRelativePath || String(proofRelativePath).trim().length < 4) {
      throw new AppError(400, 'Deposit proof is required');
    }

    const row = await bankDepositRepository.create({
      group_id: groupId,
      amount,
      deposit_date: body.depositDate,
      bank_name: String(body.bankName).trim(),
      deposit_method: method,
      proof_relative_path: String(proofRelativePath).trim(),
      submitted_by_user_id: user.id,
      status: 'deposit_submitted',
    });

    const rec = await reconciliationService.getReconciliation(groupId);

    await notificationService.notifyAllUsersInGroup(groupId, {
      category: 'deposit_submitted',
      title: 'Bank deposit recorded',
      body: `A deposit of ₹${amount} was submitted for ${row.deposit_date}.`,
      payload: { bankDepositId: row.id },
    });

    if (rec.state === 'verified') {
      await notificationService.notifyAllUsersInGroup(groupId, {
        category: 'deposit_verified',
        title: 'Deposit verified',
        body: 'Total collected and total deposited are in balance.',
        payload: { bankDepositId: row.id, state: rec.state },
      });
    } else if (rec.state === 'partial') {
      await notificationService.notifyAllUsersInGroup(groupId, {
        category: 'deposit_partial',
        title: 'Partial reconciliation',
        body: `₹${rec.pendingDepositAmount} is still pending deposit to match collections.`,
        payload: { bankDepositId: row.id, pendingDepositAmount: rec.pendingDepositAmount },
      });
    } else if (rec.state === 'mismatch') {
      await notificationService.notifyAllUsersInGroup(groupId, {
        category: 'deposit_mismatch',
        title: 'Deposit mismatch',
        body: 'Recorded deposits exceed collected payments. Please review immediately.',
        payload: { bankDepositId: row.id },
      });
    }

    return serializeDeposit(row);
  },

  async list(user, groupId) {
    if (!groupId) throw new AppError(400, 'groupId missing');
    const rows = await bankDepositRepository.listByGroup(groupId, { limit: 100 });
    return rows.map(serializeDeposit);
  },
};

export default bankDepositService;
