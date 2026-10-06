import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PropTypes from 'prop-types';

/**
 * PBLMS — Confirmation Dialog
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Modal dialog requiring explicit user confirmation before executing
 * workflow-critical API calls (Start Loading, Complete QA, etc.).
 *
 * Severity determines the icon and confirm button color:
 *   - info:    Blue info icon + primary button
 *   - warning: Amber warning icon + warning button
 *   - danger:  Red error icon + error button
 *
 * @param {Object} props
 * @param {boolean} props.open — Dialog visibility
 * @param {string} props.title — Dialog title
 * @param {string} props.message — Descriptive message
 * @param {string} [props.confirmLabel='Confirm'] — Confirm button label
 * @param {string} [props.cancelLabel='Cancel'] — Cancel button label
 * @param {Function} props.onConfirm — Called when user clicks confirm
 * @param {Function} props.onCancel — Called when user clicks cancel or closes
 * @param {'info'|'warning'|'danger'} [props.severity='info'] — Severity level
 * @param {boolean} [props.loading=false] — Show loading state on confirm button
 */
export default function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  severity = 'info',
  loading = false,
}) {
  const severityConfig = {
    info: {
      Icon: InfoOutlinedIcon,
      color: 'primary',
      iconColor: 'info.main',
    },
    warning: {
      Icon: WarningAmberIcon,
      color: 'warning',
      iconColor: 'warning.main',
    },
    danger: {
      Icon: ErrorOutlineIcon,
      color: 'error',
      iconColor: 'error.main',
    },
  };

  const { Icon, color, iconColor } = severityConfig[severity] || severityConfig.info;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      aria-labelledby="confirmation-dialog-title"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="confirmation-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Icon sx={{ color: iconColor, fontSize: 28 }} />
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 1, gap: 1 }}>
        <Button
          onClick={onCancel}
          disabled={loading}
          color="inherit"
          sx={{ minHeight: 36 }}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={color}
          autoFocus
          sx={{ minHeight: 36 }}
        >
          {loading ? 'Processing...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ConfirmationDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  severity: PropTypes.oneOf(['info', 'warning', 'danger']),
  loading: PropTypes.bool,
};