import { Box, TextField } from '@mui/material';

export default function DateRangeFilter({ fromLabel = 'From Date', toLabel = 'To Date', from, to, onFromChange, onToChange, size = 'small', sx }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, ...sx }}>
      <TextField
        label={fromLabel}
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        size={size}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 160 }}
      />
      <TextField
        label={toLabel}
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        size={size}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 160 }}
        inputProps={{ min: from || undefined }}
      />
    </Box>
  );
}
