/**
 * PBLMS — Global Error Handler Middleware
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Express 4-argument error-handling middleware. Catches all errors thrown
 * in controllers, services, and upstream middleware.
 *
 * Handles:
 *   - AppError instances         → structured response with mapped HTTP status
 *   - MySQL/DB errors            → logged internally; generic 500 to client
 *   - Validation errors (express-validator) → 400 with field-level details
 *   - Uncaught/unknown errors    → 500; stack traces never exposed to clients
 *
 * Design Spec Reference: Section 11.5
 */

const logger = require('../utils/logger');
const { mapErrorCodeToHttpStatus } = require('../utils/errorMapper');

/**
 * Global Express error handler — must be registered LAST in middleware chain.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const requestId = req.requestId || null;
  const userId = req.user ? req.user.userId : null;

  // -------------------------------------------------------------------------
  // 1. AppError — structured application error
  // -------------------------------------------------------------------------
  if (err.name === 'AppError' || err.statusCode) {
    const statusCode = err.statusCode || mapErrorCodeToHttpStatus(err.errorCode);
    const errorCode = err.errorCode || 'INTERNAL_ERROR';
    const message = err.message || 'An unexpected error occurred';

    logger.warn(`AppError: ${errorCode}`, {
      requestId,
      userId,
      errorCode,
      statusCode,
      message,
      method: req.method,
      url: req.originalUrl,
    });

    return res.status(statusCode).json({
      success: false,
      data: null,
      error: { code: errorCode, message },
    });
  }

  // -------------------------------------------------------------------------
  // 2. MySQL / Database errors — log internally, return generic 500 to client
  // -------------------------------------------------------------------------
  if (err.code && (err.code.startsWith('ER_') || err.sqlMessage || err.sqlState)) {
    logger.error(`Database error: ${err.code}`, {
      requestId,
      userId,
      errorCode: err.code,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage,
      method: req.method,
      url: req.originalUrl,
      // Do NOT include full stack — sensitive DB details may be in the stack
    });

    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal server error occurred',
      },
    });
  }

  // -------------------------------------------------------------------------
  // 3. Express-validator validation errors — array of field-level errors
  // -------------------------------------------------------------------------
  if (err.type === 'field' || (err.errors && Array.isArray(err.errors)) || (err.array && typeof err.array === 'function')) {
    const validationErrors = err.array ? err.array() : (err.errors || [err]);

    logger.warn(`Validation error`, {
      requestId,
      userId,
      fieldCount: validationErrors.length,
      method: req.method,
      url: req.originalUrl,
    });

    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        fields: validationErrors.map((e) => ({
          field: e.path || e.param || e.field || 'unknown',
          message: e.msg || e.message || 'Invalid value',
        })),
      },
    });
  }

  // -------------------------------------------------------------------------
  // 4. Uncaught / unknown errors — generic 500, never expose stack traces
  // -------------------------------------------------------------------------
  logger.error(`Unhandled error: ${err.message}`, {
    requestId,
    userId,
    errorType: err.name,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    method: req.method,
    url: req.originalUrl,
  });

  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : err.message || 'An unexpected error occurred';

  return res.status(500).json({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
}

module.exports = errorHandler;