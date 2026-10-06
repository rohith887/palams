import { Box, Typography, Button, Chip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

export default function PageHeader({ title, actionLabel, onAction, actionIcon, subtitle, badge, children }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h1" sx={{ fontSize: '1.375rem' }}>{title}</Typography>
          {badge && <Chip label={badge.label} color={badge.color || 'error'} size="small" />}
        </Box>
        {subtitle && <Typography variant="caption" sx={{ mt: 0, display: 'block', fontSize: '0.7rem' }}>{subtitle}</Typography>}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
        {children}
        {actionLabel && (
          <Button variant="contained" startIcon={actionIcon || <AddIcon />} onClick={onAction} size="small">
            {actionLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}
