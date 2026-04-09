import transactionService from '../services/transactionService.js';

export async function list(req, res, next) {
  try {
    const data = await transactionService.list(req.user, req.query, req.groupScopeId);
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
}

export async function savings(req, res, next) {
  try {
    const data = await transactionService.createSavings(req.user, req.body, req.groupScopeId);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function ledgerEntry(req, res, next) {
  try {
    const data = await transactionService.createLedgerEntry(req.user, req.body, req.groupScopeId);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function ledgerSummary(req, res, next) {
  try {
    const data = await transactionService.ledgerSummary(req.user, req.query, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
