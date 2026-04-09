import { ZodError } from 'zod';
import { AppError } from './errorHandler.js';

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return next(new AppError(400, 'Validation failed', e.flatten()));
      }
      next(e);
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return next(new AppError(400, 'Validation failed', e.flatten()));
      }
      next(e);
    }
  };
}
