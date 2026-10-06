import { Box, Paper, Typography, Button, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>{value}</Typography>
    </Box>
  );
}

export default function ScanSuccess({ title, message, binNumber, nextLabel, onNext, details }) {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 1 }} />
      <Typography variant="h5" gutterBottom>{title || 'Operation Completed'}</Typography>
      {binNumber && <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>Bin {binNumber}</Typography>}
      {details && (
        <Box sx={{ maxWidth: 320, mx: 'auto', mb: 1 }}>
          <Divider sx={{ mb: 1 }} />
          {details.map((d, i) => <Detail key={i} label={d.label} value={d.value} />)}
          <Divider sx={{ mt: 1 }} />
        </Box>
      )}
      {message && <Typography color="text.secondary" sx={{ mb: 3, mt: 0.5 }}>{message}</Typography>}
      <Button
        variant="contained"
        size="large"
        startIcon={<ReplayIcon />}
        onClick={onNext}
        sx={{ minHeight: 56, minWidth: 220, mt: !message && !details ? 3 : 0 }}
      >
        {nextLabel || 'Scan Next Bin'}
      </Button>
    </Paper>
  );
}
