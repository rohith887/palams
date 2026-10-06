import { useState, useCallback, useEffect } from 'react';
import {
  Box, TextField, MenuItem, Button, Alert, Typography, Chip,
  Breadcrumbs, Link, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Drawer, IconButton, Grid, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon,
  NavigateNext as NavigateNextIcon,
  Terminal as TerminalIcon,
  Visibility as ViewIcon, Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Dns as DnsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PortalLayout from '../../../components/layout/PortalLayout';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import Section from '../../../components/enterprise/Section';
import ExportToolbar from '../../../components/reports/ExportToolbar';
import DateRangeFilter from '../../../components/reports/DateRangeFilter';
import useAuth from '../../../hooks/useAuth';
import systemLogService from '../../../services/systemLogService';

const LEVEL_COLORS = {
  ERROR:    { bg: '#FFEBEE', color: '#C62828' },
  WARN:     { bg: '#FFF3E0', color: '#E65100' },
  INFO:     { bg: '#E3F0FF', color: '#0F4C81' },
  DEBUG:    { bg: '#F5F5F5', color: '#757575' },
  CRITICAL: { bg: '#FFEBEE', color: '#B71C1C' },
};
const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];

function fmtDateTime(ts) {
  if (!ts) return '\u2014';
  const d = new Date(ts);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}
function formatJson(val) {
  if (!val) return '\u2014';
  try { return JSON.stringify(typeof val === 'string' ? JSON.parse(val) : val, null, 2); } catch { return String(val); }
}

// Module labels for human-readable display
const MODULE_LABELS = { crud: 'CRUD', auth: 'Auth', workflow: 'Workflow', system: 'System', api: 'API' };

export default function SystemLogs() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const defaultFilters = { level: '', module: 'crud,auth,workflow,system', action: '', fromDate: '', toDate: '', search: '' };
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [drawerEntry, setDrawerEntry] = useState(null);
  const [modules, setModules] = useState([]);
  const [actions, setActions] = useState([]);
  const [showApi, setShowApi] = useState(false);

  useEffect(() => {
    systemLogService.getModules().then(r => setModules(r.data?.data || [])).catch(() => {});
    systemLogService.getActions().then(r => setActions(r.data?.data || [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async (f, p, ps) => {
    setError(''); setLoading(true);
    try {
      const res = await systemLogService.getLogs({
        level: f.level || undefined,
        module: f.module || undefined,
        action: f.action || undefined,
        fromDate: f.fromDate || undefined,
        toDate: f.toDate || undefined,
        search: f.search || undefined,
        page: p + 1,
        pageSize: ps,
      });
      const data = res.data?.data || {};
      setRows(data.rows || []); setTotalCount(data.totalCount || 0);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Failed to load logs');
      setRows([]); setTotalCount(0);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setHasSearched(true);
    fetchData(defaultFilters, 0, pageSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => { setHasSearched(true); setPage(0); setAppliedFilters({ ...filters }); fetchData(filters, 0, pageSize); };

  const toggleApi = () => {
    setShowApi(s => {
      const next = !s;
      const newMod = next ? '' : 'crud,auth,workflow,system';
      const newF = { ...filters, module: newMod };
      setFilters(newF); setAppliedFilters(newF); setPage(0);
      fetchData(newF, 0, pageSize);
      return next;
    });
  };

  const handleReset = () => {
    const def = { level: '', module: showApi ? '' : 'crud,auth,workflow,system', action: '', fromDate: '', toDate: '', search: '' };
    setFilters(def); setAppliedFilters(def);
    setRows([]); setTotalCount(0); setPage(0); setHasSearched(true); setError(''); setDrawerEntry(null);
    fetchData(def, 0, pageSize);
  };

  const handlePageChange = (_, newPage) => { setPage(newPage); fetchData(appliedFilters, newPage, pageSize); };
  const handlePageSizeChange = (e) => { const s = Number(e.target.value); setPageSize(s); setPage(0); fetchData(appliedFilters, 0, s); };

  const filterField = (name) => ({ value: filters[name], onChange: (e) => setFilters(prev => ({ ...prev, [name]: e.target.value })) });

  const handleExportExcel = () => {
    const data = rows.map(r => ({
      Time: fmtDateTime(r.Timestamp), Level: r.Level || '', Module: MODULE_LABELS[r.Module] || r.Module || '',
      Action: (r.Action || '').replace(/_/g, ' '), User: r.Username || '', Message: r.Message || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'System Logs');
    XLSX.writeFile(wb, 'PBLMS_System_Logs.xlsx');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(7);
    doc.text('System Logs — PBLMS', 14, 10);
    const head = [['Time', 'Level', 'Module', 'Action', 'User', 'Message']];
    const body = rows.map(r => [fmtDateTime(r.Timestamp), r.Level || '', MODULE_LABELS[r.Module] || r.Module || '', (r.Action || '').replace(/_/g, ' '), r.Username || '', r.Message || '']);
    doc.autoTable({ head, body, startY: 14, styles: { fontSize: 5 }, headStyles: { fontSize: 5, fillColor: [15, 76, 129] } });
    doc.save('PBLMS_System_Logs.pdf');
  };

  const handleDownload = async () => {
    try {
      const res = await systemLogService.downloadLogs({
        level: appliedFilters.level || undefined, module: appliedFilters.module || undefined,
        fromDate: appliedFilters.fromDate || undefined, toDate: appliedFilters.toDate || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'system-logs.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch { setError('Failed to download logs'); }
  };

  const statusColor = (code) => {
    if (!code) return 'default';
    if (code >= 500) return 'error';
    if (code >= 400) return 'warning';
    if (code >= 200) return 'success';
    return 'default';
  };

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <Breadcrumbs separator={<NavigateNextIcon sx={{ fontSize: 11 }} />} sx={{ mb: 0.75 }}>
          <Link underline="hover" color="inherit" onClick={() => navigate('/admin/dashboard')} sx={{ cursor: 'pointer', fontSize: '0.68rem', fontWeight: 500 }}>Dashboard</Link>
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'primary.main', fontWeight: 600 }}>System Logs</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>System Logs</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {showApi ? 'Raw HTTP/API request log — technical debugging' : 'Business system activity and operational events'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            <Chip
              label={showApi ? 'API Requests' : 'Business Events'}
              size="small"
              color={showApi ? 'default' : 'primary'}
              variant="outlined"
              onClick={toggleApi}
              sx={{ fontSize: '0.65rem', height: 26, cursor: 'pointer' }}
            />
            <Button size="small" variant="outlined" startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />} onClick={() => navigate('/admin/dashboard')} sx={{ fontSize: '0.68rem', py: 0.3 }}>Back</Button>
            {rows.length > 0 && (
              <>
                <ExportToolbar onExcel={handleExportExcel} onPdf={handleExportPdf} excelLabel="Excel" pdfLabel="PDF" />
                <Button size="small" variant="outlined" onClick={handleDownload} sx={{ fontSize: '0.68rem', py: 0.3 }}>Download</Button>
              </>
            )}
          </Box>
        </Box>

        <Section>
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={6} sm={3} md={2}>
              <TextField select label="Level" fullWidth size="small" SelectProps={{ displayEmpty: true }} {...filterField('level')} sx={{ '& .MuiInputBase-root': { fontSize: '0.7rem' } }}>
                <MenuItem value="">All Levels</MenuItem>
                {LOG_LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField select label="Module" fullWidth size="small" SelectProps={{ displayEmpty: true }} {...filterField('module')} sx={{ '& .MuiInputBase-root': { fontSize: '0.7rem' } }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="crud">CRUD</MenuItem>
                <MenuItem value="auth">Auth</MenuItem>
                <MenuItem value="workflow">Workflow</MenuItem>
                <MenuItem value="system">System</MenuItem>
                <MenuItem value="api">API</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField select label="Action" fullWidth size="small" SelectProps={{ displayEmpty: true }} {...filterField('action')} sx={{ '& .MuiInputBase-root': { fontSize: '0.7rem' } }}>
                <MenuItem value="">All Actions</MenuItem>
                {actions.map(a => <MenuItem key={a} value={a}>{(a || '').replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DateRangeFilter from={filters.fromDate} to={filters.toDate} onFromChange={v => setFilters(p => ({ ...p, fromDate: v }))} onToChange={v => setFilters(p => ({ ...p, toDate: v }))} size="small" />
            </Grid>
            <Grid item xs={8} sm={6} md={2}>
              <TextField label="Search" fullWidth size="small" placeholder="message, user..." {...filterField('search')} onKeyDown={e => e.key === 'Enter' && handleSearch()} sx={{ '& .MuiInputBase-root': { fontSize: '0.7rem' } }} />
            </Grid>
            <Grid item xs="auto">
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button variant="contained" size="small" startIcon={<SearchIcon sx={{ fontSize: 15 }} />} onClick={handleSearch} disabled={loading} sx={{ fontSize: '0.68rem', py: 0.6 }}>Search</Button>
                <Tooltip title="Reset"><IconButton size="small" onClick={handleReset} disabled={loading}><RefreshIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Section>

        {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.72rem' }} onClose={() => setError('')}>{error}</Alert>}
        {loading && <LoadingSpinner />}

        {!hasSearched && !loading && (
          <EmptyState icon={<TerminalIcon sx={{ fontSize: 40 }} />} title="System Logs" message="System activity and operational events appear here." />
        )}

        {hasSearched && !loading && !error && rows.length === 0 && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
            <TerminalIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>No log entries match. Toggle "API Requests" above to see raw request logs.</Typography>
          </Paper>
        )}

        {!loading && rows.length > 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap', mt: 1 }}>
              <Chip icon={<TerminalIcon sx={{ fontSize: 14 }} />} label={`${totalCount} entries`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 24 }} />
              {!showApi && <Chip label="Business Events" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: 24 }} />}
            </Box>

            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA', whiteSpace: 'nowrap' }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Level</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Message</TableCell>
                    {showApi && <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>API</TableCell>}
                    {showApi && <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Status</TableCell>}
                    {showApi && <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Duration</TableCell>}
                    {showApi && <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>IP</TableCell>}
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, width: 50, bgcolor: '#F5F6FA' }}>View</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, idx) => {
                    const lvlColors = LEVEL_COLORS[r.Level] || LEVEL_COLORS.INFO;
                    const moduleLabel = MODULE_LABELS[r.Module] || r.Module || '\u2014';
                    const actionLabel = (r.Action || '').replace(/_/g, ' ');
                    return (
                      <TableRow key={r.Log_ID || idx} hover sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }} onClick={() => setDrawerEntry(r)}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.62rem', py: 0.75, whiteSpace: 'nowrap' }}>{fmtDateTime(r.Timestamp)}</TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip label={r.Level || 'INFO'} size="small" sx={{ height: 18, fontSize: '0.55rem', fontWeight: 600, bgcolor: lvlColors.bg, color: lvlColors.color, fontFamily: 'monospace', minWidth: 48 }} />
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip label={moduleLabel} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.55rem', fontWeight: 500 }} />
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}><Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 500 }}>{actionLabel || '\u2014'}</Typography></TableCell>
                        <TableCell sx={{ py: 0.75 }}><Typography variant="caption" sx={{ fontSize: '0.62rem' }}>{r.Username || '\u2014'}</Typography></TableCell>
                        <TableCell sx={{ py: 0.75, maxWidth: 180 }}><Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{r.Message || '\u2014'}</Typography></TableCell>
                        {showApi && <TableCell sx={{ py: 0.75, maxWidth: 120 }}><Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.58rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{r.API_Path || '\u2014'}</Typography></TableCell>}
                        {showApi && <TableCell sx={{ py: 0.75 }}>{r.Status_Code != null ? <Chip label={r.Status_Code} size="small" color={statusColor(r.Status_Code)} variant="outlined" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 600 }} /> : <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>\u2014</Typography>}</TableCell>}
                        {showApi && <TableCell sx={{ py: 0.75 }}><Typography variant="caption" sx={{ fontSize: '0.62rem', fontFamily: 'monospace' }}>{r.Duration_ms != null ? `${r.Duration_ms}ms` : '\u2014'}</Typography></TableCell>}
                        {showApi && <TableCell sx={{ py: 0.75 }}><Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }}>{r.IP_Address || '\u2014'}</Typography></TableCell>}
                        <TableCell sx={{ py: 0.75, textAlign: 'center' }}><Tooltip title="View details"><ViewIcon sx={{ fontSize: 16, color: 'action.active' }} /></Tooltip></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
              <TablePagination component="div" count={totalCount} page={page} onPageChange={handlePageChange} rowsPerPage={pageSize} onRowsPerPageChange={handlePageSizeChange} rowsPerPageOptions={[25, 50, 100]}
                sx={{ '.MuiTablePagination-toolbar': { minHeight: 40, fontSize: '0.7rem' }, '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '0.68rem' } }} />
            </Box>
          </>
        )}

        <Drawer anchor="right" open={Boolean(drawerEntry)} onClose={() => setDrawerEntry(null)} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 0 } }}>
          {drawerEntry && (() => {
            const e = drawerEntry;
            const lvlColors = LEVEL_COLORS[e.Level] || LEVEL_COLORS.INFO;
            const moduleLabel = MODULE_LABELS[e.Module] || e.Module || 'Unknown';
            return (
              <Box>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#F8FAFD', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em' }}>Event Detail</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip label={e.Level || 'INFO'} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: lvlColors.bg, color: lvlColors.color, fontFamily: 'monospace' }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{moduleLabel}</Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => setDrawerEntry(null)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12}><Field label="Timestamp" value={fmtDateTime(e.Timestamp)} mono /></Grid>
                    <Grid item xs={6}><Field label="Level" value={e.Level || '\u2014'} /></Grid>
                    <Grid item xs={6}><Field label="Module" value={moduleLabel} /></Grid>
                    <Grid item xs={6}><Field label="Action" value={(e.Action || '').replace(/_/g, ' ') || '\u2014'} /></Grid>
                    <Grid item xs={6}><Field label="User" value={e.Username || '\u2014'} /></Grid>
                    <Grid item xs={12}><Field label="Message" value={e.Message || '\u2014'} /></Grid>
                    {e.API_Path && <Grid item xs={6}><Field label="API Path" value={e.API_Path} /></Grid>}
                    {e.Status_Code != null && <Grid item xs={6}><Field label="Status Code" value={String(e.Status_Code)} /> </Grid>}
                    {e.Duration_ms != null && <Grid item xs={6}><Field label="Duration" value={`${e.Duration_ms}ms`} /></Grid>}
                    {e.IP_Address && <Grid item xs={6}><Field label="IP Address" value={e.IP_Address} /></Grid>}
                    {e.Request_ID && <Grid item xs={12}><Field label="Request ID" value={e.Request_ID} mono /></Grid>}
                    {e.Exception && <Grid item xs={12}><Field label="Exception" value={e.Exception} /></Grid>}
                  </Grid>
                  {e.Stack_Trace && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>Stack Trace</Typography>
                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#FFF5F5', fontFamily: 'monospace', fontSize: '0.55rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 300, overflow: 'auto', color: '#C62828' }}>{e.Stack_Trace}</Paper>
                    </Box>
                  )}
                  {e.Metadata_JSON && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>Metadata</Typography>
                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F8FAFD', fontFamily: 'monospace', fontSize: '0.6rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto' }}>{formatJson(e.Metadata_JSON)}</Paper>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })()}
        </Drawer>
      </Box>
    </PortalLayout>
  );
}

function Field({ label, value, mono }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{label}</Typography>
      <Typography variant="caption" sx={{ fontSize: '0.67rem', fontWeight: 500, fontFamily: mono ? 'monospace' : undefined, display: 'block' }}>{value}</Typography>
    </Box>
  );
}