import env from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';

const MAX_CHARS = 2000;

async function googleTranslate(text, source, target) {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(env.googleTranslateApiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source, target, format: 'text' }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || json?.error?.errors?.[0]?.message || 'Google Translate error';
    throw new AppError(res.status === 403 || res.status === 400 ? 502 : 502, msg);
  }
  const out = json?.data?.translations?.[0]?.translatedText;
  if (typeof out !== 'string') throw new AppError(502, 'Invalid translation response');
  return out;
}

async function myMemoryTranslate(text, source, target) {
  const pair = `${source}|${target}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (json.responseStatus !== 200) {
    throw new AppError(502, json.responseDetails || 'Translation service unavailable');
  }
  const out = json.responseData?.translatedText;
  if (typeof out !== 'string') throw new AppError(502, 'Invalid translation response');
  return out;
}

const translationService = {
  async translate({ text, from, to }) {
    const trimmed = String(text ?? '').trim();
    if (!trimmed) return { translatedText: '' };
    if (trimmed.length > MAX_CHARS) {
      throw new AppError(400, `Text must be at most ${MAX_CHARS} characters`);
    }
    if (from === to) return { translatedText: trimmed };

    if (env.googleTranslateApiKey) {
      const translatedText = await googleTranslate(trimmed, from, to);
      return { translatedText };
    }

    try {
      const translatedText = await myMemoryTranslate(trimmed, from, to);
      return { translatedText };
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(502, 'Translation failed');
    }
  },
};

export default translationService;
