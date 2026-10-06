import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, TextField, MenuItem, Button, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Grid, Tooltip,
  InputAdornment, Paper, FormControl, Select, Chip, Skeleton, Typography,
  Drawer, Avatar, Divider, Card, CardContent, Checkbox,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
  TableSortLabel, TablePagination, Menu, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  LockReset as ResetIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  FilterAltOff as ResetFilterIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon,
  Engineering as OperatorIcon,
  CheckCircleOutline as ActiveIcon,
  Cancel as InactiveIcon,
  LoginOutlined as LoginIcon,
} from '@mui/icons-material';
import PortalLayout from '../../../components/layout/PortalLayout';
import FormSection from '../../../components/common/FormSection';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import StatusChip from '../../../components/common/StatusChip';
import useAuth from '../../../hooks/useAuth';
import userService from '../../../services/userService';
import { ROLE_OPTIONS, ROLE_LABELS } from '../../../constants/roles';

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_CHIP_COLORS = {
  Administrator: { bg: '#E3F0FF', text: '#0F4C81' },
  Loader:        { bg: '#E8F5E9', text: '#2E7D32' },
  Unloader:      { bg: '#FFF2D6', text: '#E65100' },
  Cleaner:       { bg: '#E0F7FA', text: '#00838F' },
  'QA Inspector':{ bg: '#F3E5F5', text: '#7B1FA2' },
};

const STATUS_CHIP_PROPS = {
  Active:   { bg: '#E8F5E9', text: '#2E7D32' },
  Inactive: { bg: '#F5F5F5', text: '#9E9E9E' },
  Locked:   { bg: '#FFEBEE', text: '#C62828' },
};

const QUICK_FILTERS = [
  { key: 'all',        label: 'All',          role: 'all',           status: 'all'     },
  { key: 'admin',      label: 'Administrators',role: 'Administrator', status: 'all'     },
  { key: 'loader',     label: 'Loaders',       role: 'Loader',        status: 'all'     },
  { key: 'unloader',   label: 'Unloaders',     role: 'Unloader',      status: 'all'     },
  { key: 'cleaner',    label: 'Cleaners',      role: 'Cleaner',       status: 'all'     },
  { key: 'qa',         label: 'QA Inspectors', role: 'QA_Inspector',  status: 'all'     },
  { key: 'inactive',   label: 'Inactive',      role: 'all',           status: 'Inactive'},
  { key: 'recent',     label: 'Recently Active',role:'all',           status: 'Active'  },
];

const emptyForm = {
  employeeId: '', username: '', password: '', confirmPassword: '',
  fullName: '', role: 'Loader', email: '', phone: '',
  department: '', designation: '', isActive: true,
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ── Sub-components ───────────────────────────────────────────────────────────

function RoleChip({ role }) {
  const label = ROLE_LABELS[role] || role;
  const colors = ROLE_CHIP_COLORS[label] || { bg: '#F5F5F5', text: '#757575' };
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: colors.bg, color: colors.text,
        fontWeight: 600, fontSize: '0.7rem', height: 22, borderRadius: '4px',
      }}
    />
  );
}

function StatusBadge({ status }) {
  const props = STATUS_CHIP_PROPS[status] || { bg: '#F5F5F5', text: '#757575' };
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        backgroundColor: props.bg, color: props.text,
        fontWeight: 600, fontSize: '0.7rem', height: 22, borderRadius: '4px',
      }}
    />
  );
}

function KpiCard({ icon, label, value, color }) {
  return (
    <Card sx={{ flex: '1 1 140px', minWidth: 120, maxWidth: 200, height: 100 }}>
      <CardContent sx={{ p: '12px !important', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color, display: 'flex' }}>{icon}</Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, lineHeight: 1.2 }}>{label}</Typography>
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 700, color, fontSize: '1.75rem', lineHeight: 1 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function UserManagement() {
  const { user, logout } = useAuth();
  const muiTheme = useTheme();
  const isTablet = useMediaQuery(muiTheme.breakpoints.down('lg'));
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const searchTimer = useRef(null);

  // Data state
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Server pagination / sort
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeQuickFilter, setActiveQuickFilter] = useState('all');

  // Client-side sort for current page
  const [clientSortBy, setClientSortBy] = useState('');
  const [clientSortOrder, setClientSortOrder] = useState('asc');

  // Selection
  const [selected, setSelected] = useState([]);

  // Drawer
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Add / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [form, setForm] = useState({ ...emptyForm });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Reset password dialog
  const [resetDialog, setResetDialog] = useState({ open: false, user: null, tempPassword: '' });
  const [resetting, setResetting] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, user: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Row action menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuUser, setMenuUser] = useState(null);

  // ── Data Fetch ──────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const params = { page: page + 1, pageSize, sortBy, sortOrder };
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await userService.listUsers(params);
      const data = res.data?.data || {};
      setRows(data.rows || []);
      setTotalCount(data.totalCount || 0);
      setSelected([]);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Failed to load users');
      setRows([]); setTotalCount(0);
    } finally { setLoading(false); }
  }, [page, pageSize, sortBy, sortOrder, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── KPI Counts (from loaded page) ──────────────────────────────────────────

  const kpiCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total:      totalCount,
      active:     rows.filter(r => r.Status === 'Active').length,
      inactive:   rows.filter(r => r.Status === 'Inactive' || r.Status === 'Locked').length,
      admins:     rows.filter(r => r.Role === 'Administrator').length,
      operators:  rows.filter(r => r.Role !== 'Administrator').length,
      loggedToday: rows.filter(r => r.Last_Login_At && new Date(r.Last_Login_At) >= today).length,
    };
  }, [rows, totalCount]);

  // ── Client-side sort for current page ──────────────────────────────────────

  const displayRows = useMemo(() => {
    if (!clientSortBy) return rows;
    return [...rows].sort((a, b) => {
      const va = a[clientSortBy] ?? '';
      const vb = b[clientSortBy] ?? '';
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return clientSortOrder === 'asc' ? cmp : -cmp;
    });
  }, [rows, clientSortBy, clientSortOrder]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(0), 400);
  }, []);

  const handleClientSort = useCallback((col) => {
    setClientSortBy(prev => {
      if (prev === col) { setClientSortOrder(o => o === 'asc' ? 'desc' : 'asc'); return col; }
      setClientSortOrder('asc'); return col;
    });
  }, []);

  const handleQuickFilter = useCallback((qf) => {
    setActiveQuickFilter(qf.key);
    setRoleFilter(qf.role);
    setStatusFilter(qf.status);
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearch(''); setRoleFilter('all'); setStatusFilter('all');
    setActiveQuickFilter('all'); setPage(0); setClientSortBy(''); setClientSortOrder('asc');
  }, []);

  const handleExport = useCallback(() => {
    const exportRows = selected.length > 0
      ? displayRows.filter(r => selected.includes(r.User_ID))
      : displayRows;
    const headers = ['Employee_ID', 'Full_Name', 'Username', 'Role', 'Status', 'Email', 'Phone', 'Department', 'Last_Login_At'];
    const csv = [
      headers.join(','),
      ...exportRows.map(r =>
        headers.map(h => {
          const v = h === 'Last_Login_At' ? formatDate(r[h]) : (r[h] ?? '');
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users_export.csv'; a.click();
    URL.revokeObjectURL(url);
  }, [displayRows, selected]);

  // Selection
  const handleSelectAll = useCallback((e) => {
    setSelected(e.target.checked ? displayRows.map(r => r.User_ID) : []);
  }, [displayRows]);

  const handleSelectRow = useCallback((id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  // Pagination
  const handlePageChange = useCallback((_, p) => setPage(p), []);
  const handlePageSizeChange = useCallback((e) => { setPageSize(Number(e.target.value)); setPage(0); }, []);

  // ── Drawer ──────────────────────────────────────────────────────────────────

  const openDrawer = useCallback(async (u) => {
    setDrawerLoading(true); setDrawerUser(u); setDrawerOpen(true);
    try {
      const res = await userService.getUserById(u.User_ID);
      setDrawerUser(res.data?.data || u);
    } catch { /* use stale row data */ }
    finally { setDrawerLoading(false); }
  }, []);

  const closeDrawer = useCallback(() => { setDrawerOpen(false); setDrawerUser(null); }, []);

  // ── Add / Edit ───────────────────────────────────────────────────────────────

  const openAddDialog = useCallback(() => {
    setForm({ ...emptyForm }); setFormErrors({}); setDialogMode('add'); setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback(async (u) => {
    setFormErrors({}); setDialogMode('edit');
    try {
      const res = await userService.getUserById(u.User_ID);
      const d = res.data?.data || u;
      setForm({
        User_ID: d.User_ID, employeeId: d.Employee_ID || '',
        username: d.Username || '', password: '', confirmPassword: '',
        fullName: d.Full_Name || '', role: d.Role || 'Loader',
        email: d.Email || '', phone: d.Phone || '',
        department: d.Department || '', designation: d.Designation || '',
        isActive: d.Is_Active === 1 || d.Is_Active === true,
      });
    } catch {
      setForm({
        User_ID: u.User_ID, employeeId: u.Employee_ID || '',
        username: u.Username || '', password: '', confirmPassword: '',
        fullName: u.Full_Name || '', role: u.Role || 'Loader',
        email: u.Email || '', phone: u.Phone || '',
        department: u.Department || '', designation: u.Designation || '',
        isActive: u.Is_Active === 1 || u.Is_Active === true,
      });
    }
    setDialogOpen(true);
  }, []);

  const validateForm = useCallback(() => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.role) errs.role = 'Role is required';
    if (dialogMode === 'add') {
      if (!form.username.trim()) errs.username = 'Username is required';
      else if (form.username.trim().length < 3) errs.username = 'Must be at least 3 characters';
      if (!form.password) errs.password = 'Password is required';
      else if (form.password.length < 8) errs.password = 'Must be at least 8 characters';
      else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(form.password))
        errs.password = 'Must include uppercase, lowercase, number, and special character';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (form.phone && !/^[+]?[\d\s()-]{7,20}$/.test(form.phone)) errs.phone = 'Invalid phone';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, dialogMode]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;
    setSaving(true); setError('');
    try {
      const payload = {
        employeeId: form.employeeId.trim() || null, fullName: form.fullName.trim(),
        role: form.role, email: form.email.trim() || null, phone: form.phone.trim() || null,
        department: form.department.trim() || null, designation: form.designation.trim() || null,
      };
      if (dialogMode === 'add') {
        payload.username = form.username.trim(); payload.password = form.password;
        await userService.createUser(payload);
      } else {
        payload.isActive = form.isActive;
        await userService.updateUser(form.User_ID, payload);
      }
      setDialogOpen(false); fetchUsers();
    } catch (e) { setError(e.response?.data?.error?.message || 'Save failed'); }
    finally { setSaving(false); }
  }, [validateForm, form, dialogMode, fetchUsers]);

  // ── Confirm Actions ──────────────────────────────────────────────────────────

  const handleConfirmAction = useCallback(async () => {
    setConfirmLoading(true);
    try {
      if (confirmDialog.action === 'deactivate')
        await userService.deactivateUser(confirmDialog.user.User_ID);
      else if (confirmDialog.action === 'activate')
        await userService.activateUser(confirmDialog.user.User_ID);
      else if (confirmDialog.action === 'delete')
        await userService.deleteUser(confirmDialog.user.User_ID);
      setConfirmDialog({ open: false, action: null, user: null });
      if (drawerOpen && drawerUser?.User_ID === confirmDialog.user?.User_ID) closeDrawer();
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Action failed');
      setConfirmDialog({ open: false, action: null, user: null });
    } finally { setConfirmLoading(false); }
  }, [confirmDialog, drawerOpen, drawerUser, closeDrawer, fetchUsers]);

  const handleResetPassword = useCallback(async () => {
    setResetting(true);
    try {
      const res = await userService.resetPassword(resetDialog.user.User_ID);
      setResetDialog(prev => ({ ...prev, tempPassword: res.data?.data?.tempPassword || '' }));
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Password reset failed');
      setResetDialog({ open: false, user: null, tempPassword: '' });
    } finally { setResetting(false); }
  }, [resetDialog.user]);

  const getConfirmProps = useCallback(() => {
    const { action, user: u } = confirmDialog;
    if (!u) return { title: '', message: '', severity: 'info', confirmLabel: 'Confirm' };
    if (action === 'deactivate') return { title: 'Deactivate User', message: `Deactivate ${u.Full_Name}? They will lose login access.`, severity: 'warning', confirmLabel: 'Deactivate' };
    if (action === 'activate')   return { title: 'Activate User',   message: `Activate ${u.Full_Name}?`,                                    severity: 'info',    confirmLabel: 'Activate' };
    if (action === 'delete')     return { title: 'Delete User',     message: `Permanently delete ${u.Full_Name}? This cannot be undone.`,    severity: 'danger',  confirmLabel: 'Delete' };
    return { title: '', message: '', severity: 'info', confirmLabel: 'Confirm' };
  }, [confirmDialog]);

  // ── Bulk Actions ─────────────────────────────────────────────────────────────

  const handleBulkActivate = useCallback(async () => {
    for (const id of selected) {
      const r = rows.find(x => x.User_ID === id);
      if (r && r.Status !== 'Active') await userService.activateUser(id).catch(() => {});
    }
    setSelected([]); fetchUsers();
  }, [selected, rows, fetchUsers]);

  const handleBulkDeactivate = useCallback(async () => {
    for (const id of selected) {
      const r = rows.find(x => x.User_ID === id);
      if (r && r.Status === 'Active') await userService.deactivateUser(id).catch(() => {});
    }
    setSelected([]); fetchUsers();
  }, [selected, rows, fetchUsers]);

  // ── Row keyboard handler ──────────────────────────────────────────────────────

  const handleRowKeyDown = useCallback((e, row) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(row); }
  }, [openDrawer]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const confirmProps = getConfirmProps();
  const allSelected = displayRows.length > 0 && selected.length === displayRows.length;
  const someSelected = selected.length > 0 && selected.length < displayRows.length;

  const hasFilters = search || roleFilter !== 'all' || statusFilter !== 'all';

  // Columns visibility
  const showLastLogin  = !isMobile;
  const showEmployeeId = !isTablet;
  const showDept       = !isTablet;

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box sx={{ pb: 3 }}>

        {/* ── Phase 1: Enterprise Header ──────────────────────────────────── */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography variant="h1" sx={{ mb: 0.5 }}>User Management</Typography>
            <Typography variant="body2" color="text.secondary">
              System users, roles, and access administration
            </Typography>
          </Box>
          {/* Summary chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip label={`Total: ${totalCount}`}       size="small" icon={<PeopleIcon />} variant="outlined" />
            <Chip label={`Active: ${kpiCounts.active}`}   size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', border: 'none' }} />
            <Chip label={`Inactive: ${kpiCounts.inactive}`} size="small" sx={{ bgcolor: '#F5F5F5', color: '#9E9E9E', border: 'none' }} />
            <Chip label={`Admins: ${kpiCounts.admins}`}   size="small" sx={{ bgcolor: '#E3F0FF', color: '#0F4C81', border: 'none' }} />
            <Chip label={`Operators: ${kpiCounts.operators}`} size="small" sx={{ bgcolor: '#FFF2D6', color: '#E65100', border: 'none' }} />
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
        )}

        {/* ── Phase 10: KPI Cards ─────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <KpiCard icon={<PeopleIcon />}       label="Total Users"     value={totalCount}           color="#0F4C81" />
          <KpiCard icon={<AdminIcon />}         label="Administrators"  value={kpiCounts.admins}     color="#7B1FA2" />
          <KpiCard icon={<OperatorIcon />}      label="Operators"       value={kpiCounts.operators}  color="#E65100" />
          <KpiCard icon={<ActiveIcon />}        label="Active"          value={kpiCounts.active}     color="#2E7D32" />
          <KpiCard icon={<InactiveIcon />}      label="Inactive"        value={kpiCounts.inactive}   color="#9E9E9E" />
          <KpiCard icon={<LoginIcon />}         label="Logged In Today" value={kpiCounts.loggedToday}color="#1565C0" />
        </Box>

        {/* ── Phase 2: Toolbar ────────────────────────────────────────────── */}
        <Paper sx={{ p: 1.5, mb: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by name, username, or ID"
            value={search}
            onChange={handleSearchChange}
            size="small"
            hiddenLabel
            sx={{ minWidth: 220, flex: '1 1 220px' }}
            inputProps={{ 'aria-label': 'Search users' }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" fontSize="small" /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setActiveQuickFilter(''); setPage(0); }}
              displayEmpty
              inputProps={{ 'aria-label': 'Filter by role' }}
            >
              <MenuItem value="all">All Roles</MenuItem>
              {ROLE_OPTIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setActiveQuickFilter(''); setPage(0); }}
              displayEmpty
              inputProps={{ 'aria-label': 'Filter by status' }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
              <MenuItem value="Locked">Locked</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Refresh"><IconButton size="small" onClick={fetchUsers} aria-label="Refresh users"><RefreshIcon /></IconButton></Tooltip>
          <Tooltip title="Reset Filters">
            <span>
              <IconButton size="small" onClick={handleResetFilters} disabled={!hasFilters} aria-label="Reset filters"><ResetFilterIcon /></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export CSV">
            <IconButton size="small" onClick={handleExport} aria-label="Export to CSV"><ExportIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openAddDialog} aria-label="Add new user">
            Add User
          </Button>
        </Paper>

        {/* ── Phase 3: Quick Filter Chips ─────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
          {QUICK_FILTERS.map(qf => (
            <Chip
              key={qf.key}
              label={qf.label}
              size="small"
              clickable
              onClick={() => handleQuickFilter(qf)}
              variant={activeQuickFilter === qf.key ? 'filled' : 'outlined'}
              color={activeQuickFilter === qf.key ? 'primary' : 'default'}
              aria-pressed={activeQuickFilter === qf.key}
              sx={{ fontWeight: activeQuickFilter === qf.key ? 600 : 400, transition: 'all 0.15s' }}
            />
          ))}
        </Box>

        {/* ── Phase 6: Bulk Action Bar ────────────────────────────────────── */}
        {selected.length > 0 && (
          <Paper sx={{ px: 2, py: 1, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#E3F0FF', border: '1px solid #BBDEFB', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F4C81', flex: 1 }}>
              {selected.length} user{selected.length !== 1 ? 's' : ''} selected
            </Typography>
            <Button size="small" variant="outlined" startIcon={<ActivateIcon />} onClick={handleBulkActivate} aria-label="Bulk activate">Activate</Button>
            <Button size="small" variant="outlined" color="warning" startIcon={<BlockIcon />} onClick={handleBulkDeactivate} aria-label="Bulk deactivate">Deactivate</Button>
            <Button size="small" variant="outlined" startIcon={<ExportIcon />} onClick={handleExport} aria-label="Export selected">Export</Button>
            <IconButton size="small" onClick={() => setSelected([])} aria-label="Clear selection"><CloseIcon fontSize="small" /></IconButton>
          </Paper>
        )}

        {/* ── Phase 4 + 9: Table with Skeleton ───────────────────────────── */}
        <Paper sx={{ overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ p: 2 }}>
              {[...Array(5)].map((_, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5, alignItems: 'center' }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="rounded" width={140} height={20} />
                  <Skeleton variant="rounded" width={90} height={20} />
                  <Skeleton variant="rounded" width={110} height={20} />
                  <Skeleton variant="rounded" width={70} height={20} />
                  {showLastLogin && <Skeleton variant="rounded" width={120} height={20} />}
                  <Skeleton variant="rounded" width={80} height={20} />
                </Box>
              ))}
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 'calc(100vh - 420px)', minHeight: 200, overflowX: 'auto' }}>
              <Table stickyHeader size="small" aria-label="Users table">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ bgcolor: '#F8FAFD' }}>
                      <Checkbox
                        size="small"
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={handleSelectAll}
                        inputProps={{ 'aria-label': 'Select all users' }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 40, bgcolor: '#F8FAFD' }}>#</TableCell>
                    {showEmployeeId && (
                      <TableCell sx={{ bgcolor: '#F8FAFD' }}>
                        <TableSortLabel active={clientSortBy === 'Employee_ID'} direction={clientSortBy === 'Employee_ID' ? clientSortOrder : 'asc'} onClick={() => handleClientSort('Employee_ID')}>
                          Emp. ID
                        </TableSortLabel>
                      </TableCell>
                    )}
                    <TableCell sx={{ bgcolor: '#F8FAFD' }}>
                      <TableSortLabel active={clientSortBy === 'Full_Name'} direction={clientSortBy === 'Full_Name' ? clientSortOrder : 'asc'} onClick={() => handleClientSort('Full_Name')}>
                        Name
                      </TableSortLabel>
                    </TableCell>
                    {!isMobile && (
                      <TableCell sx={{ bgcolor: '#F8FAFD' }}>
                        <TableSortLabel active={clientSortBy === 'Username'} direction={clientSortBy === 'Username' ? clientSortOrder : 'asc'} onClick={() => handleClientSort('Username')}>
                          Username
                        </TableSortLabel>
                      </TableCell>
                    )}
                    <TableCell sx={{ bgcolor: '#F8FAFD' }}>
                      <TableSortLabel active={clientSortBy === 'Role'} direction={clientSortBy === 'Role' ? clientSortOrder : 'asc'} onClick={() => handleClientSort('Role')}>
                        Role
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#F8FAFD' }}>
                      <TableSortLabel active={clientSortBy === 'Status'} direction={clientSortBy === 'Status' ? clientSortOrder : 'asc'} onClick={() => handleClientSort('Status')}>
                        Status
                      </TableSortLabel>
                    </TableCell>
                    {showLastLogin && (
                      <TableCell sx={{ bgcolor: '#F8FAFD' }}>
                        <TableSortLabel active={clientSortBy === 'Last_Login_At'} direction={clientSortBy === 'Last_Login_At' ? clientSortOrder : 'asc'} onClick={() => handleClientSort('Last_Login_At')}>
                          Last Login
                        </TableSortLabel>
                      </TableCell>
                    )}
                    <TableCell align="right" sx={{ bgcolor: '#F8FAFD' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>

                {/* ── Phase 8: Empty States ──────────────────────────────── */}
                {displayRows.length === 0 ? (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                        <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
                          {statusFilter === 'Inactive' ? 'No inactive users.' : 'No users match your filters.'}
                        </Typography>
                        {hasFilters && (
                          <Button variant="outlined" size="small" startIcon={<ResetFilterIcon />} onClick={handleResetFilters}>
                            Reset Filters
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                ) : (
                  <TableBody>
                    {displayRows.map((row, idx) => {
                      const isSelected = selected.includes(row.User_ID);
                      return (
                        <TableRow
                          key={row.User_ID}
                          selected={isSelected}
                          hover
                          tabIndex={0}
                          onClick={() => openDrawer(row)}
                          onKeyDown={(e) => handleRowKeyDown(e, row)}
                          aria-label={`User ${row.Full_Name}, ${row.Role}, ${row.Status}`}
                          sx={{
                            cursor: 'pointer',
                            height: 48,
                            bgcolor: idx % 2 === 0 ? 'inherit' : '#FAFBFC',
                            '&:hover': { bgcolor: '#F0F4F8 !important' },
                            '&.Mui-selected': { bgcolor: '#E3F0FF !important' },
                          }}
                        >
                          <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              onChange={() => handleSelectRow(row.User_ID)}
                              inputProps={{ 'aria-label': `Select ${row.Full_Name}` }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                            {page * pageSize + idx + 1}
                          </TableCell>
                          {showEmployeeId && (
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              {row.Employee_ID || '—'}
                            </TableCell>
                          )}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', bgcolor: '#0F4C81', flexShrink: 0 }}>
                                {getInitials(row.Full_Name)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>{row.Full_Name}</Typography>
                                {isMobile && <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{row.Username}</Typography>}
                              </Box>
                            </Box>
                          </TableCell>
                          {!isMobile && (
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
                              {row.Username}
                            </TableCell>
                          )}
                          <TableCell><RoleChip role={row.Role} /></TableCell>
                          <TableCell><StatusBadge status={row.Status} /></TableCell>
                          {showLastLogin && (
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                              {formatDate(row.Last_Login_At)}
                            </TableCell>
                          )}
                          {/* ── Phase 7: Actions Column ─────────────────── */}
                          <TableCell align="right" onClick={e => e.stopPropagation()}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
                              <Tooltip title="View details">
                                <IconButton size="small" onClick={() => openDrawer(row)} aria-label={`View ${row.Full_Name}`} sx={{ p: 0.5 }}>
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="More actions">
                                <IconButton
                                  size="small"
                                  aria-label={`More actions for ${row.Full_Name}`}
                                  sx={{ p: 0.5 }}
                                  onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuUser(row); }}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                )}
              </Table>
            </TableContainer>
          )}
          {!loading && (
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              rowsPerPage={pageSize}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handlePageSizeChange}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          )}
        </Paper>

        {/* ── Overflow Action Menu ─────────────────────────────────────────── */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => { setMenuAnchor(null); setMenuUser(null); }}
          PaperProps={{ sx: { minWidth: 180 } }}
        >
          <MenuItem onClick={() => { openEditDialog(menuUser); setMenuAnchor(null); setMenuUser(null); }}>
            <EditIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Edit
          </MenuItem>
          <MenuItem onClick={() => { setResetDialog({ open: true, user: menuUser, tempPassword: '' }); setMenuAnchor(null); setMenuUser(null); }}>
            <ResetIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Reset Password
          </MenuItem>
          {menuUser?.Status === 'Active' && (
            <MenuItem onClick={() => { setConfirmDialog({ open: true, action: 'deactivate', user: menuUser }); setMenuAnchor(null); setMenuUser(null); }}>
              <BlockIcon fontSize="small" sx={{ mr: 1.5, color: 'warning.main' }} /> Deactivate
            </MenuItem>
          )}
          {menuUser?.Status !== 'Active' && (
            <MenuItem onClick={() => { setConfirmDialog({ open: true, action: 'activate', user: menuUser }); setMenuAnchor(null); setMenuUser(null); }}>
              <ActivateIcon fontSize="small" sx={{ mr: 1.5, color: 'success.main' }} /> Activate
            </MenuItem>
          )}
          <Divider />
          <MenuItem
            onClick={() => { setConfirmDialog({ open: true, action: 'delete', user: menuUser }); setMenuAnchor(null); setMenuUser(null); }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
          </MenuItem>
        </Menu>

        {/* ── Phase 5: User Detail Drawer ─────────────────────────────────── */}
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={closeDrawer}
          PaperProps={{ sx: { width: { xs: '100vw', sm: 400 }, p: 3 } }}
          aria-label="User detail drawer"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h3">User Details</Typography>
            <IconButton onClick={closeDrawer} aria-label="Close drawer" size="small"><CloseIcon /></IconButton>
          </Box>

          {drawerLoading ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Skeleton variant="circular" width={64} height={64} />
                <Box sx={{ flex: 1 }}><Skeleton variant="rounded" width="60%" height={20} sx={{ mb: 0.75 }} /><Skeleton variant="rounded" width="40%" height={16} /></Box>
              </Box>
              {[...Array(6)].map((_, i) => <Skeleton key={i} variant="rounded" height={18} sx={{ mb: 1 }} />)}
            </Box>
          ) : drawerUser ? (
            <>
              {/* Avatar + name */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                <Avatar sx={{ width: 64, height: 64, fontSize: '1.25rem', bgcolor: '#0F4C81' }}>
                  {getInitials(drawerUser.Full_Name)}
                </Avatar>
                <Box>
                  <Typography variant="h3" sx={{ mb: 0.5 }}>{drawerUser.Full_Name}</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>@{drawerUser.Username}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                    <RoleChip role={drawerUser.Role} />
                    <StatusBadge status={drawerUser.Status} />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Details grid */}
              <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                {[
                  { label: 'Employee ID',  value: drawerUser.Employee_ID || '—' },
                  { label: 'User ID',      value: drawerUser.User_ID },
                  { label: 'Email',        value: drawerUser.Email || '—' },
                  { label: 'Phone',        value: drawerUser.Phone || '—' },
                  { label: 'Department',   value: drawerUser.Department || '—' },
                  { label: 'Designation',  value: drawerUser.Designation || '—' },
                  { label: 'Last Login',   value: formatDate(drawerUser.Last_Login_At) },
                  { label: 'Created',      value: formatDate(drawerUser.Created_At) },
                  { label: 'Created By',   value: drawerUser.Created_By_Name || `User #${drawerUser.Created_By}` || '—' },
                ].map(({ label, value }) => (
                  <Grid item xs={6} key={label}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* Quick actions */}
              <Typography variant="h5" sx={{ mb: 1.5 }}>Quick Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => { openEditDialog(drawerUser); closeDrawer(); }} aria-label="Edit user">
                  Edit User
                </Button>
                <Button fullWidth variant="outlined" startIcon={<ResetIcon />} onClick={() => { setResetDialog({ open: true, user: drawerUser, tempPassword: '' }); }} aria-label="Reset password">
                  Reset Password
                </Button>
                {drawerUser.Status === 'Active' ? (
                  <Button fullWidth variant="outlined" color="warning" startIcon={<BlockIcon />}
                    onClick={() => setConfirmDialog({ open: true, action: 'deactivate', user: drawerUser })}
                    aria-label="Deactivate user">
                    Deactivate
                  </Button>
                ) : (
                  <Button fullWidth variant="outlined" color="success" startIcon={<ActivateIcon />}
                    onClick={() => setConfirmDialog({ open: true, action: 'activate', user: drawerUser })}
                    aria-label="Activate user">
                    Activate
                  </Button>
                )}
                <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />}
                  onClick={() => setConfirmDialog({ open: true, action: 'delete', user: drawerUser })}
                  aria-label="Delete user">
                  Delete User
                </Button>
              </Box>
            </>
          ) : (
            <Typography color="text.secondary">Failed to load user details.</Typography>
          )}
        </Drawer>

        {/* ── Add / Edit Dialog ───────────────────────────────────────────── */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth aria-labelledby="user-dialog-title">
          <DialogTitle id="user-dialog-title" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {dialogMode === 'add' ? 'Add User' : 'Edit User'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
              <FormSection title="Personal Details">
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}><TextField label="Employee ID" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} fullWidth /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Full Name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required error={!!formErrors.fullName} helperText={formErrors.fullName} fullWidth /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} error={!!formErrors.email} helperText={formErrors.email} fullWidth /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} error={!!formErrors.phone} helperText={formErrors.phone} fullWidth /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} fullWidth /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Designation" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} fullWidth /></Grid>
                </Grid>
              </FormSection>
              <FormSection title="Login">
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={dialogMode === 'add' ? 6 : 12}>
                    <TextField label="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required={dialogMode === 'add'} disabled={dialogMode === 'edit'} error={!!formErrors.username} helperText={formErrors.username} fullWidth />
                  </Grid>
                  {dialogMode === 'add' && (
                    <>
                      <Grid item xs={12} sm={6}><TextField label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required error={!!formErrors.password} helperText={formErrors.password} fullWidth /></Grid>
                      <Grid item xs={12} sm={6}><TextField label="Confirm Password" type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required error={!!formErrors.confirmPassword} helperText={formErrors.confirmPassword} fullWidth /></Grid>
                    </>
                  )}
                </Grid>
                {dialogMode === 'edit' && (
                  <Box sx={{ mt: 0.5 }}>
                    <Button variant="outlined" startIcon={<ResetIcon />} size="small" onClick={() => setResetDialog({ open: true, user: rows.find(r => r.User_ID === form.User_ID) || null, tempPassword: '' })} aria-label="Reset password for this user">
                      Reset Password
                    </Button>
                  </Box>
                )}
              </FormSection>
              <FormSection title="Role">
                <TextField select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required error={!!formErrors.role} helperText={formErrors.role} fullWidth>
                  {ROLE_OPTIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                </TextField>
              </FormSection>
              {dialogMode === 'edit' && (
                <FormSection title="Status">
                  <TextField select label="Status" value={form.isActive ? 'Active' : 'Inactive'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'Active' }))} fullWidth>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </TextField>
                </FormSection>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving} aria-label={saving ? 'Saving' : 'Save user'}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Reset Password Dialog ───────────────────────────────────────── */}
        <Dialog open={resetDialog.open} onClose={() => setResetDialog({ open: false, user: null, tempPassword: '' })} maxWidth="xs" fullWidth aria-labelledby="reset-dialog-title">
          <DialogTitle id="reset-dialog-title" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>Reset Password</DialogTitle>
          <DialogContent>
            {resetDialog.tempPassword ? (
              <Box sx={{ mt: 1 }}>
                <Alert severity="success" sx={{ mb: 2 }}>Password has been reset successfully.</Alert>
                <Typography variant="body2" gutterBottom>
                  Temporary password for <strong>{resetDialog.user?.Username}</strong>:
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace', fontSize: '1.1rem', textAlign: 'center', mb: 2 }}>
                  {resetDialog.tempPassword}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  The user will be required to change this password on next login.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" gutterBottom>
                  Reset password for <strong>{resetDialog.user?.Full_Name}</strong>?
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  A temporary password will be generated. The user must change it on next login.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {resetDialog.tempPassword ? (
              <Button variant="contained" onClick={() => setResetDialog({ open: false, user: null, tempPassword: '' })}>Done</Button>
            ) : (
              <>
                <Button onClick={() => setResetDialog({ open: false, user: null, tempPassword: '' })} disabled={resetting}>Cancel</Button>
                <Button variant="contained" onClick={handleResetPassword} disabled={resetting} aria-label={resetting ? 'Resetting password' : 'Reset password'}>
                  {resetting ? 'Resetting…' : 'Reset Password'}
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* ── Confirmation Dialog ─────────────────────────────────────────── */}
        <ConfirmationDialog
          open={confirmDialog.open}
          title={confirmProps.title}
          message={confirmProps.message}
          severity={confirmProps.severity}
          confirmLabel={confirmProps.confirmLabel}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmDialog({ open: false, action: null, user: null })}
          loading={confirmLoading}
        />

      </Box>
    </PortalLayout>
  );
}
