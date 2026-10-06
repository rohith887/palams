/**
 * PBLMS — Authorization Middleware (Role-Based Access Control)
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Factory function that returns Express middleware enforcing role-based
 * access. Must be called AFTER authenticate middleware in the chain.
 *
 * Checks req.user.role against the allowed roles. If the user's role
 * is not permitted, throws an AppError with HTTP 403 RBAC_FORBIDDEN.
 *
 * Usage:
 *   router.post('/loading/start', authenticate, authorize('Loader'), handler);
 *   router.get('/admin/users', authenticate, authorize('Administrator'), handler);
 *
 * Design Spec Reference: Section 11.1, Section 12.2 (Dual-layer RBAC)
 */

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Factory function — returns middleware that checks the user's role.
 *
 * @param {...string} allowedRoles — One or more roles permitted for this route
 * @returns {Function} Express middleware
 */
function authorize(...allowedRoles) {
  return (req, _res, next) => {
    try {
      // authenticate must have been called first
      if (!req.user) {
        throw new AppError(401, 'AUTH_UNAUTHORIZED', 'Authentication required before authorization');
      }

      const userRole = req.user.role;

      if (!userRole) {
        throw new AppError(403, 'RBAC_FORBIDDEN', 'User has no assigned role');
      }

      // Check if user's role is in the allowed list
      if (!allowedRoles.includes(userRole)) {
        logger.warn(`RBAC denied: ${userRole} attempted access to restricted route`, {
          requestId: req.requestId,
          userId: req.user.userId,
          userRole,
          allowedRoles,
          method: req.method,
          url: req.originalUrl,
        });

        throw new AppError(403, 'RBAC_FORBIDDEN', 'Insufficient permissions');
      }

      // Role is authorized
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = authorize;