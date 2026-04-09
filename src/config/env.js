import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  /** Short-lived access JWT (Bearer). Falls back to JWT_EXPIRES_IN for older deployments. */
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m',
  /** Opaque refresh token TTL stored hashed in DB */
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  /** Optional; when set, /translate uses Google instead of the free MyMemory fallback */
  googleTranslateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY || '',
  /** When set, POST/PATCH/DELETE require X-App-Timestamp + X-App-Signature (HMAC-SHA256) */
  apiRequestSigningSecret: process.env.API_REQUEST_SIGNING_SECRET || '',
  /** e.g. redis://redis:6379 — if unset, rate limiting uses in-memory store */
  redisUrl: process.env.REDIS_URL || '',
};

export function validateEnv() {
  if (env.nodeEnv === 'production' && env.jwtSecret === 'change-me-in-production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}

export default env;
