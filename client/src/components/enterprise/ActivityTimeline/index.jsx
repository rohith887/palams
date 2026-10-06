import { Box, Typography } from '@mui/material';
import DotIcon from '@mui/icons-material/FiberManualRecord';

const severityColors = {
  Critical: { dot: '#C62828', bg: '#FFEBEE' },
  Warning: { dot: '#EF6C00', bg: '#FFF2D6' },
  Info: { dot: '#1565C0', bg: '#E3F0FF' },
  Success: { dot: '#2E7D32', bg: '#E8F5E9' },
  default: { dot: '#9E9E9E', bg: '#F5F5F5' },
};

export default function ActivityTimeline({ items = [], maxItems = 5 }) {
  if (items.length === 0) return null;

  const display = items.slice(0, maxItems);

  return (
    <Box sx={{ position: 'relative', pl: 2.5 }}>
      {display.map((item, idx) => {
        const colors = severityColors[item.severity] || severityColors.default;
        const isLast = idx === display.length - 1;

        return (
          <Box key={item.id || idx} sx={{ position: 'relative', pb: isLast ? 0 : 2 }}>
            <Box
              sx={{
                position: 'absolute',
                left: -20,
                top: 4,
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: colors.dot,
                border: '2px solid',
                borderColor: colors.bg,
                zIndex: 1,
              }}
            />
            {!isLast && (
              <Box
                sx={{
                  position: 'absolute',
                  left: -16.5,
                  top: 16,
                  bottom: -4,
                  width: 1.5,
                  backgroundColor: 'divider',
                }}
              />
            )}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: colors.dot }}>
                  {item.time || ''}
                </Typography>
                {item.badge && (
                  <Box
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      px: 0.5,
                      py: 0.1,
                      borderRadius: '3px',
                      backgroundColor: colors.bg,
                      color: colors.dot,
                      lineHeight: 1.3,
                    }}
                  >
                    {item.badge}
                  </Box>
                )}
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                {item.title}
              </Typography>
              {item.description && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                  {item.description}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
