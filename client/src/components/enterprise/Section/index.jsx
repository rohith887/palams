import { Box, Typography, Paper } from '@mui/material';

export default function Section({ title, action, children, paper, sx }) {
  const content = (
    <>
      {title && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: children ? 1.5 : 0 }}>
          <Typography variant="overline" sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em' }}>
            {title}
          </Typography>
          {action && <Box>{action}</Box>}
        </Box>
      )}
      {children}
    </>
  );

  if (paper === false) {
    return <Box sx={{ mb: 2, ...sx }}>{content}</Box>;
  }

  return (
    <Paper sx={{ p: 2, mb: 2, ...sx }}>
      {content}
    </Paper>
  );
}
