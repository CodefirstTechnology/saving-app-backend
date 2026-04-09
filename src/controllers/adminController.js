import authService from '../services/authService.js';

export async function createAdmin(req, res, next) {
  try {
    const result = await authService.createAdminBySuperAdmin(req.user, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}
