import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import alertService from '../services/alertService';

const AlertContext = createContext(null);

export function AlertContextProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await alertService.getAlerts();
      const data = res.data.data || [];
      setAlerts(data);
      setUnreadCount(data.length);
    } catch {
      // Silently fail — alerts are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch alerts on mount and every 60 seconds
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const acknowledgeAlert = useCallback(async (alertId) => {
    try {
      await alertService.acknowledgeAlert(alertId);
      // Remove from local state immediately
      setAlerts((prev) => prev.filter((a) => a.Alert_ID !== alertId));
      setUnreadCount((prev) => prev - 1);
    } catch {
      // Error handled silently
    }
  }, []);

  const value = {
    alerts,
    unreadCount,
    loading,
    refresh,
    acknowledgeAlert,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlertContext() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlertContext must be used within an AlertContextProvider');
  return ctx;
}

export default AlertContext;