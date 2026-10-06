import { TextField, MenuItem, FormControl, FormHelperText, InputLabel } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * PBLMS — Form Field
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Wraps MUI TextField and Select with React Hook Form integration.
 * Supports text, password, number, date, select, textarea, and email types.
 *
 * @param {Object} props
 * @param {string} props.name — Field name (registered with React Hook Form)
 * @param {string} props.label — Field label
 * @param {string} [props.type='text'] — Input type: text, password, number, date, select, textarea, email
 * @param {boolean} [props.required=false] — Mark as required
 * @param {string} [props.error] — Error message from validation (displays in red below field)
 * @param {string} [props.helperText] — Optional helper text
 * @param {Array<{value: string|number, label: string}>} [props.options] — Options for select fields
 * @param {boolean} [props.multiline=false] — Textarea mode
 * @param {number} [props.maxLength] — Character limit with counter
 * @param {boolean} [props.disabled=false] — Disable field
 * @param {Object} [props.register] — React Hook Form register function result
 * @param {*} [props.value] — Controlled value
 * @param {Function} [props.onChange] — Change handler
 */
export default function FormField({
  name,
  label,
  type = 'text',
  required = false,
  error,
  helperText,
  options,
  multiline = false,
  maxLength,
  disabled = false,
  register,
  value,
  onChange,
  ...rest
}) {
  const inputProps = {};
  if (maxLength) {
    inputProps.maxLength = maxLength;
  }

  // Determine effective helper text
  const effectiveHelperText = error || helperText || (maxLength ? `${value?.length || 0}/${maxLength}` : undefined);

  const isSelect = type === 'select';

  const commonProps = {
    name,
    label,
    required,
    error: Boolean(error),
    helperText: effectiveHelperText,
    disabled,
    fullWidth: true,
    InputLabelProps: { shrink: true },
    inputProps,
    ...(register || {}),
    value,
    onChange,
    ...rest,
  };

  if (isSelect) {
    return (
      <FormControl fullWidth error={Boolean(error)} disabled={disabled}>
        <InputLabel required={required}>{label}</InputLabel>
        <TextField
          select
          name={name}
          required={required}
          value={value || ''}
          onChange={onChange}
          inputProps={inputProps}
          {...(register || {})}
          {...rest}
        >
          {options && options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        {effectiveHelperText && (
          <FormHelperText error={Boolean(error)}>{effectiveHelperText}</FormHelperText>
        )}
      </FormControl>
    );
  }

  if (multiline) {
    return (
      <TextField
        {...commonProps}
        multiline
        minRows={3}
        maxRows={6}
      />
    );
  }

  return (
    <TextField
      {...commonProps}
      type={type === 'textarea' ? 'text' : type}
      multiline={type === 'textarea'}
      minRows={type === 'textarea' ? 3 : undefined}
      maxRows={type === 'textarea' ? 6 : undefined}
    />
  );
}

FormField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  helperText: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), label: PropTypes.string })),
  multiline: PropTypes.bool,
  maxLength: PropTypes.number,
  disabled: PropTypes.bool,
  register: PropTypes.object,
  value: PropTypes.any,
  onChange: PropTypes.func,
};