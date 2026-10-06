import { Box, Typography, Link, useTheme } from '@mui/material';

export default function Footer() {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        px: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 42,
        flexShrink: 0,
      }}
    >
      {/* Left — copyright */}
     

      {/* Right — powered by */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
          Powered by
        </Typography>
        <Box
          component="img"
          src="/gr3.png"
          alt="Grassroots"
          sx={{ height: 23, width: 'auto', objectFit: 'contain' }}
        />
         <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', letterSpacing: '0.02em' }}>
        © {new Date().getFullYear()}
      </Typography>
      </Box>
    </Box>
  );
}