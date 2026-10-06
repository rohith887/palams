import { createContext, useContext, useState, useCallback, useRef } from 'react';
import axiosInstance from '../utils/axiosInstance';

const SessionContext = createContext(null);

const SESSION_STORAGE_KEY = 'pblms_active_session';

function loadPersistedSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSession(session) {
  try {
    if (session) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
  }
}

export function SessionContextProvider({ children }) {
  const [currentSession, setCurrentSession] = useState(loadPersistedSession);
  const sessionRef = useRef(currentSession);

  const checkScanRecovery = useCallback(async ({ binId, qrCodeValue }) => {
    const res = await axiosInstance.post('/v1/sessions/check-recovery', { binId, qrCodeValue });
    const result = res.data?.data;
    if (result?.sessionId) {
      const sessionData = {
        sessionId: result.sessionId,
        binId,
        qrCodeValue,
        status: result.action === 'RESUME' ? 'IN_PROGRESS' : result.action === 'NEW' ? 'SCANNED' : result.action,
        action: result.action,
      };
      setCurrentSession(sessionData);
      sessionRef.current = sessionData;
      persistSession(sessionData);
    }
    return result;
  }, []);

  const updateSessionStatus = useCallback(async (sessionId, status, metadata) => {
    if (!sessionId) return;
    try {
      await axiosInstance.post('/v1/sessions/update-status', { sessionId, status, metadata });
    } catch {
    }
    if (currentSession && currentSession.sessionId === sessionId) {
      const updated = { ...currentSession, status };
      setCurrentSession(updated);
      sessionRef.current = updated;
      persistSession(updated);
    }
  }, [currentSession]);

  const cancelSession = useCallback(async (sessionId) => {
    if (!sessionId && !currentSession?.sessionId) return;
    const sid = sessionId || currentSession.sessionId;
    try {
      await axiosInstance.post('/v1/sessions/cancel', { sessionId: sid });
    } catch {
    }
    setCurrentSession(null);
    sessionRef.current = null;
    persistSession(null);
  }, [currentSession]);

  const clearSession = useCallback(() => {
    setCurrentSession(null);
    sessionRef.current = null;
    persistSession(null);
  }, []);

  const value = {
    currentSession,
    checkScanRecovery,
    updateSessionStatus,
    cancelSession,
    clearSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionContextProvider');
  return ctx;
}

export default SessionContext;
