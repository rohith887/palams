import { Box, Typography, Divider } from '@mui/material';

export default function FormSection({ title, children }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="overline" sx={{ mb: 0.75, display: 'block', fontSize: '0.65rem', letterSpacing: '0.04em' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
