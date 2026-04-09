import collectionPaymentService from '../services/collectionPaymentService.js';
import bankDepositService from '../services/bankDepositService.js';
import reconciliationService from '../services/reconciliationService.js';

export async function submitPayment(req, res, next) {
  try {
    const data = await collectionPaymentService.submit(req.user, req.body, req.groupScopeId);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listPayments(req, res, next) {
  try {
    const data = await collectionPaymentService.list(req.user, req.query, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function confirmPayment(req, res, next) {
  try {
    const data = await collectionPaymentService.confirm(req.user, req.params.id, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function rejectPayment(req, res, next) {
  try {
    const data = await collectionPaymentService.reject(req.user, req.params.id, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function transparency(req, res, next) {
  try {
    const data = await reconciliationService.getTransparency(req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listDeposits(req, res, next) {
  try {
    const data = await bankDepositService.list(req.user, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function createDeposit(req, res, next) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Deposit proof file is required' });
      return;
    }
    const relative = `/uploads/deposits/${req.file.filename}`;
    const body = {
      amount: Number(req.body.amount),
      depositDate: req.body.depositDate,
      bankName: req.body.bankName,
      depositMethod: req.body.depositMethod,
      proofRelativePath: relative,
    };
    const data = await bankDepositService.create(req.user, req.groupScopeId, body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
