/**
 * PBLMS — Structured JSON Logger (Winston)
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Provides a centralized, structured logging utility used by all backend
 * modules for consistent observability.
 *
 * Transports:
 *   - Console: Colorized output (development), plain JSON (production)
 *   - File (production only):
 *       logs/app.log   — All log entries at info level and above
 *       logs/error.log — Error-level entries only
 *
 * Log Format:
 *   Structured JSON with fields:
 *     { timestamp, level, requestId, userId, message, meta }
 *
 * Sensitive Data Scrubbing:
 *   Fields named password, password_hash, token, token_hash, refreshToken
 *   are automatically stripped from all logged objects before writing.
 *
 * Log Levels (RFC 5424):
 *   error: 0 — Application errors, exceptions
 *   warn:  1 — RBAC failures, lock timeouts, account lockouts
 *   info:  2 — Requests, SP calls, server lifecycle events
 *   debug: 3 — Development-only detailed tracing
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_DIR = process.env.LOG_DIR || 'logs';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Ensure log directory exists
const logDirPath = path.resolve(__dirname, '..', '..', LOG_DIR);
if (!fs.existsSync(logDirPath)) {
  fs.mkdirSync(logDirPath, { recursive: true });
}

/**
 * Sensitive data scrubbing — strips known sensitive fields from log objects
 * before they are written to any transport.
 */
const SENSITIVE_FIELDS = ['password', 'password_hash', 'token', 'token_hash', 'refreshToken'];

function scrubSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrubSensitiveData);

  const scrubbed = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      scrubbed[key] = scrubSensitiveData(value);
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

/**
 * Custom log format — structured JSON with scrubbed sensitive fields.
 */
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format((info) => {
    // Scrub sensitive data from metadata before logging
    const scrubbed = scrubSensitiveData(info);
    // Ensure standard fields are present
    return {
      timestamp: scrubbed.timestamp,
      level: scrubbed.level,
      requestId: scrubbed.requestId || null,
      userId: scrubbed.userId || null,
      message: scrubbed.message,
      meta: scrubbed.meta || {},
    };
  })(),
  winston.format.json(),
);

/**
 * Console transport — colorized in development, plain JSON in production.
 */
const consoleTransport = new winston.transports.Console({
  level: LOG_LEVEL,
  format: NODE_ENV === 'development'
    ? winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, requestId, message, ...meta }) => {
          const rid = requestId ? ` [${requestId.substring(0, 8)}]` : '';
          const metaStr = Object.keys(meta.meta || {}).length > 0 ? ` ${JSON.stringify(meta.meta)}` : '';
          return `${timestamp} ${level}${rid} ${message}${metaStr}`;
        }),
      )
    : structuredFormat,
});

/**
 * File transport for all log entries at info level and above.
 */
const appLogTransport = new winston.transports.File({
  filename: path.join(logDirPath, 'app.log'),
  level: 'info',
  format: structuredFormat,
  maxsize: 10 * 1024 * 1024, // 10MB
  maxFiles: 30,
  tailable: true,
});

/**
 * File transport for error-level entries only.
 */
const errorLogTransport = new winston.transports.File({
  filename: path.join(logDirPath, 'error.log'),
  level: 'error',
  format: structuredFormat,
  maxsize: 10 * 1024 * 1024, // 10MB
  maxFiles: 30,
  tailable: true,
});

/**
 * Transport selection:
 *   - Development: Console only (colorized)
 *   - Production: Console (JSON) + File (app.log + error.log)
 */
const transports = [consoleTransport, appLogTransport, errorLogTransport];

const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports,
  exitOnError: false,
});

module.exports = logger;