const STORAGE_KEY = 'pblms_workflow_session';
const SESSION_TTL = 30 * 60 * 1000;

export function saveSession(state) {
  try {
    const payload = {
      ...state,
      _timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
  }
}

export function restoreSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.step) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

export function isValidSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed._timestamp) return false;
    return Date.now() - parsed._timestamp < SESSION_TTL;
  } catch {
    return false;
  }
}

export function sessionExpiryRemaining() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (!parsed._timestamp) return 0;
    const elapsed = Date.now() - parsed._timestamp;
    return Math.max(0, SESSION_TTL - elapsed);
  } catch {
    return 0;
  }
}
