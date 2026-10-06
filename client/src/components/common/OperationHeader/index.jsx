import { Box, Typography, Chip } from '@mui/material';

export default function OperationHeader({ title, subtitle, role, step, totalSteps }) {
  return (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="h4">{title}</Typography>
      {role && <Chip label={role} size="small" variant="outlined" />}
      {step && totalSteps && (
        <Chip label={`Step ${step}/${totalSteps}`} size="small" color="primary" variant="outlined" />
      )}
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ width: '100%' }}>{subtitle}</Typography>
      )}
    </Box>
  );
}
