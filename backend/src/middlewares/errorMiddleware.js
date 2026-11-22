import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

/**
 * Translates known library errors into ApiError so every failure
 * leaves the API with the same JSON shape.
 */
const normalizeError = (err) => {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return new ApiError(400, 'Validation failed', {
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return new ApiError(400, 'Validation failed', {
      code: 'VALIDATION_ERROR',
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return new ApiError(400, `Invalid value for "${err.path}"`, { code: 'INVALID_ID' });
  }

  if (err?.code === 11000) {
    const fields = Object.keys(err.keyPattern ?? {});
    return new ApiError(409, `Duplicate value for: ${fields.join(', ') || 'unique field'}`, {
      code: 'DUPLICATE_KEY',
      details: fields,
    });
  }

  if (err?.name === 'JsonWebTokenError') return ApiError.unauthorized('Invalid token');
  if (err?.name === 'TokenExpiredError') return ApiError.unauthorized('Token expired');

  // body-parser errors
  if (err?.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON body');
  if (err?.type === 'entity.too.large') return new ApiError(413, 'Request body too large', { code: 'PAYLOAD_TOO_LARGE' });

  // Database unreachable
  if (
    err instanceof mongoose.Error.MongooseServerSelectionError ||
    err?.name === 'MongoNetworkError' ||
    err?.name === 'MongoServerSelectionError'
  ) {
    return ApiError.serviceUnavailable('Database is unavailable', { code: 'DATABASE_UNAVAILABLE' });
  }

  return null;
};

// eslint-disable-next-line no-unused-vars
export const errorMiddleware = (err, req, res, _next) => {
  const known = normalizeError(err);
  const apiError = known ?? new ApiError(500, 'Internal server error', { code: 'INTERNAL_ERROR' });

  if (apiError.statusCode >= 500) {
    logger.error({ err, method: req.method, url: req.originalUrl }, 'Request failed');
  } else {
    logger.warn({ code: apiError.code, status: apiError.statusCode, method: req.method, url: req.originalUrl }, apiError.message);
  }

  const body = { success: false, message: apiError.message, code: apiError.code };
  if (apiError.details !== undefined) body.details = apiError.details;
  if (!config.isProduction && !known && err?.stack) body.stack = err.stack;

  res.status(apiError.statusCode).json(body);
};
