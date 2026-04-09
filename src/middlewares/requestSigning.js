import env from '../config/env.js';
import { verifyRequestSignature } from '../utils/requestSignature.js';

const SIGN_HEADER = 'x-app-signature';
const TS_HEADER = 'x-app-timestamp';

/**
 * When API_REQUEST_SIGNING_SECRET is set, requires HMAC headers on mutating API calls.
 * Skips: health, auth/bootstrap, auth/login, auth/refresh (bootstrap/login have their own rate limits).
 */
export function optionalRequestSigning(req, res, next) {
  if (!env.apiRequestSigningSecret) {
    return next();
  }
  const p = req.path || '';
  if (p.endsWith('/health')) return next();
  if (
    p.endsWith('/auth/bootstrap') ||
    p.endsWith('/auth/login') ||
    p.endsWith('/auth/refresh') ||
    p.endsWith('/auth/register-admin')
  ) {
    return next();
  }
  const method = req.method || 'GET';
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }
  /** Multipart deposit upload has no JSON raw body for HMAC. */
  if (method === 'POST' && p.includes('/collection/deposits')) {
    return next();
  }
  try {
    const raw = req.rawBody;
    if (!Buffer.isBuffer(raw)) {
      return next(new Error('Request signing requires raw body (express.json verify callback)'));
    }
    let path = req.path || '/';
    const prefix = (env.apiPrefix || '/api/v1').replace(/\/$/, '');
    if (prefix && path.startsWith(prefix)) {
      path = path.slice(prefix.length) || '/';
    }
    verifyRequestSignature({
      secret: env.apiRequestSigningSecret,
      method,
      path,
      rawBodyBuffer: raw,
      timestampHeader: req.get(TS_HEADER),
      signatureHeader: req.get(SIGN_HEADER),
    });
    next();
  } catch (e) {
    next(e);
  }
}
