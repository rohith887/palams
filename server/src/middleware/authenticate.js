/**
 * PBLMS — Authentication Middleware
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Extracts the Bearer token from the Authorization header, verifies the
 * JWT access token, and attaches the decoded user payload to req.user.
 *
 * On failure, throws an AppError with the appropriate HTTP status:
 *   - Missing token → 401 AUTH_UNAUTHORIZED
 *   - Expired token → 401 AUTH_UNAUTHORIZED (TOKEN_EXPIRED)
 *   - Invalid/tampered token → 401 AUTH_UNAUTHORIZED (TOKEN_INVALID)
 *
 * Design Spec Reference: Section 11.1 (position before authorize)
 */

const { verifyAccessToken } = require('../utils/tokenUtils');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Express middleware — verifies JWT access token and attaches req.user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticate(req, res, next) {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    console.log('[authenticate] METHOD:', req.method, 'URL:', req.originalUrl);
    console.log('[authenticate] authHeader present:', !!authHeader, 'first 60:', authHeader?.substring(0, 60));

    if (!authHeader) {
      throw new AppError(401, 'AUTH_UNAUTHORIZED', 'Authentication required');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'AUTH_UNAUTHORIZED', 'Invalid authorization format');
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw new AppError(401, 'AUTH_UNAUTHORIZED', 'Access token is missing');
    }

    // Verify and decode the JWT
    console.log('[authenticate] calling verifyAccessToken...');
    const decoded = verifyAccessToken(token);
    console.log('[authenticate] verifyAccessToken SUCCESS. userId:', decoded.userId, 'role:', decoded.role);

    // Attach user context to the request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      fullName: decoded.fullName,
    };

    // Attach userId to the logger context for this request
    logger.debug(`Authenticated user: ${decoded.fullName} (${decoded.role})`, {
      requestId: req.requestId,
      userId: decoded.userId,
      role: decoded.role,
    });

    next();
  } catch (err) {
    console.log('[authenticate] VERIFY FAILED. err.name:', err.name, 'err.code:', err.code, 'err.message:', err.message);
    // Pass to the global error handler — AppError instances are recognized
    if (err instanceof AppError) {
      return next(err);
    }

    // Token verification errors from tokenUtils
    if (err.code === 'TOKEN_EXPIRED') {
      return next(new AppError(401, 'AUTH_UNAUTHORIZED', 'Token expired'));
    }

    if (err.code === 'TOKEN_INVALID') {
      return next(new AppError(401, 'AUTH_UNAUTHORIZED', 'Invalid token'));
    }

    // Unknown error — log and return generic 401
    logger.error('Authentication error', {
      requestId: req.requestId,
      error: err.message,
    });
    return next(new AppError(401, 'AUTH_UNAUTHORIZED', 'Authentication failed'));
  }
}

module.exports = authenticate;