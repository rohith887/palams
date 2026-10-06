import { Box, Paper, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const STATE_CONFIG = {
  WRONG_STAGE: {
    icon: (
      <Box component="span" sx={{ fontSize: 48, lineHeight: 1, mb: 1, display: 'block' }}>
        ⚠️
      </Box>
    ),
    bgColor: '#FFF3E0',
    borderColor: '#FFB74D',
    iconColor: '#E65100',
  },
  WRONG_OPERATOR: {
    icon: (
      <Box component="span" sx={{ fontSize: 48, lineHeight: 1, mb: 1, display: 'block' }}>
        🔒
      </Box>
    ),
    bgColor: '#FFEBEE',
    borderColor: '#EF9A9A',
    iconColor: '#C62828',
  },
  ALREADY_COMPLETED: {
    icon: (
      <Box component="span" sx={{ fontSize: 48, lineHeight: 1, mb: 1, display: 'block' }}>
        ✅
      </Box>
    ),
    bgColor: '#E8F5E9',
    borderColor: '#81C784',
    iconColor: '#2E7D32',
  },
  BLOCKED: {
    icon: (
      <Box component="span" sx={{ fontSize: 48, lineHeight: 1, mb: 1, display: 'block' }}>
        🔒
      </Box>
    ),
    bgColor: '#FFF3E0',
    borderColor: '#FFB74D',
    iconColor: '#E65100',
  },
  SESSION_RESUME: {
    icon: (
      <Box component="span" sx={{ fontSize: 48, lineHeight: 1, mb: 1, display: 'block' }}>
        ▶️
      </Box>
    ),
    bgColor: '#E3F2FD',
    borderColor: '#64B5F6',
    iconColor: '#1565C0',
  },
};

const DASHBOARD_PATH = {
  Loader: '/loader/dashboard',
  Unloader: '/unloader/dashboard',
  Cleaner: '/cleaner/dashboard',
  QA_Inspector: '/qa/dashboard',
};

export default function WorkflowStatusCard({ workflow, role, binLabel, onScanAnother }) {
  const navigate = useNavigate();
  const state = workflow?.workflowState;
  const cfg = STATE_CONFIG[state];
  const friendly = workflow?.friendly || {};

  if (!state || !cfg) return null;

  const dashboardPath = DASHBOARD_PATH[role] || '/';

  return (
    <Paper
      sx={{
        p: 3,
        textAlign: 'center',
        bgcolor: cfg.bgColor,
        border: `2px solid ${cfg.borderColor}`,
        borderRadius: 2,
      }}
    >
      {cfg.icon}

      <Typography variant="h6" sx={{ fontWeight: 600, color: cfg.iconColor, mb: 1 }}>
        {friendly.title || state}
      </Typography>

      {binLabel && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8125rem' }}>
          Bin: {binLabel}
        </Typography>
      )}

      <Typography variant="body1" sx={{ mb: 0.5, color: 'text.primary', fontSize: '0.9375rem' }}>
        {friendly.message}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic', fontSize: '0.8125rem' }}>
        {friendly.instruction}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {onScanAnother && (
          <Button variant="contained" onClick={onScanAnother} sx={{ minWidth: 160 }}>
            Scan Another Bin
          </Button>
        )}
        <Button variant="outlined" onClick={() => navigate(dashboardPath)} sx={{ minWidth: 160 }}>
          Return to Dashboard
        </Button>
      </Box>
    </Paper>
  );
}
