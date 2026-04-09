import crypto from 'crypto';

export function hashOpaqueToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function generateOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}
