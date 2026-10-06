/**
 * PBLMS — JWT Configuration
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Exports JWT signing/verification configuration for access and refresh tokens.
 * Secrets must be set via environment variables — the server refuses to start
 * in production if secrets are absent or are placeholder values.
 *
 * Required Environment Variables:
 *   JWT_ACCESS_SECRET   — HS256 signing secret for access tokens (min 256 bits)
 *   JWT_REFRESH_SECRET  — HS256 signing secret for refresh tokens (min 256 bits)
 *   JWT_ACCESS_EXPIRY   — Access token TTL (default: '8h')
 *   JWT_REFRESH_EXPIRY  — Refresh token TTL (default: '24h')
 *
 * SECURITY: Secrets must never be hardcoded.
 */

const logger = require('../utils/logger');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Validate secrets in production — refuse to start if absent or still using placeholders
if (process.env.NODE_ENV === 'production') {
  if (
    !JWT_ACCESS_SECRET ||
    JWT_ACCESS_SECRET === 'replace_with_256bit_random_secret' ||
    JWT_ACCESS_SECRET === 'dev_access_secret_minimum_256_bits_do_not_use_in_production'
  ) {
    logger.error('JWT_ACCESS_SECRET is not configured for production');
    process.exit(1);
  }
  if (
    !JWT_REFRESH_SECRET ||
    JWT_REFRESH_SECRET === 'replace_with_256bit_random_secret' ||
    JWT_REFRESH_SECRET === 'dev_refresh_secret_minimum_256_bits_do_not_use_in_production'
  ) {
    logger.error('JWT_REFRESH_SECRET is not configured for production');
    process.exit(1);
  }
}

const accessTokenConfig = {
  secret: JWT_ACCESS_SECRET || 'pblms_dev_access_secret_fallback_do_not_use_in_production',
  expiresIn: process.env.JWT_ACCESS_EXPIRY || '8h',
};

const refreshTokenConfig = {
  secret: JWT_REFRESH_SECRET || 'pblms_dev_refresh_secret_fallback_do_not_use_in_production',
  expiresIn: process.env.JWT_REFRESH_EXPIRY || '24h',
};

module.exports = {
  accessTokenConfig,
  refreshTokenConfig,
};