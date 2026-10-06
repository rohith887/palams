import { useState, useCallback, useEffect, useMemo, Fragment } from 'react';
import {
  Box, TextField, MenuItem, Button, Alert,
  IconButton, Tooltip, Typography, Grid, Link, Paper, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Drawer, TablePagination, Skeleton, Stack,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon,
  History as HistoryIcon, NavigateNext as NavigateNextIcon,
  Security as SecurityIcon,
  Person as PersonIcon, Computer as ComputerIcon,
  AccessTime as AccessTimeIcon,
  Visibility as ViewIcon, Close as CloseIcon,
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Print as PrintIcon,
  Event as EventIcon,
  Today as TodayIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  AccountTree as AccountTreeIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PortalLayout from '../../../components/layout/PortalLayout';
import PageHeader from '../../../components/common/PageHeader';
import EmptyState from '../../../components/common/EmptyState';
import useAuth from '../../../hooks/useAuth';
import auditService from '../../../services/auditService';

const ACTION_ICONS = {
  START_LOADING: '\u2B07', COMPLETE_LOADING: '\u2713',
  START_UNLOADING: '\u2B06', COMPLETE_UNLOADING: '\u2713',
  START_CLEANING: '\uD83E\uDDF9', COMPLETE_CLEANING: '\u2713',
  START_QA: '\uD83D\uDD2C', COMPLETE_QA: '\u2713',
  QA_PASSED: '\u2705', QA_FAILED: '\u274C',
  STATUS_CHANGED: '\uD83D\uDD04', BIN_UPDATED: '\u270F\uFE0F',
  REMARKS_UPDATED: '\uD83D\uDCAC', QR_REGENERATED: '\uD83D\uDD32',
  QR_SCANNED: '\uD83D\uDCF7', REPORT_GENERATED: '\uD83D\uDCC4',
  EXPORTED: '\uD83D\uDCE4', ADMIN_ACTION: '\uD83D\uDEE1\uFE0F',
};

const ACTION_COLORS = {
  START_LOADING: '#1565C0', COMPLETE_LOADING: '#2E7D32',
  START_UNLOADING: '#E65100', COMPLETE_UNLOADING: '#2E7D32',
  START_CLEANING: '#00838F', COMPLETE_CLEANING: '#2E7D32',
  START_QA: '#7B1FA2', COMPLETE_QA: '#2E7D32',
  QA_PASSED: '#2E7D32', QA_FAILED: '#C62828',
  STATUS_CHANGED: '#F57C00', BIN_UPDATED: '#1565C0',
  REMARKS_UPDATED: '#6A1B9A', QR_REGENERATED: '#00695C',
  REPORT_GENERATED: '#3E2723', EXPORTED: '#424242',
  ADMIN_ACTION: '#B71C1C',
};

const STATUS_CHIP_COLOR = {
  START_LOADING: 'info', COMPLETE_LOADING: 'success',
  START_UNLOADING: 'warning', COMPLETE_UNLOADING: 'success',
  START_CLEANING: 'info', COMPLETE_CLEANING: 'success',
  START_QA: 'secondary', COMPLETE_QA: 'success',
  QA_PASSED: 'success', QA_FAILED: 'error',
  STATUS_CHANGED: 'warning', BIN_UPDATED: 'info',
  REMARKS_UPDATED: 'secondary', QR_REGENERATED: 'success',
  QR_SCANNED: 'info', REPORT_GENERATED: 'default',
  EXPORTED: 'default', ADMIN_ACTION: 'error',
};

const MODULE_MAP = {
  START_LOADING: 'Loading', COMPLETE_LOADING: 'Loading',
  START_UNLOADING: 'Unloading', COMPLETE_UNLOADING: 'Unloading',
  START_CLEANING: 'Cleaning', COMPLETE_CLEANING: 'Cleaning',
  START_QA: 'QA', COMPLETE_QA: 'QA',
  QA_PASSED: 'QA', QA_FAILED: 'QA',
  STATUS_CHANGED: 'Admin', BIN_UPDATED: 'Admin',
  REMARKS_UPDATED: 'Admin', QR_REGENERATED: 'Admin',
  QR_SCANNED: 'Operations', REPORT_GENERATED: 'Reports',
  EXPORTED: 'Reports', ADMIN_ACTION: 'Admin',
};

const MODULE_COLORS = {
  Loading: { bg: '#E3F2FD', text: '#1565C0' },
  Unloading: { bg: '#FFF3E0', text: '#E65100' },
  Cleaning: { bg: '#E0F7FA', text: '#00838F' },
  QA: { bg: '#F3E5F5', text: '#7B1FA2' },
  Admin: { bg: '#FBE9E7', text: '#BF360C' },
  Operations: { bg: '#E8F5E9', text: '#2E7D32' },
  Reports: { bg: '#ECEFF1', text: '#37474F' },
  System: { bg: '#F5F5F5', text: '#616161' },
};

const EMPTY_FILTERS = { actorId: '', actionType: '', targetEntity: '', fromDate: '', toDate: '' };

const SUCCESS_TYPES = ['COMPLETE_LOADING', 'COMPLETE_UNLOADING', 'COMPLETE_CLEANING', 'COMPLETE_QA', 'QA_PASSED'];
const FAILED_TYPES = ['QA_FAILED'];
const WARNING_TYPES = ['STATUS_CHANGED', 'REMARKS_UPDATED'];

function KpiCard({ icon, value, label, color, onClick }) {
  return (
    <Paper
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      sx={{
        p: 1.5, height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        '&:hover': onClick ? { borderColor: 'primary.main', boxShadow: '0 2px 8px rgba(15,76,129,0.1)' } : {},
      }}
      elevation={0}
      variant="outlined"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box sx={{ color: color || 'primary.main', opacity: 0.85, '& .MuiSvgIcon-root': { fontSize: 22 } }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.1, color: color || 'text.primary' }}>
            {value ?? '\u2014'}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', fontWeight: 500, display: 'block', mt: 0.15 }}>
            {label}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

function TableSkeleton() {
  return (
    <Box>
      <Stack spacing={0.5} sx={{ mb: 1 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, px: 1 }}>
            <Skeleton variant="rounded" width={52} height={20} />
            <Skeleton variant="rounded" width={90} height={20} />
            <Skeleton variant="rounded" width={80} height={20} />
            <Skeleton variant="rounded" width={60} height={20} />
            <Skeleton variant="rounded" width={50} height={20} />
            <Skeleton variant="rounded" width={70} height={20} />
            <Skeleton variant="rounded" width={24} height={20} sx={{ ml: 'auto' }} />
          </Box>
        ))}
      </Stack>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
        <Skeleton variant="rounded" width={100} height={24} />
      </Box>
    </Box>
  );
}

function getTodayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export default function AuditTrail() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlBinNumber = searchParams.get('binNumber');
  const urlTargetId = searchParams.get('targetId');
  const urlTargetEntity = searchParams.get('targetEntity');

  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    targetEntity: urlTargetEntity || urlBinNumber || '',
    targetId: urlTargetId || '',
  });
  const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_FILTERS });
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [actors, setActors] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [drawerEvent, setDrawerEvent] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [actorsRes, typesRes] = await Promise.all([
          auditService.getActors(), auditService.getActionTypes(),
        ]);
        setActors(actorsRes.data?.data || []);
        setActionTypes(typesRes.data?.data || []);
      } catch {}
    })();
  }, []);

  const fetchData = useCallback(async (f, p, ps) => {
    setError(''); setLoading(true);
    try {
      const res = await auditService.getAuditLog({
        actorId: f.actorId || undefined, actionType: f.actionType || undefined,
        targetEntity: f.targetEntity || undefined, targetId: f.targetId || undefined,
        fromDate: f.fromDate || undefined, toDate: f.toDate || undefined,
        page: p + 1, pageSize: ps,
      });
      const data = res.data?.data || {};
      setRows(data.rows || []);
      setTotalCount(data.totalCount || 0);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Failed to load audit log');
      setRows([]); setTotalCount(0);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const shouldAutoSearch = urlBinNumber || urlTargetId;
    if (shouldAutoSearch) {
      const initFilters = {
        ...EMPTY_FILTERS,
        targetEntity: urlTargetEntity || urlBinNumber || '',
        targetId: urlTargetId || '',
      };
      setFilters(initFilters); setHasSearched(true); setPage(0);
      setAppliedFilters(initFilters); fetchData(initFilters, 0, pageSize);
    }
  }, []);

  const handleSearch = useCallback(() => {
    setHasSearched(true); setPage(0);
    setAppliedFilters({ ...filters });
    fetchData(filters, 0, pageSize);
  }, [filters, pageSize, fetchData]);

  const handleReset = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
    setAppliedFilters({ ...EMPTY_FILTERS });
    setRows([]); setTotalCount(0); setPage(0);
    setHasSearched(false); setError('');
    setDrawerEvent(null);
  }, []);

  const handlePageChange = useCallback((_, newPage) => {
    setPage(newPage);
    fetchData(appliedFilters, newPage, pageSize);
  }, [appliedFilters, pageSize, fetchData]);

  const handlePageSizeChange = useCallback((e) => {
    const s = Number(e.target.value);
    setPageSize(s);
    setPage(0);
    fetchData(appliedFilters, 0, s);
  }, [appliedFilters, fetchData]);

  const filterField = useCallback((name) => ({
    value: filters[name],
    onChange: (e) => setFilters((prev) => ({ ...prev, [name]: e.target.value })),
  }), [filters]);

  const handleExportExcel = useCallback(() => {
    const data = rows.map(r => ({
      Time: fmtTimeOnly(r.Timestamp ?? r.timestamp),
      Action: (r.Action_Type ?? r.action_type ?? '').replace(/_/g, ' '),
      Operator: r.Actor_Full_Name ?? r.actor_full_name ?? '',
      Module: MODULE_MAP[r.Action_Type ?? r.action_type] || '',
      Target: `${r.Target_Entity || ''} #${r.Target_ID || ''}`,
      'IP Address': r.IP_Address ?? '',
      Status: getStatusLabel(r.Action_Type ?? r.action_type),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');
    XLSX.writeFile(wb, 'PBLMS_Audit_Trail.xlsx');
  }, [rows]);

  const handleExportPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(9);
    doc.text('Audit Trail - PBLMS', 14, 12);
    const head = [['Time', 'Action', 'Operator', 'Module', 'Target', 'IP', 'Status']];
    const body = rows.map(r => [
      fmtTimeOnly(r.Timestamp ?? r.timestamp),
      ((r.Action_Type ?? r.action_type) || '').replace(/_/g, ' '),
      r.Actor_Full_Name ?? r.actor_full_name ?? '',
      MODULE_MAP[r.Action_Type ?? r.action_type] || '',
      `${r.Target_Entity || ''} #${r.Target_ID || ''}`,
      r.IP_Address ?? '',
      getStatusLabel(r.Action_Type ?? r.action_type),
    ]);
    doc.autoTable({ head, body, startY: 16, styles: { fontSize: 7 }, headStyles: { fontSize: 7, fillColor: [15, 76, 129] } });
    doc.save('PBLMS_Audit_Trail.pdf');
  }, [rows]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const filteredByBin = Boolean(urlBinNumber);

  const kpis = useMemo(() => {
    const today = getTodayStr();
    const todayEvents = rows.filter(r => {
      const ts = r.Timestamp ?? r.timestamp;
      return ts && ts.startsWith(today);
    }).length;
    const uniqueOps = new Set(rows.map(r => r.Actor_Full_Name ?? r.actor_full_name).filter(Boolean)).size;
    const success = rows.filter(r => SUCCESS_TYPES.includes(r.Action_Type ?? r.action_type)).length;
    const failed = rows.filter(r => FAILED_TYPES.includes(r.Action_Type ?? r.action_type)).length;
    const warnings = rows.filter(r => WARNING_TYPES.includes(r.Action_Type ?? r.action_type)).length;
    return { totalEvents: totalCount, todayEvents, uniqueOps, success, failed, warnings };
  }, [rows, totalCount]);

  const dateRangeLabel = useMemo(() => {
    if (!hasSearched || rows.length === 0) return null;
    const first = rows[0]?.Timestamp ?? rows[0]?.timestamp;
    const last = rows[rows.length - 1]?.Timestamp ?? rows[rows.length - 1]?.timestamp;
    if (!first && !last) return null;
    return `${fmtDate(first)} \u2014 ${fmtDate(last)}`;
  }, [hasSearched, rows]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.actorId) count++;
    if (appliedFilters.actionType) count++;
    if (appliedFilters.targetEntity) count++;
    if (appliedFilters.fromDate) count++;
    if (appliedFilters.toDate) count++;
    return count;
  }, [appliedFilters]);

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box sx={{ '& .MuiPaper-root': { borderRadius: '8px' } }}>
        {/* Breadcrumbs */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate('/admin/bin-summary')}
            sx={{ cursor: 'pointer', fontSize: '0.68rem', fontWeight: 500, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
          >
            Bin Summary
          </Link>
          <NavigateNextIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'primary.main', fontWeight: 600 }}>Audit Trail</Typography>
          {filteredByBin && (
            <Fragment>
              <NavigateNextIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
              <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 600, fontFamily: 'monospace' }}>{urlBinNumber}</Typography>
            </Fragment>
          )}
        </Box>

        {/* Page Header */}
        <PageHeader
          title="Audit Trail"
          subtitle={filteredByBin ? `Forensic event log for ${urlBinNumber}` : 'Complete forensic history of all system activities'}
        >
          {filteredByBin && (
            <Tooltip title="Back to Bin Summary">
              <IconButton size="small" onClick={() => navigate('/admin/bin-summary')} sx={{ p: 0.75 }} aria-label="Back to Bin Summary">
                <ArrowBackIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          {filteredByBin && (
            <Tooltip title="View Bin History">
              <IconButton size="small" onClick={() => navigate(`/admin/audit/bin-history?binNumber=${urlBinNumber}`)} sx={{ p: 0.75 }} aria-label="Bin History">
                <HistoryIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Refresh data">
            <span>
              <IconButton size="small" onClick={handleSearch} disabled={loading} sx={{ p: 0.75 }} aria-label="Refresh">
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export to Excel">
            <span>
              <IconButton size="small" onClick={handleExportExcel} disabled={!rows.length || loading} sx={{ p: 0.75 }} aria-label="Export Excel">
                <FileDownloadIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export to PDF">
            <span>
              <IconButton size="small" onClick={handleExportPdf} disabled={!rows.length || loading} sx={{ p: 0.75 }} aria-label="Export PDF">
                <PictureAsPdfIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Print">
            <span>
              <IconButton size="small" onClick={handlePrint} disabled={!rows.length} sx={{ p: 0.75 }} aria-label="Print">
                <PrintIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </PageHeader>

        {/* KPI Summary Cards */}
        {hasSearched && !loading && rows.length > 0 && (
          <Grid container spacing={0.75} sx={{ mb: 1 }}>
            <Grid item xs={6} sm={4} md={2}>
              <KpiCard icon={<SecurityIcon />} value={kpis.totalEvents} label="Total Events" color="#1565C0" />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <KpiCard icon={<TodayIcon />} value={kpis.todayEvents} label="Today's Events" color="#2E7D32" />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <KpiCard icon={<PersonIcon />} value={kpis.uniqueOps} label="Unique Operators" color="#7B1FA2" />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <KpiCard icon={<CheckCircleIcon />} value={kpis.success} label="Success Events" color="#2E7D32" />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <KpiCard icon={<ErrorIcon />} value={kpis.failed} label="Failed Events" color="#C62828" />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <KpiCard icon={<WarningIcon />} value={kpis.warnings} label="Warnings" color="#F57C00" />
            </Grid>
          </Grid>
        )}

        {/* Filter Toolbar — compact single row, no wrapper */}
        <Box sx={{ mb: 1 }}>
          <Grid container spacing={0.75} alignItems="center">
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth size="small" placeholder="Search by entity or bin..."
                {...filterField('targetEntity')}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ fontSize: 15, color: 'action.disabled', mr: 0.5 }} />,
                }}
                inputProps={{ 'aria-label': 'Search activities' }}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.7rem', height: 36 } }}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.75}>
              <TextField
                select fullWidth size="small"
                SelectProps={{ displayEmpty: true }}
                {...filterField('actorId')}
                inputProps={{ 'aria-label': 'Filter by actor' }}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.7rem', height: 36 } }}
              >
                <MenuItem value="">Actor</MenuItem>
                {actors.map((a) => (
                  <MenuItem key={a.User_ID ?? a.user_id} value={a.User_ID ?? a.user_id}>
                    {a.Full_Name ?? a.full_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3} md={1.75}>
              <TextField
                select fullWidth size="small"
                SelectProps={{ displayEmpty: true }}
                {...filterField('actionType')}
                inputProps={{ 'aria-label': 'Filter by action' }}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.7rem', height: 36 } }}
              >
                <MenuItem value="">Action</MenuItem>
                {actionTypes.map((t) => (
                  <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                type="date" fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                {...filterField('fromDate')}
                inputProps={{ 'aria-label': 'From date' }}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.7rem', height: 36 } }}
                label=""
                placeholder="From"
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                type="date" fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                {...filterField('toDate')}
                inputProps={{ 'aria-label': 'To date' }}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.7rem', height: 36 } }}
                label=""
                placeholder="To"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={1.5}>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Button
                  variant="contained" size="small"
                  startIcon={<SearchIcon sx={{ fontSize: 14 }} />}
                  onClick={handleSearch} disabled={loading}
                  sx={{ fontSize: '0.68rem', height: 36, whiteSpace: 'nowrap', minWidth: 80 }}
                  aria-label="Search audit log"
                >
                  Search
                </Button>
                <Tooltip title="Reset filters">
                  <span>
                    <IconButton
                      size="small" onClick={handleReset} disabled={loading}
                      aria-label="Reset filters"
                      sx={{ height: 36, width: 36, border: '1px solid', borderColor: 'divider', borderRadius: '6px' }}
                    >
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 1, fontSize: '0.7rem' }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Summary Chips */}
        {hasSearched && !loading && !error && rows.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, flexWrap: 'wrap' }}>
            <Chip
              icon={<EventIcon sx={{ fontSize: 13 }} />}
              label={`${kpis.totalEvents} events`}
              size="small" variant="outlined"
              sx={{ height: 22, fontSize: '0.6rem', fontWeight: 500 }}
            />
            <Chip
              icon={<PersonIcon sx={{ fontSize: 13 }} />}
              label={`${kpis.uniqueOps} operators`}
              size="small" variant="outlined"
              sx={{ height: 22, fontSize: '0.6rem', fontWeight: 500 }}
            />
            {dateRangeLabel && (
              <Chip
                icon={<AccessTimeIcon sx={{ fontSize: 13 }} />}
                label={dateRangeLabel}
                size="small" variant="outlined"
                sx={{ height: 22, fontSize: '0.6rem', fontWeight: 500 }}
              />
            )}
            {activeFilterCount > 0 && (
              <Chip
                label={`${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
                size="small" color="primary" variant="outlined"
                sx={{ height: 22, fontSize: '0.6rem', fontWeight: 500 }}
              />
            )}
          </Box>
        )}

        {/* Content Area */}
        {loading ? (
          <Paper sx={{ p: 2 }} elevation={0} variant="outlined">
            <TableSkeleton />
          </Paper>
        ) : !hasSearched ? (
          <EmptyState
            icon={<SecurityIcon sx={{ fontSize: 48 }} />}
            title="Audit Trail"
            message="Use the filters above or click Search to explore the complete forensic event log. All system activities are recorded here."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<AccountTreeIcon sx={{ fontSize: 48 }} />}
            title="No audit records found"
            message="No events match your current filter criteria. Try adjusting the search parameters or date range."
            actionLabel="Reset Filters"
            actionIcon={<RefreshIcon />}
            onAction={handleReset}
          />
        ) : (
          <>
            <TableContainer
              component={Paper}
              elevation={0}
              variant="outlined"
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.62rem', py: 0.75, color: 'text.secondary', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.62rem', py: 0.75, color: 'text.secondary', letterSpacing: '0.03em' }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.62rem', py: 0.75, color: 'text.secondary', letterSpacing: '0.03em' }}>Operator</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.62rem', py: 0.75, color: 'text.secondary', letterSpacing: '0.03em' }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.62rem', py: 0.75, color: 'text.secondary', letterSpacing: '0.03em' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.62rem', py: 0.75, color: 'text.secondary', letterSpacing: '0.03em' }}>Target</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.62rem', py: 0.75, color: 'text.secondary', width: 48, letterSpacing: '0.03em' }} align="center">View</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((event, idx) => {
                    const actionType = event.Action_Type ?? event.action_type ?? 'UNKNOWN';
                    const icon = ACTION_ICONS[actionType] || '\u25CF';
                    const actionColor = ACTION_COLORS[actionType] || '#546E7A';
                    const isSuccess = SUCCESS_TYPES.includes(actionType);
                    const isFailed = FAILED_TYPES.includes(actionType);
                    const statusLabel = isSuccess ? 'Success' : isFailed ? 'Failed' : 'Active';
                    const moduleName = MODULE_MAP[actionType] || 'System';
                    const moduleColor = MODULE_COLORS[moduleName] || MODULE_COLORS.System;

                    return (
                      <TableRow
                        key={event.Audit_ID ?? event.audit_id ?? idx}
                        hover
                        sx={{
                          cursor: 'pointer',
                          '&:last-child td': { borderBottom: 0 },
                          '&:hover': { backgroundColor: '#F8FAFD' },
                          transition: 'background-color 0.12s',
                        }}
                        onClick={() => setDrawerEvent(event)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') setDrawerEvent(event); }}
                        role="button"
                        aria-label={`View details for ${actionType.replace(/_/g, ' ')} event`}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.65rem', py: 0.6, whiteSpace: 'nowrap', color: 'text.secondary' }}>
                          {fmtTimeOnly(event.Timestamp ?? event.timestamp)}
                        </TableCell>
                        <TableCell sx={{ py: 0.6 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box
                              sx={{
                                width: 22, height: 22, borderRadius: '4px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: `${actionColor}15`,
                                color: actionColor, fontSize: '0.65rem', lineHeight: 1,
                                flexShrink: 0,
                              }}
                              aria-hidden="true"
                            >
                              {icon}
                            </Box>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, color: actionColor }}>
                              {actionType.replace(/_/g, ' ')}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 0.6 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 500 }}>
                            {event.Actor_Full_Name ?? event.actor_full_name ?? '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.6 }}>
                          <Chip
                            label={moduleName}
                            size="small"
                            sx={{
                              height: 18, fontSize: '0.58rem', fontWeight: 600,
                              backgroundColor: moduleColor.bg, color: moduleColor.text,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.6 }}>
                          <Chip
                            label={statusLabel}
                            size="small"
                            variant="outlined"
                            color={isFailed ? 'error' : isSuccess ? 'success' : 'default'}
                            sx={{ height: 18, fontSize: '0.56rem', fontWeight: 600, borderWidth: '1.5px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.6 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                            {(event.Target_Entity ?? event.target_entity ?? '')}
                            {(event.Target_ID ?? event.target_id) ? ` #${event.Target_ID ?? event.target_id}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.6, textAlign: 'center' }}>
                          <Tooltip title="View details">
                            <IconButton
                              size="small"
                              sx={{ p: 0.25 }}
                              onClick={(e) => { e.stopPropagation(); setDrawerEvent(event); }}
                              aria-label="View event details"
                            >
                              <ViewIcon sx={{ fontSize: 16, color: 'action.active' }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 0.75 }}>
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPage={pageSize}
                onRowsPerPageChange={handlePageSizeChange}
                rowsPerPageOptions={[25, 50, 100]}
                sx={{ '& .MuiTablePagination-toolbar': { minHeight: 36, fontSize: '0.68rem' }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.65rem' } }}
              />
            </Box>
          </>
        )}

        {/* Forensic Inspection Drawer */}
        <Drawer
          anchor="right"
          open={Boolean(drawerEvent)}
          onClose={() => setDrawerEvent(null)}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: 500 },
              p: 0,
              '& .MuiPaper-root': { borderRadius: 0 },
            },
          }}
        >
          {drawerEvent && (() => {
            const ev = drawerEvent;
            const actionType = ev.Action_Type ?? ev.action_type ?? 'UNKNOWN';
            const actionColor = ACTION_COLORS[actionType] || '#546E7A';
            const icon = ACTION_ICONS[actionType] || '\u25CF';
            const moduleName = MODULE_MAP[actionType] || 'System';
            const oldVal = tryParse(ev.Old_Value ?? ev.old_value);
            const newVal = tryParse(ev.New_Value ?? ev.new_value);

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Drawer Header */}
                <Box sx={{
                  p: 2, borderBottom: '1px solid', borderColor: 'divider',
                  background: `linear-gradient(135deg, ${actionColor}08, transparent)`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" sx={{ fontSize: '0.55rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em' }}>
                      Forensic Inspection
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: `${actionColor}15`, color: actionColor, fontSize: '1rem',
                      }}>
                        {icon}
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>
                          {actionType.replace(/_/g, ' ')}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                          <Chip
                            label={moduleName}
                            size="small"
                            sx={{ height: 18, fontSize: '0.55rem', fontWeight: 600, backgroundColor: `${actionColor}15`, color: actionColor }}
                          />
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', fontFamily: 'monospace' }}>
                            #{ev.Audit_ID ?? ev.audit_id ?? '\u2014'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  <Tooltip title="Close">
                    <IconButton size="small" onClick={() => setDrawerEvent(null)} sx={{ p: 0.5 }} aria-label="Close drawer">
                      <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Drawer Timeline Body */}
                <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
                  <Box sx={{ position: 'relative' }}>
                    {/* Timeline line */}
                    <Box sx={{
                      position: 'absolute', left: 9, top: 8, bottom: 8,
                      width: 2, backgroundColor: '#E0E0E0', borderRadius: 1,
                    }} />

                    {/* Time Entry */}
                    <TimelineEntry
                      icon={<AccessTimeIcon />}
                      label="Timestamp"
                      value={fmtDateTimeFull(ev.Timestamp ?? ev.timestamp)}
                      color="#1565C0"
                    />

                    {/* Actor Entry */}
                    <TimelineEntry
                      icon={<PersonIcon />}
                      label="Operator"
                      value={`${ev.Actor_Full_Name ?? ev.actor_full_name ?? `User #${ev.Actor_User_ID ?? ev.actor_user_id}`}`}
                      sub={`Actor ID: #${ev.Actor_User_ID ?? ev.actor_user_id ?? '\u2014'}`}
                      color="#7B1FA2"
                    />

                    {/* Target Entry */}
                    {(ev.Target_Entity ?? ev.target_entity) && (
                      <TimelineEntry
                        icon={<AccountTreeIcon />}
                        label="Target"
                        value={`${ev.Target_Entity ?? ev.target_entity}${(ev.Target_ID ?? ev.target_id) ? ` #${ev.Target_ID ?? ev.target_id}` : ''}`}
                        color="#F57C00"
                      />
                    )}

                    {/* IP & UA */}
                    {ev.IP_Address && (
                      <TimelineEntry
                        icon={<ComputerIcon />}
                        label="IP Address"
                        value={ev.IP_Address}
                        color="#2E7D32"
                      />
                    )}

                    {/* Value Change */}
                    {(oldVal !== null || newVal !== null) && (
                      <Box sx={{ ml: 5, mb: 1.5, position: 'relative' }}>
                        <Box sx={{
                          position: 'absolute', left: -33, top: 6,
                          width: 20, height: 20, borderRadius: '50%',
                          backgroundColor: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid', borderColor: '#FFE0B2', zIndex: 1,
                        }}>
                          <ArrowForwardIcon sx={{ fontSize: 11, color: '#F57C00' }} />
                        </Box>
                        <Typography variant="overline" sx={{ fontSize: '0.55rem', fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Value Change
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75 }}>
                          <Box sx={{
                            flex: 1, p: 1, borderRadius: 1,
                            backgroundColor: '#FFF5F5', border: '1px solid', borderColor: '#FFCDD2',
                          }}>
                            <Typography variant="caption" sx={{ fontSize: '0.52rem', color: 'error.main', fontWeight: 700, display: 'block', mb: 0.25 }}>OLD</Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                              {formatVal(oldVal)}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1, p: 1, borderRadius: 1,
                            backgroundColor: '#F1F8E9', border: '1px solid', borderColor: '#C8E6C9',
                          }}>
                            <Typography variant="caption" sx={{ fontSize: '0.52rem', color: 'success.main', fontWeight: 700, display: 'block', mb: 0.25 }}>NEW</Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                              {formatVal(newVal)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {/* Raw Details */}
                    {ev.Details && (
                      <TimelineEntry
                        icon={<HistoryIcon />}
                        label="Details"
                        value={ev.Details}
                        mono
                        color="#37474F"
                      />
                    )}
                    {ev.User_Agent && (
                      <TimelineEntry
                        icon={<ComputerIcon />}
                        label="User Agent"
                        value={ev.User_Agent}
                        mono
                        color="#546E7A"
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })()}
        </Drawer>
      </Box>
    </PortalLayout>
  );
}

function TimelineEntry({ icon, label, value, sub, color = '#1565C0', mono }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, position: 'relative' }}>
      <Box sx={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        backgroundColor: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid', borderColor: `${color}30`, zIndex: 1, mt: 0.25,
      }}>
        {icon ? (
          <Box sx={{ color, '& .MuiSvgIcon-root': { fontSize: 11 } }}>{icon}</Box>
        ) : (
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.1 }}>
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.68rem', fontWeight: 500, display: 'block',
            fontFamily: mono ? 'monospace' : undefined,
            wordBreak: 'break-word', color: 'text.primary',
          }}
        >
          {value ?? '\u2014'}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', fontFamily: 'monospace', mt: 0.15 }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function getStatusLabel(actionType) {
  if (SUCCESS_TYPES.includes(actionType)) return 'Success';
  if (FAILED_TYPES.includes(actionType)) return 'Failed';
  return 'Active';
}

function fmtTimeOnly(ts) {
  if (!ts) return '\u2014';
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTimeFull(ts) {
  if (!ts) return '\u2014';
  const d = new Date(ts);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

function tryParse(v) {
  if (v == null || v === '' || v === 'null' || v === '""') return null;
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return v; }
}

function formatVal(v) {
  if (v === null) return '\u2014';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}
