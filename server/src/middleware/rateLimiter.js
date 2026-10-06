/**
 * PBLMS — Rate Limiting Middleware
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Limits requests to 200 per window per authenticated user IP.
 * Returns structured 429 error with RATE_LIMIT_EXCEEDED on breach.
 *
 * Required Environment Variables:
 *   RATE_LIMIT_WINDOW_MS — Window duration in ms (default: 900000 = 15 min)
 *   RATE_LIMIT_MAX       — Max requests per window (default: 200)
 */

const rateLimit = require('express-rate-limit');

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX, 10) || 200;

const rateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key by authenticated user ID when available, otherwise by IP
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}`;
    }
    return req.ip;
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      data: null,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
  },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = rateLimiter;