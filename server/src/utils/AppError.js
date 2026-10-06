/**
 * PBLMS — Application Error Class
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Custom Error class for structured application errors.
 * Extends the native Error with properties:
 *   - statusCode: HTTP status code for the response
 *   - errorCode:  Structured error code (e.g., 'BIN_NOT_FOUND')
 *   - message:    Human-readable error message
 *
 * Used by services, controllers, and middleware to throw structured errors
 * that the global error handler can process consistently.
 */

class AppError extends Error {
  /**
   * @param {number} statusCode — HTTP status code (e.g., 404, 409, 500)
   * @param {string} errorCode  — Structured error code (e.g., 'BIN_NOT_FOUND')
   * @param {string} message    — Human-readable error message
   */
  constructor(statusCode, errorCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = 'AppError';

    // Capture stack trace, excluding constructor from trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;