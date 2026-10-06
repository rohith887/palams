import { Box, Paper, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export default function MetricCard({ icon, value, label, trend, trendLabel, subtext, color, onClick, sx }) {
  return (
    <Paper
      sx={{ p: 1.5, cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s', '&:hover': onClick ? { borderColor: 'primary.main' } : {}, ...sx }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.75 }}>
        {icon && (
          <Box sx={{ color: color || 'primary.main', opacity: 0.85, '& .MuiSvgIcon-root': { fontSize: 22 } }}>
            {icon}
          </Box>
        )}
        {trend !== undefined && trend !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {trend > 0 ? (
              <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
            ) : trend < 0 ? (
              <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
            ) : null}
            {trendLabel && <Typography variant="caption" sx={{ fontSize: '0.65rem', color: trend > 0 ? 'success.main' : trend < 0 ? 'error.main' : 'text.secondary' }}>{trendLabel}</Typography>}
          </Box>
        )}
      </Box>
      <Typography variant="h2" sx={{ fontSize: '1.25rem', color: color || 'text.primary', mb: 0.25 }}>
        {value ?? '\u2014'}
      </Typography>
      <Typography variant="caption" sx={{ fontSize: '0.7rem' }} color="text.secondary">{label}</Typography>
      {subtext && <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25, fontSize: '0.65rem' }}>{subtext}</Typography>}
    </Paper>
  );
}
