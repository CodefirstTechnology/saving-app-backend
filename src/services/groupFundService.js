import memberRepository from '../repositories/memberRepository.js';
import loanRepository from '../repositories/loanRepository.js';
import transactionRepository from '../repositories/transactionRepository.js';

export function roundMoney(n) {
  return Math.max(0, Math.round(Number(n) * 100) / 100);
}

export async function getGroupFundSnapshot(groupId) {
  const totalSavings = Number(await memberRepository.sumBalance(groupId));
  const outstandingLoans = Number(await loanRepository.sumOutstanding(groupId, ['active', 'overdue']));
  const availableBalance = roundMoney(totalSavings - outstandingLoans);
  const totalRecovered = await transactionRepository.sumAmountWhere(groupId, { category: 'loan_repay', entryType: 'credit' });
  const totalDisbursedFromLedger = await transactionRepository.sumAmountWhere(groupId, {
    category: 'loan_issue',
    entryType: 'debit',
  });
  const interestEarned = await transactionRepository.sumAmountWhere(groupId, { category: 'interest', entryType: 'credit' });
  return {
    totalSavings: String(roundMoney(totalSavings)),
    outstandingActiveLoans: String(roundMoney(outstandingLoans)),
    availableBalance: String(roundMoney(availableBalance)),
    totalRecovered: String(roundMoney(totalRecovered)),
    totalDisbursedFromLedger: String(roundMoney(totalDisbursedFromLedger)),
    interestEarned: String(roundMoney(interestEarned)),
  };
}
