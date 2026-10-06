import { Chip, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DotIcon from '@mui/icons-material/FiberManualRecord';

const statusDefaults = { bg: '#F5F5F5', text: '#757575' };

export default function StatusChip({ status, type = 'workflow', size = 'small', onClick, sx }) {
  const theme = useTheme();
  const palette = theme.custom;

  if (!status) return null;

  let config;
  if (type === 'user') {
    config = palette.userStatus[status];
  } else if (type === 'action') {
    config = palette.actionType[status];
  } else {
    config = palette.status[status];
  }

  const { bg, text } = config || statusDefaults;

  return (
    <Chip
      icon={<Box component={DotIcon} sx={{ fontSize: size === 'small' ? 8 : 10, color: text, marginLeft: '6px !important' }} />}
      label={status}
      size={size}
      onClick={onClick}
      sx={{
        backgroundColor: bg,
        color: text,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.75rem',
        borderRadius: '4px',
        height: size === 'small' ? 22 : 28,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { opacity: 0.85 } : {},
        '& .MuiChip-icon': { marginLeft: '6px' },
        ...sx,
      }}
    />
  );
}
