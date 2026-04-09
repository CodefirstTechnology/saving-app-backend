import logger from '../utils/logger.js';

export class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

function validationSummary(details) {
  const fe = details?.fieldErrors;
  if (!fe || typeof fe !== 'object') return null;
  const parts = [];
  for (const [key, msgs] of Object.entries(fe)) {
    if (Array.isArray(msgs) && msgs.length) parts.push(`${key}: ${msgs.join(', ')}`);
  }
  return parts.length ? parts.join(' ') : null;
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.statusCode || 500;
  const v = validationSummary(err.details);
  const body = {
    success: false,
    error: v || err.message || 'Internal Server Error',
    ...(err.details && status === 400 ? { details: err.details } : {}),
  };

  if (status >= 500) {
    logger.error(err.stack || err.message);
  }

  res.status(status).json(body);
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: 'Not Found' });
}
