/**
 * PBLMS — Request Logging Middleware
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Assigns a unique UUID request ID to each incoming request and logs:
 *   1. Request start (method, URL, user-agent, IP)
 *   2. Response completion (status code, duration in ms)
 *
 * Both logs are written to Application_Log (database) AND Winston (file system)
 * via the centralized applicationLogService.
 *
 * Does NOT log sensitive headers (Authorization, Cookie).
 */

const { v4: uuidv4 } = require('uuid');
const applicationLogService = require('../services/applicationLog.service');

function requestLogger(req, res, next) {
  // Assign unique request correlation ID
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Extract user info from authenticated request
  const userId = req.user?.userId || null;
  const username = req.user?.fullName || req.user?.username || null;

  // Log request start
  applicationLogService.logApiRequest({
    method: req.method,
    url: req.originalUrl,
    statusCode: null, // Not yet known
    durationMs: null,
    userId,
    username,
    requestId: req.requestId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  });

  // Capture the original res.end to intercept response completion
  const originalEnd = res.end;

  res.end = function (...args) {
    const durationMs = Date.now() - req.startTime;
    const statusCode = res.statusCode;

    // Re-read user from req inside override (authenticate has run by now)
    const finalUserId = req.user?.userId || null;
    const finalUsername = req.user?.fullName || req.user?.username || null;

    // Log request completion
    applicationLogService.logApiRequest({
      method: req.method,
      url: req.originalUrl,
      statusCode,
      durationMs,
      userId: finalUserId,
      username: finalUsername,
      requestId: req.requestId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    });

    // Call original res.end
    originalEnd.apply(res, args);
  };

  next();
}

module.exports = requestLogger;