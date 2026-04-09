import translationService from '../services/translationService.js';

export async function translateText(req, res, next) {
  try {
    const data = await translationService.translate(req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
