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

  const passThrough = (req, res, next) => next();
  return {
    globalLimiter: passThrough,
    sensitiveLimiter: passThrough,
    authStrictLimiter: passThrough,
    loginLimiter: passThrough,
  };
}
