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

validateEnv();

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
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

async function start() {
  try {
    await connectDb();
    logger.info('MongoDB connection established');
  } catch (e) {
    logger.error('Unable to connect to database', e.message);
    process.exit(1);
  }

  const limiters = await buildApiRateLimiters();
  app.use(prefix, limiters.globalLimiter, optionalRequestSigning, createV1Router(limiters));

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(env.port, () => {
    logger.info(`API listening on port ${env.port} ${prefix}`);
  });
}

start();

export default app;
