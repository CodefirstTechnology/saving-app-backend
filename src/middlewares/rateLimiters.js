import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import env from '../config/env.js';
import logger from '../utils/logger.js';

let redisClient;
let redisConnectPromise;

async function getRedisClient() {
  if (!env.redisUrl) return null;
  if (redisClient?.isOpen) return redisClient;
  if (!redisConnectPromise) {
    redisClient = createClient({ url: env.redisUrl });
    redisClient.on('error', (e) => logger.warn('Redis rate-limit client error', e.message));
    redisConnectPromise = redisClient
      .connect()
      .then(() => redisClient)
      .catch((e) => {
        logger.warn('Redis connect failed; using in-memory rate limits', e.message);
        redisClient = null;
        redisConnectPromise = null;
        return null;
      });
  }
  return redisConnectPromise;
}

function deviceKey(req) {
  return req.get('x-device-id') || 'none';
}

export async function buildApiRateLimiters() {
  const client = await getRedisClient();

  const store = client
    ? new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
        prefix: 'rl:api:',
      })
    : undefined;

  const authStore = client
    ? new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
        prefix: 'rl:auth:',
      })
    : undefined;

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${deviceKey(req)}`,
    skip: (req) => req.method === 'OPTIONS',
  });

  const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    keyGenerator: (req) => {
      const uid = req.user?.id || 'anon';
      return `${ipKeyGenerator(req.ip)}:${deviceKey(req)}:${uid}`;
    },
    skip: (req) => req.method === 'OPTIONS',
  });

  const authStrictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    store: authStore,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${deviceKey(req)}`,
    skip: (req) => req.method === 'OPTIONS',
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: authStore,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${deviceKey(req)}`,
    skip: (req) => req.method === 'OPTIONS',
  });

  return { globalLimiter, sensitiveLimiter, authStrictLimiter, loginLimiter };
}
