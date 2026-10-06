/**
 * PBLMS — Health Check Controller
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Thin controller — extracts no parameters, calls service-level checks,
 * and returns the standard response envelope.
 *
 * Design Spec Reference: Section 8.15
 */

const path = require('path');
const { success } = require('../utils/responseBuilder');
const { checkDatabaseConnection } = require('../config/database');
const logger = require('../utils/logger');

// Read version once at startup from package.json
let cachedVersion = null;
try {
  const pkg = require(path.resolve(__dirname, '..', '..', 'package.json'));
  cachedVersion = pkg.version;
} catch {
  cachedVersion = '0.0.0';
}

/**
 * GET /api/health
 *
 * Public endpoint — no authentication required.
 * Returns system status, database connectivity, version, uptime, and timestamp.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getHealth(_req, res, next) {
  try {
    const dbConnected = await checkDatabaseConnection();
    const status = dbConnected ? 'ok' : 'degraded';

    const healthData = {
      status,
      dbConnected,
      version: cachedVersion,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    res.status(200).json(success(healthData));
  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    next(err);
  }
}

module.exports = { getHealth };