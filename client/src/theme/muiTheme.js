import { createTheme } from '@mui/material/styles';
import {
  ManropeExtraBold,
  ManropeBold,
  ManropeSemiBold,
  ManropeMedium,
  ManropeRegular,
} from '../assets/fonts/Manrope/static';

const THEME = {
  colors: {
    primary: '#0F4C81',
    primaryLight: '#3A6FA0',
    primaryDark: '#0A3560',
    secondary: '#2A7F62',
    secondaryLight: '#4E9E82',
    secondaryDark: '#1E5E48',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    border: '#D8E2EC',
    textPrimary: '#243447',
    textSecondary: '#607080',
    textDisabled: '#9EAFC2',
    error: '#C62828',
    warning: '#EF6C00',
    success: '#2E7D32',
    info: '#1565C0',
  },
  status: {
    Awaiting_Loading: { bg: '#E3F0FF', text: '#0F4C81', label: 'Awaiting Loading' },
    Loading_In_Progress: { bg: '#E8E0F0', text: '#3F1D9E', label: 'Loading In Progress' },
    Awaiting_Unloading: { bg: '#FFF2D6', text: '#B8860B', label: 'Awaiting Unloading' },
    Unloading_In_Progress: { bg: '#FFE8D6', text: '#E65100', label: 'Unloading In Progress' },
    Awaiting_Cleaning: { bg: '#E3F5F5', text: '#00838F', label: 'Awaiting Cleaning' },
    Cleaning_In_Progress: { bg: '#E0F7FA', text: '#00838F', label: 'Cleaning In Progress' },
    Awaiting_QA: { bg: '#F3E5F5', text: '#7B1FA2', label: 'Awaiting QA' },
    QA_In_Progress: { bg: '#EDE7F6', text: '#5E35B1', label: 'QA In Progress' },
    QA_Passed: { bg: '#E8F5E9', text: '#2E7D32', label: 'QA Passed' },
    QA_Failed: { bg: '#FFEBEE', text: '#C62828', label: 'QA Failed' },
    Reinspection_Cleaning: { bg: '#FFF3E0', text: '#E65100', label: 'Reinspection Cleaning' },
    Awaiting_Reinspection: { bg: '#FFF8E1', text: '#F9A825', label: 'Awaiting Reinspection' },
    Retired: { bg: '#EEEEEE', text: '#424242', label: 'Retired' },
  },
  userStatus: {
    Active: { bg: '#E8F5E9', text: '#2E7D32' },
    Inactive: { bg: '#F5F5F5', text: '#9E9E9E' },
    Locked: { bg: '#FFEBEE', text: '#C62828' },
  },
  actionType: {
    LOGIN: { bg: '#E3F0FF', text: '#0F4C81' },
    LOGOUT: { bg: '#F5F5F5', text: '#757575' },
    FAILED_LOGIN: { bg: '#FFEBEE', text: '#C62828' },
    ACCOUNT_LOCKED: { bg: '#FFEBEE', text: '#C62828' },
    CREATE: { bg: '#E8F5E9', text: '#2E7D32' },
    UPDATE: { bg: '#FFF8E1', text: '#F57F17' },
    DEACTIVATE: { bg: '#F5F5F5', text: '#757575' },
    ROLE_CHANGED: { bg: '#FFF8E1', text: '#F57F17' },
    ACTIVATE: { bg: '#E8F5E9', text: '#2E7D32' },
    PASSWORD_RESET: { bg: '#E3F2FD', text: '#1565C0' },
    DELETE: { bg: '#FFEBEE', text: '#C62828' },
  },
  spacing: {
    pagePadding: 3,
    sectionGap: 2,
    cardPadding: 2,
    formGap: 1.5,
    dialogPadding: 2,
  },
};

const muiTheme = createTheme({
  palette: {
    primary: { main: THEME.colors.primary, light: THEME.colors.primaryLight, dark: THEME.colors.primaryDark, contrastText: '#ffffff' },
    secondary: { main: THEME.colors.secondary, light: THEME.colors.secondaryLight, dark: THEME.colors.secondaryDark, contrastText: '#ffffff' },
    background: { default: THEME.colors.background, paper: THEME.colors.surface },
    text: { primary: THEME.colors.textPrimary, secondary: THEME.colors.textSecondary },
    divider: THEME.colors.border,
    error: { main: THEME.colors.error },
    warning: { main: THEME.colors.warning },
    success: { main: THEME.colors.success },
    info: { main: THEME.colors.info },
  },
  typography: {
    fontFamily: '"Manrope","Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em', color: THEME.colors.textPrimary },
    h2: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em', color: THEME.colors.textPrimary },
    h3: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4, color: THEME.colors.textPrimary },
    h4: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5, color: THEME.colors.textPrimary },
    h5: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5, color: THEME.colors.textPrimary },
    h6: { fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.5, color: THEME.colors.textSecondary },
    body1: { fontSize: '1rem', lineHeight: 1.5, color: THEME.colors.textPrimary },
    body2: { fontSize: '0.875rem', lineHeight: 1.5, color: THEME.colors.textPrimary },
    caption: { fontSize: '0.75rem', lineHeight: 1.4, color: THEME.colors.textSecondary },
    overline: { fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', lineHeight: 1.2, color: THEME.colors.textSecondary, textTransform: 'uppercase' },
  },
  shape: { borderRadius: 8 },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: THEME.colors.background, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 40, textTransform: 'none', borderRadius: 6, fontWeight: 500, fontSize: '0.8125rem', padding: '8px 20px', '&:hover': { boxShadow: 'none' } },
        containedPrimary: { backgroundColor: THEME.colors.primary, '&:hover': { backgroundColor: THEME.colors.primaryDark } },
        containedSecondary: { backgroundColor: THEME.colors.secondary, '&:hover': { backgroundColor: THEME.colors.secondaryDark } },
        outlined: { borderColor: THEME.colors.border, color: THEME.colors.textPrimary, '&:hover': { backgroundColor: '#F0F4F8', borderColor: THEME.colors.border } },
        sizeSmall: { minHeight: 32, padding: '4px 12px', fontSize: '0.75rem' },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 6, padding: 8, minWidth: 36, minHeight: 36, color: THEME.colors.textSecondary, '&:hover': { backgroundColor: '#F0F4F8' } },
        sizeSmall: { padding: 4, minWidth: 32, minHeight: 32 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 6, backgroundColor: THEME.colors.surface, '& .MuiOutlinedInput-notchedOutline': { borderColor: THEME.colors.border }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: THEME.colors.primaryLight }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: THEME.colors.primary, borderWidth: 2 } },
      },
    },
    MuiSelect: {
      styleOverrides: { root: { borderRadius: 6 } },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: THEME.colors.textSecondary, '&.Mui-focused': { color: THEME.colors.primary } } },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: '0.7rem', marginTop: 4 } },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 8, border: `1px solid ${THEME.colors.border}`, boxShadow: 'none', backgroundImage: 'none' },
        elevation1: { boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' },
        elevation2: { boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)' },
      },
    },
    MuiTableContainer: {
      styleOverrides: { root: { borderRadius: 8, border: `1px solid ${THEME.colors.border}`, overflow: 'hidden' } },
    },
    MuiTable: {
      styleOverrides: { root: { borderCollapse: 'separate', borderSpacing: 0 } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { '& .MuiTableRow-root': { backgroundColor: '#F8FAFD' }, '& .MuiTableCell-head': { fontWeight: 600, fontSize: '0.7rem', color: THEME.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `2px solid ${THEME.colors.border}`, padding: '8px 12px', lineHeight: 1.2, backgroundColor: '#F8FAFD' } },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: { '& .MuiTableRow-root': { '&:nth-of-type(even)': { backgroundColor: '#FAFBFC' }, '&:hover': { backgroundColor: '#F0F4F8 !important' }, '&:last-child td': { borderBottom: 'none' } } },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { padding: '8px 12px', fontSize: '0.8125rem', borderBottom: `1px solid ${THEME.colors.border}`, color: THEME.colors.textPrimary, lineHeight: 1.3 }, sizeSmall: { padding: '6px 8px', fontSize: '0.8rem' } },
    },
    MuiTableSortLabel: {
      styleOverrides: { root: { '&.Mui-active': { color: THEME.colors.primary, fontWeight: 600 } } },
    },
    MuiTablePagination: {
      styleOverrides: {         root: { borderTop: `1px solid ${THEME.colors.border}`, backgroundColor: '#F8FAFD', borderRadius: '0 0 8px 8px', '.MuiTablePagination-toolbar': { minHeight: 36 } } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem', height: 28 },
        sizeSmall: { height: 22, fontSize: '0.7rem', borderRadius: 4 },
        outlined: { borderColor: THEME.colors.border },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 10, padding: THEME.spacing.dialogPadding, boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' } },
    },
    MuiDialogTitle: {
      styleOverrides: {         root: { padding: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: THEME.colors.textPrimary } },
    },
    MuiDialogContent: {
      styleOverrides: {         root: { padding: '12px 0' } },
    },
    MuiDialogActions: {
      styleOverrides: {         root: { padding: '12px 0 0 0', gap: 8 } },
    },
    MuiDivider: {
      styleOverrides: {         root: { borderColor: THEME.colors.border, margin: '8px 0' } },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 6, padding: '10px 16px', fontSize: '0.8125rem', border: '1px solid transparent' },
        standardError: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2', color: '#C62828' },
        standardWarning: { backgroundColor: '#FFF2D6', borderColor: '#FFE082', color: '#EF6C00' },
        standardSuccess: { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9', color: '#2E7D32' },
        standardInfo: { backgroundColor: '#E3F0FF', borderColor: '#BBDEFB', color: '#0F4C81' },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: THEME.colors.textPrimary, fontSize: '0.75rem', padding: '6px 10px', borderRadius: 4 } },
    },
    MuiMenu: {
      styleOverrides: { paper: { borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)', border: `1px solid ${THEME.colors.border}` } },
    },
    MuiMenuItem: {
      styleOverrides: { root: { fontSize: '0.8125rem', minHeight: 36, padding: '6px 16px', '&:hover': { backgroundColor: '#F0F4F8' } } },
    },
    MuiList: {
      styleOverrides: { root: { padding: 4 } },
    },
    MuiListItem: {
      styleOverrides: { root: { borderRadius: 6 } },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 500, fontSize: '0.8125rem', minHeight: 44 } },
    },
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: THEME.colors.primary } },
    },
    MuiSwitch: {
      styleOverrides: { thumb: { color: THEME.colors.surface }, track: { backgroundColor: THEME.colors.border } },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 8, border: `1px solid ${THEME.colors.border}`, boxShadow: 'none' } },
    },
    MuiCardContent: {
      styleOverrides: {         root: { padding: '16px', '&:last-child': { paddingBottom: '16px' } } },
    },
    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: 'rgba(15, 76, 129, 0.15)' } },
    },
    MuiSnackbarContent: {
      styleOverrides: { root: { borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' } },
    },
  },
});

muiTheme.custom = THEME;

export default muiTheme;
