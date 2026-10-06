import { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert as MuiAlert } from '@mui/material';
import { mapError, getNotification } from '../services/notificationService';

const NotificationContext = createContext(null);

export function NotificationContextProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [notification, setNotification] = useState({ message: '', variant: 'info' });

  const show = useCallback((message, variant = 'info') => {
    setNotification({ message, variant });
    setOpen(true);
  }, []);

  const notifySuccess = useCallback((msg) => show(msg, 'success'), [show]);
  const notifyInfo = useCallback((msg) => show(msg, 'info'), [show]);
  const notifyWarning = useCallback((msg) => show(msg, 'warning'), [show]);
  const notifyError = useCallback((msg) => show(msg, 'error'), [show]);

  const notifyFromKey = useCallback((key, extra) => {
    const n = getNotification(key, extra);
    show(n.message, n.variant);
  }, [show]);

  const notifyFromError = useCallback((error) => {
    const mapped = mapError(error);
    show(mapped.message, mapped.variant);
  }, [show]);

  const notifyFromApiError = useCallback((err) => {
    if (!err) { show('Unable to complete operation. Please try again.', 'error'); return; }
    if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
      show('Unable to connect to the server. Please check your connection.', 'error');
      return;
    }
    const apiError = err.response?.data?.error || err.response?.data || {};
    const mapped = mapError(apiError);
    show(mapped.message, mapped.variant);
  }, [show]);

  const handleClose = useCallback((event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  const value = {
    notifySuccess, notifyInfo, notifyWarning, notifyError,
    notifyFromKey, notifyFromError, notifyFromApiError,
    show,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert
          onClose={handleClose}
          severity={notification.variant}
          variant="filled"
          sx={{ minWidth: 300, fontWeight: 500, boxShadow: 3 }}
        >
          {notification.message}
        </MuiAlert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationContextProvider');
  return ctx;
}

export default NotificationContext;
