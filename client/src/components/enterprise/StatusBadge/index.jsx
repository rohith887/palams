import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DotIcon from '@mui/icons-material/FiberManualRecord';

const statusDefaults = { bg: '#F5F5F5', text: '#757575' };

export default function StatusBadge({ status, type = 'workflow', size = 'sm', onClick, sx }) {
  const theme = useTheme();
  const palette = theme.custom;

  if (!status) return null;

  let config;
  if (type === 'user') config = palette.userStatus[status];
  else if (type === 'action') config = palette.actionType[status];
  else config = palette.status[status];

  const { bg, text } = config || statusDefaults;

  const isSm = size === 'sm';
  const fontSize = isSm ? '0.7rem' : '0.75rem';
  const px = isSm ? 1 : 1.25;
  const py = isSm ? 0.15 : 0.25;
  const dotSize = isSm ? 7 : 9;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        backgroundColor: bg,
        color: text,
        fontWeight: 600,
        fontSize,
        borderRadius: '4px',
        px,
        py,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
        '&:hover': onClick ? { opacity: 0.85 } : {},
        ...sx,
      }}
    >
      <DotIcon sx={{ fontSize: dotSize, color: text }} />
      {status}
    </Box>
  );
}
