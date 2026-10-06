import { Box, Paper, Typography } from '@mui/material';

export default function SectionCard({ title, action, children, sx, ...props }) {
  return (
    <Paper sx={{ p: 1.5, mb: 1.5, ...sx }} {...props}>
      {title && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: title && children ? 1 : 0 }}>
          <Typography variant="h3" sx={{ fontSize: '0.9375rem' }}>{title}</Typography>
          {action && <Box>{action}</Box>}
        </Box>
      )}
      {children}
    </Paper>
  );
}
