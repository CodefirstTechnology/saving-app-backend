import collectionPaymentRepository from '../repositories/collectionPaymentRepository.js';
import bankDepositRepository from '../repositories/bankDepositRepository.js';
import { publicUrlForPath } from '../utils/publicUrl.js';

const EPS = 0.005;

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeekUtc() {
  const d = startOfToday();
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

const reconciliationService = {
  /**
   * Compares sum of admin-confirmed collection payments vs sum of bank deposit entries.
   */
  async getReconciliation(groupId) {
    const totalCollected = round2(await collectionPaymentRepository.sumCollected(groupId));
    const totalDeposited = round2(await bankDepositRepository.sumDeposited(groupId));
    const diff = round2(totalCollected - totalDeposited);

    let state = 'verified';
    if (Math.abs(diff) < EPS) state = 'verified';
    else if (diff > EPS) state = 'partial';
    else state = 'mismatch';

    const pendingDepositAmount = diff > EPS ? diff : 0;

    let blockReason = null;
    if (state === 'partial') {
      blockReason = 'Collected savings exceed recorded bank deposits. Record a matching deposit before loans can proceed.';
    } else if (state === 'mismatch') {
      blockReason = 'Bank deposits exceed collected payments. Reconcile records before loans can proceed.';
    }

    return {
      totalCollected: String(totalCollected),
      totalDeposited: String(totalDeposited),
      difference: String(diff),
      pendingDepositAmount: String(round2(pendingDepositAmount)),
      state,
      blockLoans: state !== 'verified',
      blockReason,
    };
  },

  async getLedgerTotals(groupId) {
    const dayStart = startOfToday();
    const dayEnd = endOfToday();
    const weekStart = startOfWeekUtc();
    const monthStart = startOfMonth();

    const [daily, weekly, monthly, allTime] = await Promise.all([
      collectionPaymentRepository.sumCollectedBetween(groupId, dayStart, dayEnd),
      collectionPaymentRepository.sumCollectedBetween(groupId, weekStart, dayEnd),
      collectionPaymentRepository.sumCollectedBetween(groupId, monthStart, dayEnd),
      collectionPaymentRepository.sumCollected(groupId),
    ]);

    return {
      dailyTotal: String(round2(daily)),
      weeklyTotal: String(round2(weekly)),
      monthlyTotal: String(round2(monthly)),
      expectedDepositAmount: String(round2(allTime)),
    };
  },

  async getDepositAlerts(groupId) {
    const rec = await this.getReconciliation(groupId);
    const alerts = [];
    if (rec.state === 'partial') {
      alerts.push({
        code: 'pending_deposit',
        message: `₹${rec.pendingDepositAmount} collected is not yet matched by bank deposits.`,
      });
    }
    if (rec.state === 'mismatch') {
      alerts.push({
        code: 'fund_mismatch',
        message: 'Recorded deposits are higher than total collected payments. Review deposit entries.',
      });
    }

    const reminderDays = Number(process.env.COLLECTION_DEPOSIT_REMINDER_DAYS) || 7;
    const last = await bankDepositRepository.findLatest(groupId);
    const collected = Number(rec.totalCollected);
    const deposited = Number(rec.totalDeposited);
    if (collected > EPS && collected - deposited > EPS && last?.created_at) {
      const ageMs = Date.now() - new Date(last.created_at).getTime();
      if (ageMs > reminderDays * 86400000) {
        alerts.push({
          code: 'stale_deposit',
          message: `No recent bank deposit recorded in ${reminderDays}+ days while funds are pending deposit.`,
        });
      }
    }

    return { reconciliation: rec, alerts };
  },

  async getTransparency(groupId) {
    const rec = await this.getReconciliation(groupId);
    const ledgerTotals = await this.getLedgerTotals(groupId);
    const { alerts } = await this.getDepositAlerts(groupId);
    const rows = await bankDepositRepository.listByGroup(groupId, { limit: 25 });
    const recentDeposits = rows.map((d) => ({
      id: d.id,
      amount: String(d.amount),
      depositDate: d.deposit_date,
      bankName: d.bank_name,
      depositMethod: d.deposit_method,
      proofUrl: publicUrlForPath(d.proof_relative_path),
      createdAt: d.created_at,
    }));
    return {
      reconciliation: rec,
      ledgerTotals,
      alerts,
      recentDeposits,
    };
  },
};

export default reconciliationService;
