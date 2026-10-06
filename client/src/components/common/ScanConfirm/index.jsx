import { Box, Paper, Typography, Chip, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { STATUS_LABELS } from '../../../constants/statusLabels';

export default function ScanConfirm({ bin, onContinue, loading }) {
  const friendlyStatus = STATUS_LABELS[bin.Current_Status] || bin.Current_Status?.replace(/_/g, ' ') || 'Unknown';
  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
        <Typography variant="h6" sx={{ mt: 1 }}>Bin Identified</Typography>
      </Box>
      <Chip
        label={friendlyStatus}
        color="primary"
        size="small"
        sx={{ mb: 1.5, display: 'block', width: 'fit-content', mx: 'auto' }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 2 }}>
        <Typography variant="body2"><strong>Bin No:</strong> {bin.Bin_Number || '—'}</Typography>
        <Typography variant="body2"><strong>Type:</strong> {bin.Bin_Type_Name || '—'}</Typography>
        <Typography variant="body2"><strong>Category:</strong> {bin.Bin_Category_Name || '—'}</Typography>
        <Typography variant="body2"><strong>Capacity:</strong> {bin.Capacity} {bin.Capacity_Unit}</Typography>
        {bin.Current_Bay_ID && <Typography variant="body2" sx={{ gridColumn: 'span 2' }}><strong>Bay:</strong> {bin.Current_Bay_ID}</Typography>}
        {bin.Current_Tank_ID && <Typography variant="body2" sx={{ gridColumn: 'span 2' }}><strong>Tank:</strong> {bin.Current_Tank_ID}</Typography>}
      </Box>
      <Button
        variant="contained" fullWidth size="large"
        onClick={onContinue} disabled={loading}
        endIcon={<ArrowForwardIcon />}
        sx={{ minHeight: 56 }}
      >
        Continue
      </Button>
    </Paper>
  );
}
