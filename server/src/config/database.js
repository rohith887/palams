/**
 * PBLMS — MySQL Database Connection Pool Configuration
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Creates and exports a production-ready mysql2 connection pool using
 * environment variables. All database access across the entire application
 * flows through this single pool instance.
 *
 * Configuration:
 *   DB_HOST       — MySQL server hostname (default: localhost)
 *   DB_PORT       — MySQL server port (default: 3306)
 *   DB_NAME       — Database name
 *   DB_USER       — Application database user
 *   DB_PASSWORD   — Application database password
 *   DB_POOL_LIMIT — Maximum connections in pool (default: 20)
 *   DB_QUEUE_LIMIT — Maximum queued connection requests (default: 50)
 */

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  database: process.env.DB_NAME || 'pblms',
  user: process.env.DB_USER || 'pblms_app',
  password: process.env.DB_PASSWORD || '',
  connectionLimit: parseInt(process.env.DB_POOL_LIMIT, 10) || 20,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT, 10) || 50,
  waitForConnections: true,
  connectTimeout: 10000,
  acquireTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

const pool = mysql.createPool(poolConfig);

pool.on('connection', () => {
  logger.debug('New database connection established');
});

pool.on('acquire', () => {
  logger.debug('Database connection acquired from pool');
});

pool.on('release', () => {
  logger.debug('Database connection released back to pool');
});

/**
 * Validate database connectivity by executing a minimal query.
 * Used by the health check endpoint and deployment readiness probes.
 *
 * @returns {Promise<boolean>} True if the database is reachable
 */
async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (err) {
    logger.error('Database connectivity check failed', { error: err.message });
    return false;
  }
}

module.exports = pool;
module.exports.checkDatabaseConnection = checkDatabaseConnection;