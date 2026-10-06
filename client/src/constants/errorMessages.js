const ERRORS = {
  AUTH_UNAUTHORIZED: 'Your session has expired. Please log in again.',
  AUTH_INVALID_CREDENTIALS: 'Invalid username or password.',
  AUTH_ACCOUNT_LOCKED: 'Account locked due to too many failed login attempts.',
  RBAC_FORBIDDEN: 'You do not have permission to perform this action.',
  BIN_NOT_FOUND: 'Bin not found. Please verify the QR code and try again.',
  BIN_INACTIVE: 'This bin has been deactivated.',
  BIN_RETIRED: 'This bin has been retired.',
  BIN_OPERATION_IN_PROGRESS: 'This bin is currently being processed by another operator.',
  INVALID_STATUS_FOR_OPERATION: 'This bin is not in the correct status for this operation.',
  CONCURRENT_MODIFICATION_CONFLICT: 'This bin was modified by another user. Please scan again.',
  ADMIN_REVIEW_REQUIRED: 'This bin requires Administrator review before proceeding.',
  LOCATION_IN_USE: 'This bay is already assigned to another active bin.',
  VALIDATION_ERROR: 'Please correct the highlighted fields and try again.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait and try again.',
  INTERNAL_ERROR: 'Unable to complete operation. Please try again. If the problem continues, contact your supervisor.',
  NETWORK_ERROR: 'Unable to connect to the server. Please check your connection.',
};

export default ERRORS;
