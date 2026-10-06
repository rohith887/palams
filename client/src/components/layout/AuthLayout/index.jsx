import { Box, Paper, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';

/**
 * PBLMS — Auth Layout
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Centered card layout for unauthenticated pages (Login).
 * No sidebar, no header. Displays PBLMS branding and wraps children.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children — Page content
 */
export default function AuthLayout({ children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'background.default',
        px: 2,
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          borderRadius: 2,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Inventory2Icon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h1" sx={{ fontSize: '1.25rem', fontWeight: 700 }}>
            PBLMS
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pharmaceutical Bin Lifecycle Management
          </Typography>
        </Box>
        {children}
      </Paper>
    </Box>
  );
}