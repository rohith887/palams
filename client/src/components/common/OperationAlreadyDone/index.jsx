import { Box, Paper, Typography, Button } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useNavigate } from 'react-router-dom';

const ROLE_PATHS = {
  Loader: '/loader/dashboard',
  Unloader: '/unloader/dashboard',
  Cleaner: '/cleaner/dashboard',
  QA_Inspector: '/qa/dashboard',
};

export default function OperationAlreadyDone({ operationLabel, binLabel, role, onScanAnother }) {
  const navigate = useNavigate();

  return (
    <Paper
      elevation={2}
      sx={{
        maxWidth: 440,
        mx: 'auto',
        mt: 4,
        p: 3,
        textAlign: 'center',
        borderRadius: 3,
      }}
    >
      <Box sx={{ mb: 2, color: 'success.main' }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 64 }} />
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Bin Already {operationLabel}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.875rem' }}>
        This bin has already completed the current {operationLabel.toLowerCase()}.
      </Typography>

      {binLabel && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.8125rem' }}>
          Bin: {binLabel}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<QrCodeScannerIcon />}
          onClick={onScanAnother}
          sx={{ minHeight: 48 }}
        >
          Scan Another Bin
        </Button>

        <Button
          variant="text"
          size="small"
          fullWidth
          startIcon={<DashboardIcon />}
          onClick={() => navigate(ROLE_PATHS[role] || '/')}
          sx={{ color: 'text.secondary' }}
        >
          Return to Dashboard
        </Button>
      </Box>
    </Paper>
  );
}
