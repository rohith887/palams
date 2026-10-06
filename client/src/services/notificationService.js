const NOTIFICATIONS = {
  success: {
    LOADING_COMPLETE: { message: 'Loading completed successfully.', variant: 'success' },
    UNLOADING_COMPLETE: { message: 'Unloading completed successfully.', variant: 'success' },
    CLEANING_COMPLETE: { message: 'Cleaning completed successfully.', variant: 'success' },
    QA_COMPLETE: { message: 'QA inspection completed.', variant: 'success' },
    BIN_ASSIGNED: { message: 'Bin assigned successfully.', variant: 'success' },
    OPERATION_STARTED: { message: 'Operation started successfully.', variant: 'success' },
    OPERATION_RESUMED: { message: 'Previous operation resumed.', variant: 'success' },
  },
  info: {
    LOADING_STARTED: { message: 'Loading started.', variant: 'info' },
    UNLOADING_STARTED: { message: 'Unloading started.', variant: 'info' },
    CLEANING_STARTED: { message: 'Cleaning started.', variant: 'info' },
    QA_STARTED: { message: 'QA inspection started.', variant: 'info' },
    BIN_MOVED: { message: 'Bin moved successfully.', variant: 'info' },
    SESSION_EXPIRING: { message: 'Session will expire soon.', variant: 'info' },
  },
  warning: {
    BAY_OCCUPIED: { message: 'Bay already occupied.', variant: 'warning' },
    OPERATION_IN_PROGRESS: { message: 'Operation already in progress.', variant: 'warning' },
    BIN_AWAITING_QA: { message: 'Bin awaiting QA.', variant: 'warning' },
    SESSION_EXPIRING_SOON: { message: 'Your session will expire in 5 minutes.', variant: 'warning' },
    RESUME_AVAILABLE: { message: 'You have an incomplete operation. You can resume it.', variant: 'warning' },
  },
  error: {
    unknown: 'Unable to complete operation. Please try again. If the problem continues, contact your supervisor.',
  },
};

const ERROR_CODE_MAP = {
  AUTH_UNAUTHORIZED: { message: 'Your session has expired. Please log in again.', variant: 'error' },
  AUTH_INVALID_CREDENTIALS: { message: 'Invalid username or password.', variant: 'error' },
  AUTH_ACCOUNT_LOCKED: { message: 'Account locked due to too many failed login attempts.', variant: 'error' },
  RBAC_FORBIDDEN: { message: 'You do not have permission to perform this action.', variant: 'error' },
  BIN_NOT_FOUND: { message: 'Bin not found. Please verify the QR code and try again.', variant: 'error' },
  BIN_INACTIVE: { message: 'This bin has been deactivated.', variant: 'error' },
  BIN_RETIRED: { message: 'This bin has been retired.', variant: 'error' },
  BIN_OPERATION_IN_PROGRESS: { message: 'This bin is currently being processed by another operator.', variant: 'warning' },
  INVALID_STATUS_FOR_OPERATION: { message: 'This bin is not in the correct status for this operation.', variant: 'error' },
  CONCURRENT_MODIFICATION_CONFLICT: { message: 'This bin was modified by another user. Please scan again.', variant: 'error' },
  ADMIN_REVIEW_REQUIRED: { message: 'This bin requires Administrator review before proceeding.', variant: 'warning' },
  LOCATION_IN_USE: { message: 'This bay is already assigned to another active bin.', variant: 'warning' },
  VALIDATION_ERROR: { message: 'Please correct the highlighted fields and try again.', variant: 'error' },
  RATE_LIMIT_EXCEEDED: { message: 'Too many requests. Please wait and try again.', variant: 'error' },
  INTERNAL_ERROR: { message: 'Unable to complete operation. Please try again.', variant: 'error' },
  INTERNAL_DB_ERROR: { message: 'Unable to complete operation. Please try again.', variant: 'error' },
  NETWORK_ERROR: { message: 'Unable to connect to the server. Please check your connection.', variant: 'error' },
  SESSION_BLOCKED: { message: 'This bin is currently being processed by another operator.', variant: 'warning' },
  SESSION_ALREADY_COMPLETED: { message: 'Operation already completed.', variant: 'info' },
  DUPLICATE_SCAN: { message: 'This bin has already been scanned.', variant: 'info' },
  NOT_FOUND: { message: 'The requested resource was not found.', variant: 'error' },
};

export function mapError(error) {
  if (!error) return NOTIFICATIONS.error.unknown;
  const code = error.code || error.errorCode || '';
  const serverMessage = error.message || error.errorMessage || '';
  const mapped = ERROR_CODE_MAP[code];
  if (mapped) return { message: mapped.message, variant: mapped.variant, code };
  return { message: serverMessage || NOTIFICATIONS.error.unknown, variant: 'error', code };
}

export function getNotification(key, extra = {}) {
  const parts = key.split('.');
  const section = NOTIFICATIONS[parts[0]];
  if (!section) return { message: key, variant: 'info' };
  const notification = section[parts[1]];
  if (!notification) return { message: key, variant: 'info' };
  let message = notification.message;
  Object.entries(extra).forEach(([k, v]) => { message = message.replace(`{${k}}`, v); });
  return { message, variant: notification.variant };
}

export default NOTIFICATIONS;
