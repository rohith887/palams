/**
 * PBLMS — Centralized Application Logging Service
 * Pharmaceutical Bin Lifecycle Management System
 *
 * All application events flow through this single service, which:
 *   1. Inserts into Application_Log table (database)
 *   2. Writes to Winston (file system — app.log / error.log)
 *
 * Both operations happen in parallel. The database insertion is
 * non-blocking (fire-and-forget with error tolerance) so logging
 * never blocks the main request flow.
 */

const pool = require('../config/database');
const logger = require('../utils/logger');

const LEVELS = ['debug', 'info', 'warn', 'error', 'critical'];

const applicationLogService = {
  /**
   * Log an application event to both database and Winston.
   *
   * @param {Object} params
   * @param {string} params.level       — DEBUG | INFO | WARN | ERROR | CRITICAL
   * @param {string} params.module      — api | auth | workflow | crud | system
   * @param {string} [params.action]    — LOGIN | CREATE_BIN | LOADING_START etc.
   * @param {number} [params.userId]
   * @param {string} [params.username]
   * @param {string} [params.requestId]
   * @param {string} [params.sessionId]
   * @param {string} [params.ipAddress]
   * @param {string} [params.userAgent]
   * @param {string} [params.httpMethod]
   * @param {string} [params.apiPath]
   * @param {number} [params.statusCode]
   * @param {number} [params.durationMs]
   * @param {string} [params.message]
   * @param {string} [params.exception]
   * @param {string} [params.stackTrace]
   * @param {Object} [params.metadata]
   * @returns {Promise<number|null>} log_id if successful, null if DB failed
   */
  async log(params = {}) {
    const {
      level = 'INFO',
      module: mod = 'system',
      action = null,
      userId = null,
      username = null,
      requestId = null,
      sessionId = null,
      ipAddress = null,
      userAgent = null,
      httpMethod = null,
      apiPath = null,
      statusCode = null,
      durationMs = null,
      message = '',
      exception = null,
      stackTrace = null,
      metadata = null,
    } = params;

    // ── 1. Winston (always) ──────────────────────────────────────────────
    const winstonLevel = level.toLowerCase();
    const logFn = LEVELS.includes(winstonLevel) ? logger[winstonLevel] : logger.info;

    logFn.call(logger, message, {
      requestId,
      userId,
      module: mod,
      action,
      username,
      sessionId,
      ipAddress,
      userAgent,
      httpMethod,
      apiPath,
      statusCode,
      durationMs,
      exception,
      meta: metadata || {},
    });

    // ── 2. Database (fire-and-forget, non-blocking) ──────────────────────
    try {
      const [result] = await pool.query(
        `INSERT INTO Application_Log (
          Level, Module, Action,
          User_ID, Username, Request_ID, Session_ID,
          IP_Address, User_Agent, HTTP_Method, API_Path,
          Status_Code, Duration_ms, Message,
          Exception, Stack_Trace, Metadata_JSON
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          level.toUpperCase(), mod, action,
          userId, username, requestId, sessionId,
          ipAddress, userAgent, httpMethod, apiPath,
          statusCode, durationMs, message,
          exception, stackTrace,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );
      return result.insertId;
    } catch (dbErr) {
      // DB logging failure must never break the application.
      // Log the failure to Winston so it appears in file logs.
      logger.error('Failed to insert application log row', {
        error: dbErr.message,
        code: dbErr.code,
        module: mod,
        action,
        requestId,
      });
      return null;
    }
  },

  // ── Convenience methods ────────────────────────────────────────────────

  debug(message, opts = {}) {
    return this.log({ ...opts, level: 'DEBUG', message });
  },
  info(message, opts = {}) {
    return this.log({ ...opts, level: 'INFO', message });
  },
  warn(message, opts = {}) {
    return this.log({ ...opts, level: 'WARN', message });
  },
  error(message, opts = {}) {
    return this.log({ ...opts, level: 'ERROR', message });
  },
  critical(message, opts = {}) {
    return this.log({ ...opts, level: 'CRITICAL', message });
  },

  // ── Domain-specific loggers ────────────────────────────────────────────

  /** Log an HTTP request + response */
  logApiRequest({ method, url, statusCode, durationMs, userId, username, requestId, ipAddress, userAgent }) {
    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    return this.log({
      level,
      module: 'api',
      action: `${method} ${url}`,
      message: `${method} ${url} ${statusCode} ${durationMs}ms`,
      userId,
      username,
      requestId,
      ipAddress,
      userAgent,
      httpMethod: method,
      apiPath: url,
      statusCode,
      durationMs,
    });
  },

  /** Log auth events (login, logout, failed login) */
  logAuth({ action, userId, username, success, requestId, ipAddress, userAgent, metadata }) {
    const level = success ? 'INFO' : 'WARN';
    const message = success
      ? `${action} - ${username || `User #${userId}`}`
      : `${action} FAILED - ${username || `User #${userId}`}`;
    return this.log({
      level,
      module: 'auth',
      action,
      message,
      userId,
      username,
      requestId,
      ipAddress,
      userAgent,
      metadata,
    });
  },

  /** Log workflow events (Loading, Unloading, Cleaning, QA, Bin Registration) */
  logWorkflow({ action, userId, username, binNumber, requestId, metadata }) {
    return this.log({
      level: 'INFO',
      module: 'workflow',
      action,
      message: `${action} - Bin ${binNumber || 'N/A'}`,
      userId,
      username,
      requestId,
      metadata: { ...metadata, binNumber },
    });
  },

  /** Log CRUD operations */
  logCrud({ action, userId, username, entity, entityId, requestId, metadata }) {
    return this.log({
      level: 'INFO',
      module: 'crud',
      action,
      message: `${action} ${entity} #${entityId || ''}`,
      userId,
      username,
      requestId,
      metadata: { ...metadata, entity, entityId },
    });
  },

  /** Log system errors / exceptions */
  logSystemError({ message, exception, stackTrace, userId, requestId, metadata }) {
    return this.log({
      level: 'ERROR',
      module: 'system',
      action: 'EXCEPTION',
      message: message || exception,
      exception,
      stackTrace,
      userId,
      requestId,
      metadata,
    });
  },
};

module.exports = applicationLogService;