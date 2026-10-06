import { restoreSession, isValidSession, clearSession } from './workflowSessionManager';
import axiosInstance from '../utils/axiosInstance';

const EXPIRED_MESSAGE = 'Previous session expired. Start a new scan.';

export function checkRecoveryOnMount() {
  const session = restoreSession();
  if (!session) {
    return { needsRecovery: false };
  }

  if (!isValidSession()) {
    clearSession();
    return {
      needsRecovery: false,
      expired: true,
      message: EXPIRED_MESSAGE,
    };
  }

  if (session.step === undefined || session.step === null) {
    clearSession();
    return { needsRecovery: false };
  }

  return {
    needsRecovery: true,
    state: session,
    step: session.step,
    binData: session.binData || null,
    workflowResult: session.workflowResult || null,
    form: session.form || null,
  };
}

export async function validateSessionWithBackend(session) {
  if (!session?.binData?.Bin_ID) {
    return { valid: false, reason: 'NO_BIN_DATA' };
  }

  try {
    const res = await axiosInstance.post('/v1/sessions/check-recovery', {
      binId: session.binData.Bin_ID,
    });
    const result = res.data?.data;
    if (result?.action === 'RESUME') {
      return {
        valid: true,
        sessionId: result.sessionId,
        sessionData: result.session,
        action: 'RESUME',
      };
    }
    if (result?.action === 'ALREADY_COMPLETED') {
      return {
        valid: false,
        reason: 'ALREADY_COMPLETED',
        message: 'This operation has already been completed.',
      };
    }
    return {
      valid: false,
      reason: 'SESSION_STALE',
      message: 'Your previous session is no longer valid. Start a new scan.',
    };
  } catch {
    return {
      valid: true,
      degraded: true,
      message: 'Could not verify session with server. Continuing with local session.',
    };
  }
}
