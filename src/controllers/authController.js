import authService from '../services/authService.js';

export async function bootstrap(req, res, next) {
  try {
    const { device_id, ...rest } = req.body;
    const result = await authService.registerBootstrap(rest, { device_id });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const { device_id, ...credentials } = req.body;
    const result = await authService.login(credentials, { device_id });
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function registerAdmin(req, res, next) {
  try {
    const { device_id, ...body } = req.body;
    const result = await authService.registerAdmin(body, { device_id });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logout(req.body);
    res.json({ success: true, data: { ok: true } });
  } catch (e) {
    next(e);
  }
}

