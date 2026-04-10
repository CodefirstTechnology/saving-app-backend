import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env, { validateEnv } from './config/env.js';
import { connectDb } from './config/database.js';
import './models/index.js';
import createV1Router from './routes/v1/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import logger from './utils/logger.js';
import { optionalRequestSigning } from './middlewares/requestSigning.js';
import { buildApiRateLimiters } from './middlewares/rateLimiters.js';
import { getCorsOriginOption } from './config/cors.js';

validateEnv();

const app = express();
app.set('trust proxy', 1);
app.use(
  helmet({
    /** Default `same-origin` can confuse some cross-origin clients; public JSON API is fine with cross-origin. */
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({ origin: getCorsOriginOption() }));
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  })
);
app.use(morgan('combined'));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const prefix = env.apiPrefix;

/** Browsers hit `/` and `/favicon.ico` — API lives under `prefix`; this avoids a confusing JSON 404. */
app.get('/', (_req, res) => {
  const base = prefix.replace(/\/$/, '');
  res.json({
    success: true,
    data: {
      service: 'bachat-pragati-api',
      health: `${base}/health`,
      hint: 'Use the mobile app with EXPO_PUBLIC_API_URL ending in /api/v1 (or open /api/v1/health).',
    },
  });
});

/**
 * Vercel/serverless: the exported `app` must register routes at load time. The old pattern
 * (`start()` awaited MongoDB then mounted routes) meant the first requests often hit an app
 * with no `/api/v1` routes → Express "Cannot GET /api/v1/..." 404s.
 */
const limiters = await buildApiRateLimiters();

/** Resolved when the first connect attempt finishes; never rejects (avoids UnhandledRejection / Vercel exit 1). */
let mongoConnectError = null;
const mongoReady = connectDb()
  .then(() => {
    logger.info('MongoDB connection established');
    mongoConnectError = null;
  })
  .catch((e) => {
    mongoConnectError = e;
    logger.error('Unable to connect to database', e.message);
  });

async function ensureMongo(req, res, next) {
  await mongoReady;
  if (mongoConnectError) {
    return next(mongoConnectError);
  }
  next();
}

app.use(prefix, ensureMongo, limiters.globalLimiter, optionalRequestSigning, createV1Router(limiters));

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  if (process.env.VERCEL) {
    return;
  }
  await mongoReady;
  if (mongoConnectError) {
    process.exit(1);
  }
  app.listen(env.port, () => {
    logger.info(`API listening on port ${env.port} ${prefix}`);
  });
}

startServer();

export default app;
