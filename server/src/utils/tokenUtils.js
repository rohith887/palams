/**
 * PBLMS — JWT Token Utilities (Server-Side)
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Provides token signing and verification functions using the
 * secrets and expiry from config/jwt.js.
 *
 * Functions:
 *   - signAccessToken(payload)   — Signs a JWT access token with userId, role, fullName
 *   - signRefreshToken(payload)  — Signs a JWT refresh token with userId, tokenId
 *   - verifyAccessToken(token)   — Verifies and decodes an access token
 *   - verifyRefreshToken(token)  — Verifies and decodes a refresh token
 *
 * SECURITY:
 *   - Never log token values
 *   - Distinguish TokenExpiredError from JsonWebTokenError
 *   - Secrets are loaded from environment variables
 */

const jwt = require('jsonwebtoken');
const { accessTokenConfig, refreshTokenConfig } = require('../config/jwt');
const logger = require('./logger');

/**
 * Sign a JWT access token.
 *
 * @param {{ userId: number, role: string, fullName: string }} payload
 * @returns {string} Signed JWT access token
 */
function signAccessToken({ userId, role, fullName }) {
  if (!userId || !role || !fullName) {
    throw new Error('signAccessToken requires userId, role, and fullName');
  }

  return jwt.sign(
    { userId, role, fullName },
    accessTokenConfig.secret,
    { expiresIn: accessTokenConfig.expiresIn },
  );
}

/**
 * Sign a JWT refresh token.
 *
 * @param {{ userId: number, tokenId: string }} payload
 * @returns {string} Signed JWT refresh token
 */
function signRefreshToken({ userId, tokenId }) {
  if (!userId || !tokenId) {
    throw new Error('signRefreshToken requires userId and tokenId');
  }

  return jwt.sign(
    { userId, tokenId },
    refreshTokenConfig.secret,
    { expiresIn: refreshTokenConfig.expiresIn },
  );
}

/**
 * Verify and decode a JWT access token.
 * Throws specific errors for expired vs. invalid tokens.
 *
 * @param {string} token — Raw JWT access token
 * @returns {{ userId: number, role: string, fullName: string }} Decoded payload
 * @throws {Error} TOKEN_EXPIRED if the token has expired
 * @throws {Error} TOKEN_INVALID if the token is malformed or tampered
 */
function verifyAccessToken(token) {
  if (!token) {
    const err = new Error('Access token is required');
    err.code = 'TOKEN_INVALID';
    throw err;
  }

  try {
    return jwt.verify(token, accessTokenConfig.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const expiredErr = new Error('Access token has expired');
      expiredErr.code = 'TOKEN_EXPIRED';
      throw expiredErr;
    }
    const invalidErr = new Error('Access token is invalid');
    invalidErr.code = 'TOKEN_INVALID';
    throw invalidErr;
  }
}

/**
 * Verify and decode a JWT refresh token.
 * Throws specific errors for expired vs. invalid tokens.
 *
 * @param {string} token — Raw JWT refresh token
 * @returns {{ userId: number, tokenId: string }} Decoded payload
 * @throws {Error} TOKEN_EXPIRED if the token has expired
 * @throws {Error} TOKEN_INVALID if the token is malformed or tampered
 */
function verifyRefreshToken(token) {
  if (!token) {
    const err = new Error('Refresh token is required');
    err.code = 'TOKEN_INVALID';
    throw err;
  }

  try {
    return jwt.verify(token, refreshTokenConfig.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const expiredErr = new Error('Refresh token has expired');
      expiredErr.code = 'TOKEN_EXPIRED';
      throw expiredErr;
    }
    const invalidErr = new Error('Refresh token is invalid');
    invalidErr.code = 'TOKEN_INVALID';
    throw invalidErr;
  }
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};