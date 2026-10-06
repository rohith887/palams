import { Alert, Button } from '@mui/material';
import { mapError } from '../../../services/notificationService';

/**
 * ScanError — always shows a friendly, operator-readable message.
 * Never exposes raw API error codes, status strings, or technical details.
 */
export default function ScanError({ error, onRetry, onDismiss }) {
  if (!error) return null;

  // Map technical codes to operator-friendly messages
  const mapped = mapError(error);
  const isRetryable = ['CONCURRENT_MODIFICATION_CONFLICT', 'SCAN_ERROR', 'NETWORK_ERROR'].includes(error.code);

  return (
    <Alert
      severity={mapped.variant === 'warning' ? 'warning' : 'error'}
      sx={{ mb: 2 }}
      onClose={onDismiss}
      action={
        isRetryable && onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>Try Again</Button>
        ) : onDismiss ? (
          <Button color="inherit" size="small" onClick={onDismiss}>Scan Another</Button>
        ) : null
      }
    >
      {mapped.message}
    </Alert>
  );
}
