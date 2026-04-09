import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/** Access JWT (Bearer). Short-lived; use refresh token to obtain a new access token. */
export function signAccessToken(payload) {
  return jwt.sign({ ...payload, typ: 'access' }, env.jwtSecret, { expiresIn: env.jwtAccessExpiresIn });
}

/** @deprecated use signAccessToken */
export function signToken(payload) {
  return signAccessToken(payload);
}

export function verifyToken(token) {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (decoded.typ && decoded.typ !== 'access') {
    const err = new Error('Invalid token type');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return decoded;
}
