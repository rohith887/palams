import { Box, Typography, Chip, Paper } from '@mui/material';
import { STATUS_LABELS } from '../../../constants/statusLabels';

const STATUS_COLORS = {
  Awaiting_Loading: 'info', Loading_In_Progress: 'warning',
  Awaiting_Unloading: 'info', Unloading_In_Progress: 'warning',
  Awaiting_Cleaning: 'info', Cleaning_In_Progress: 'warning',
  Awaiting_QA: 'info', QA_In_Progress: 'warning',
  QA_Passed: 'success', QA_Failed: 'error',
  Reinspection_Cleaning: 'warning', Awaiting_Reinspection: 'warning',
  Retired: 'default',
};

export default function BinContextCard({ bin, children, sx }) {
  if (!bin) return null;
  const friendlyStatus = STATUS_LABELS[bin.Current_Status] || bin.Current_Status?.replace(/_/g, ' ') || 'Unknown';
  return (
    <Paper sx={{ p: 2, ...sx }}>
      <Typography variant="h5" gutterBottom>Bin {bin.Bin_Number}</Typography>
      <Chip
        label={friendlyStatus}
        color={STATUS_COLORS[bin.Current_Status] || 'default'}
        size="small"
        sx={{ mb: 1.5 }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
        <Typography variant="body2"><strong>Type:</strong> {bin.Bin_Type_Name || '—'}</Typography>
        <Typography variant="body2"><strong>Category:</strong> {bin.Bin_Category_Name || '—'}</Typography>
        <Typography variant="body2"><strong>Capacity:</strong> {bin.Capacity} {bin.Capacity_Unit}</Typography>
        {bin.Current_Bay_ID && <Typography variant="body2"><strong>Bay:</strong> {bin.Current_Bay_ID}</Typography>}
        {bin.Current_Tank_ID && <Typography variant="body2"><strong>Tank:</strong> {bin.Current_Tank_ID}</Typography>}
      </Box>
      {children}
    </Paper>
  );
}
