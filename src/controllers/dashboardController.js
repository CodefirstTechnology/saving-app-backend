import dashboardService from '../services/dashboardService.js';

export async function summary(req, res, next) {
  try {
    const data = await dashboardService.summary(req.user, req.groupScopeId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
