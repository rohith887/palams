/**
 * PBLMS — Error Code to HTTP Status Mapper
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Maps application error codes to HTTP status codes per design spec
 * section 11.5 and section 8.2.
 *
 * All error codes returned by stored procedures are mapped here
 * to appropriate HTTP status codes for the API response.
 */

const ERROR_CODE_MAP = {
  // 401 — Authentication
  AUTH_UNAUTHORIZED: 401,
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_ACCOUNT_LOCKED: 401,
  AUTH_REFRESH_TOKEN_INVALID: 401,
  AUTH_TOKEN_EXPIRED: 401,

  // 403 — Authorization
  RBAC_FORBIDDEN: 403,

  // 404 — Not Found
  BIN_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,

  // 409 — Conflict / Business Rule Violations
  BIN_INACTIVE: 409,
  BIN_RETIRED: 409,
  USER_HAS_REFERENCES: 409,
  USER_HAS_AUDIT_TRAIL: 409,
  INVALID_TRANSITION: 409,
  BIN_OPERATION_IN_PROGRESS: 409,
  CONCURRENT_MODIFICATION_CONFLICT: 409,
  ADMIN_REVIEW_REQUIRED: 409,
  LOCATION_IN_USE: 409,
  BIN_NOT_MODIFIABLE_IN_CURRENT_STATUS: 409,
  DUPLICATE_ENTRY: 409,

  // 400 — Bad Request / Validation
  VALIDATION_ERROR: 400,
  INVALID_STATUS_FOR_OPERATION: 400,

  // 429 — Rate Limiting
  RATE_LIMIT_EXCEEDED: 429,

  // 500 — Internal Server Error
  INTERNAL_ERROR: 500,
  INTERNAL_DB_ERROR: 500,
  SP_NOT_FOUND: 500,
  SP_NO_OUTPUT: 500,
  DB_ACCESS_DENIED: 500,
  DB_UNAVAILABLE: 500,
  DB_CONNECTION_ERROR: 500,
};

const DEFAULT_HTTP_STATUS = 500;

/**
 * Map a structured error code to the corresponding HTTP status code.
 *
 * @param {string} errorCode — Application error code (e.g., 'BIN_NOT_FOUND')
 * @returns {number} HTTP status code
 */
function mapErrorCodeToHttpStatus(errorCode) {
  if (!errorCode) return DEFAULT_HTTP_STATUS;
  return ERROR_CODE_MAP[errorCode] || DEFAULT_HTTP_STATUS;
}

module.exports = { ERROR_CODE_MAP, mapErrorCodeToHttpStatus };