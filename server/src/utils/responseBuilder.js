/**
 * PBLMS — API Response Envelope Builder
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Enforces the standard JSON response envelope across all endpoints.
 *
 * Design Spec Reference: Section 8.1
 *
 * Success envelope:
 *   { success: true, data: object|array|null, error: null }
 *
 * Error envelope:
 *   { success: false, data: null, error: { code: string, message: string } }
 */

/**
 * Build a success response envelope.
 *
 * @param {*} data — Response payload (object, array, or null)
 * @returns {{ success: true, data: *, error: null }}
 */
function success(data = null) {
  return {
    success: true,
    data,
    error: null,
  };
}

/**
 * Build a failure response envelope.
 *
 * @param {string} errorCode — Structured error code (e.g., 'BIN_NOT_FOUND')
 * @param {string} message — Human-readable error message
 * @returns {{ success: false, data: null, error: { code: string, message: string } }}
 */
function failure(errorCode, message) {
  return {
    success: false,
    data: null,
    error: {
      code: errorCode,
      message,
    },
  };
}

module.exports = { success, failure };