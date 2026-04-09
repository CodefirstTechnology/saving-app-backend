import reconciliationService from './reconciliationService.js';
import { AppError } from '../middlewares/errorHandler.js';

const fundControlService = {
  async assertLoansAllowed(groupId) {
    if (!groupId) return;
    const r = await reconciliationService.getReconciliation(groupId);
    if (r.blockLoans) {
      throw new AppError(403, r.blockReason || 'Loans are paused until fund reconciliation is verified.');
    }
  },
};

export default fundControlService;
