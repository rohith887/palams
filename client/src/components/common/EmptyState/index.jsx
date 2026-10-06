import { Box, Typography, Button, Paper } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export default function EmptyState({ icon, title, message, actionLabel, onAction, actionIcon }) {
  return (
    <Paper sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
      <Box sx={{ mb: 1, color: 'text.disabled' }}>
        {icon || <InboxIcon sx={{ fontSize: 36 }} />}
      </Box>
      <Typography variant="h4" color="text.secondary" sx={{ fontSize: '0.875rem', mb: 0.5 }}>
        {title || 'No data found'}
      </Typography>
      {message && <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 400, mx: 'auto', fontSize: '0.8125rem' }}>{message}</Typography>}
      {actionLabel && onAction && (
        <Button variant="outlined" startIcon={actionIcon} onClick={onAction}>{actionLabel}</Button>
      )}
    </Paper>
  );
}
