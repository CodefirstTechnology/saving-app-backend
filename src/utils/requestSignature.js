import crypto from 'crypto';
import { AppError } from '../middlewares/errorHandler.js';

const CLOCK_SKEW_MS = 60_000;
const MAX_BODY_BYTES = 1_048_576;

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/**
 * Canonical string: METHOD \n PATH \n TIMESTAMP \n SHA256(body)
 * PATH is req.path (no query) so proxies cannot swap query ordering.
 */
export function buildSigningPayload(method, path, timestampMs, bodySha256Hex) {
  return `${String(method).toUpperCase()}\n${path}\n${timestampMs}\n${bodySha256Hex}`;
}

export function computeHmacSignature(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

export function verifyRequestSignature({
  secret,
  method,
  path,
  rawBodyBuffer,
  timestampHeader,
  signatureHeader,
}) {
  if (!secret) return { ok: true, skipped: true };
  if (!timestampHeader || !signatureHeader) {
    throw new AppError(401, 'Missing request signature headers');
  }
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) {
    throw new AppError(401, 'Invalid signature timestamp');
  }
  const now = Date.now();
  if (Math.abs(now - ts) > CLOCK_SKEW_MS) {
    throw new AppError(401, 'Signature timestamp out of range');
  }
  if (rawBodyBuffer.length > MAX_BODY_BYTES) {
    throw new AppError(413, 'Body too large for signed request');
  }
  const bodySha = crypto.createHash('sha256').update(rawBodyBuffer).digest('hex');
  const payload = buildSigningPayload(method, path, String(ts), bodySha);
  const expected = computeHmacSignature(secret, payload);
  if (!timingSafeEqual(expected, signatureHeader)) {
    throw new AppError(401, 'Invalid request signature');
  }
  return { ok: true, skipped: false };
}
