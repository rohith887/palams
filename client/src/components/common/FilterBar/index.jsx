import { Box, Paper, Button, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function FilterBar({ children, onReset, loading, sx }) {
  return (
    <Paper sx={{ p: 1.5, mb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap', ...sx }}>
      {children}
      {onReset && (
        <Tooltip title="Reset filters">
          <IconButton onClick={onReset} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      )}
    </Paper>
  );
}
