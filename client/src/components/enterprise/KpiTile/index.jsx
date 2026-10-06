import { Box, Paper, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export default function KpiTile({ icon, value, label, trend, trendLabel, subtext, color, onClick, sx }) {
  return (
    <Paper
      sx={{
        p: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': onClick ? {
          borderColor: 'primary.main',
          boxShadow: '0 2px 8px rgba(15,76,129,0.08)',
        } : {},
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {label}
        </Typography>
        {trend !== undefined && trend !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {trend > 0 ? (
              <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
            ) : trend < 0 ? (
              <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
            ) : null}
            {trendLabel && (
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: trend > 0 ? 'success.main' : trend < 0 ? 'error.main' : 'text.secondary' }}>
                {trendLabel}
              </Typography>
            )}
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        {icon && (
          <Box sx={{ color: color || 'primary.main', opacity: 0.8, '& .MuiSvgIcon-root': { fontSize: 24 } }}>
            {icon}
          </Box>
        )}
        <Typography variant="h3" sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.1, color: color || 'text.primary' }}>
          {value ?? '\u2014'}
        </Typography>
      </Box>
      {subtext && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
          {subtext}
        </Typography>
      )}
    </Paper>
  );
}
