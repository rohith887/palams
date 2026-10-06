/**
 * PBLMS — Request Body Size Limit Middleware
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Enforces body size limits:
 *   - 1MB for general JSON endpoints
 *   - 10MB for file upload endpoints
 *
 * Design Spec Reference: Section 12.3
 */

const GENERAL_LIMIT = '1mb';
const UPLOAD_LIMIT = '10mb';

/**
 * Express middleware that sets a 1MB body size limit for general endpoints.
 * Installed as the body parser middleware in app.js.
 */
const generalLimit = (req, _res, next) => {
  // The limit is enforced by express.json() in app.js.
  // This middleware is a no-op placeholder for documentation and future
  // per-route overrides.
  next();
};

module.exports = { generalLimit, GENERAL_LIMIT, UPLOAD_LIMIT };