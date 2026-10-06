import { CircularProgress, Box } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * PBLMS — Loading Spinner
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Reusable loading indicator with two variants:
 *   - Inline: Renders a centered circular progress at the given size
 *   - FullScreen: Overlays the entire viewport with a semi-transparent
 *     backdrop and a centered spinner
 *
 * @param {Object} props
 * @param {'small'|'medium'|'large'|number} [props.size='medium'] — Spinner size
 * @param {boolean} [props.fullScreen=false] — Full-screen overlay mode
 * @param {string} [props.message] — Optional loading message below spinner
 */
export default function LoadingSpinner({ size = 'medium', fullScreen = false, message }) {
  const sizeMap = { small: 24, medium: 40, large: 56 };
  const pixelSize = typeof size === 'number' ? size : (sizeMap[size] || 40);

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          zIndex: (theme) => theme.zIndex.modal + 1,
        }}
      >
        <CircularProgress size={pixelSize} />
        {message && (
          <Box sx={{ mt: 2, color: 'text.secondary', typography: 'body2' }}>
            {message}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
      <CircularProgress size={pixelSize} />
      {message && (
        <Box sx={{ ml: 2, color: 'text.secondary', typography: 'body2' }}>
          {message}
        </Box>
      )}
    </Box>
  );
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOfType([PropTypes.oneOf(['small', 'medium', 'large']), PropTypes.number]),
  fullScreen: PropTypes.bool,
  message: PropTypes.string,
};