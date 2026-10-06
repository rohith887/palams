import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Alert, Typography, Grid, Chip,
  Breadcrumbs, Link, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Drawer, IconButton, Divider, TablePagination, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  NavigateNext as NavigateNextIcon,
  AccessTime as AccessTimeIcon,
  Inventory as InventoryIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PortalLayout from '../../../components/layout/PortalLayout';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import Section from '../../../components/enterprise/Section';
import ExportToolbar from '../../../components/reports/ExportToolbar';
import useAuth from '../../../hooks/useAuth';
import auditService from '../../../services/auditService';

// ─── Operation display maps ──────────────────────────────────────────────────

const OPERATION_CONFIG = {
  created:          { label: 'Registered',      color: '#2E7D32', bg: '#E8F5E9', icon: '📦' },
  loading_start:    { label: 'Loading',          color: '#1565C0', bg: '#E3F0FF', icon: '⬇' },
  loading_complete: { label: 'Loading',          color: '#2E7D32', bg: '#E8F5E9', icon: '✅' },
  unloading_start:  { label: 'Unloading',        color: '#E65100', bg: '#FFF3E0', icon: '⬆' },
  unloading_complete:{ label: 'Unloading',        color: '#2E7D32', bg: '#E8F5E9', icon: '✅' },
  cleaning_start:   { label: 'Cleaning',         color: '#00838F', bg: '#E0F7FA', icon: '🧹' },
  cleaning_complete:{ label: 'Cleaning',         color: '#2E7D32', bg: '#E8F5E9', icon: '✅' },
  qa_start:         { label: 'QA',               color: '#7B1FA2', bg: '#F3E5F5', icon: '🔬' },
  qa_pass:          { label: 'QA',               color: '#2E7D32', bg: '#E8F5E9', icon: '✅' },
  qa_fail:          { label: 'QA',               color: '#C62828', bg: '#FFEBEE', icon: '❌' },
  cycle_complete:   { label: 'Complete',         color: '#424242', bg: '#F5F5F5', icon: '🔄' },
};

function getStatusInfo(eventType) {
  if (eventType?.includes('complete') || eventType === 'qa_pass') return { label: 'Completed', color: 'success' };
  if (eventType === 'qa_fail') return { label: 'Failed', color: 'error' };
  if (eventType === 'cycle_complete') return { label: 'Completed', color: 'default' };
  return { label: 'Started', color: 'info' };
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function fmtTimeOnly(ts) {
  if (!ts) return '\u2014';
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(ts) {
  if (!ts) return '\u2014';
  return `${fmtDate(ts)} ${fmtTimeOnly(ts)}`;
}
function fmtDateTimeFull(ts) {
  if (!ts) return '\u2014';
  const d = new Date(ts);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

/** Convert backend duration string ("1h 30m" or "45m") to minutes. */
function durationToMinutes(dur) {
  if (!dur) return null;
  const hMatch = dur.match(/(\d+)h/);
  const mMatch = dur.match(/(\d+)m/);
  const hrs = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
  return hrs * 60 + mins;
}

/** Format minutes to a compact display string. */
function formatMinDisplay(totalMin) {
  if (totalMin === null || totalMin === undefined) return '\u2014';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function BinHistory() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlBinNumber = searchParams.get('binNumber');
  const searchInputRef = useRef(null);

  const [binNumber, setBinNumber] = useState(urlBinNumber || '');
  const [operations, setOperations] = useState([]);
  const [binInfo, setBinInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [drawerEvent, setDrawerEvent] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const fetchData = useCallback(async (searchBinNumber) => {
    const trimmed = (typeof searchBinNumber === 'string' ? searchBinNumber : binNumber).trim();
    if (!trimmed) { setError('Please enter a Bin Number to search.'); return; }
    setError(''); setOperations([]); setBinInfo(null); setStats(null); setLoading(true); setHasSearched(true);
    setPage(0); setDrawerEvent(null);
    try {
      const res = await auditService.getBinHistory(trimmed);
      const data = res.data?.data || {};
      setOperations(data.timeline || []);
      setBinInfo(data.bin || null);
      setStats(data.stats || null);
    } catch (e) {
      if (e.response?.status === 404) setError(`Bin "${trimmed}" not found.`);
      else setError(e.response?.data?.error?.message || 'Failed to load bin history.');
      setOperations([]); setBinInfo(null); setStats(null);
    } finally { setLoading(false); }
  }, [binNumber]);

  // Auto-search from URL param
  useEffect(() => {
    if (urlBinNumber) { setBinNumber(urlBinNumber); fetchData(urlBinNumber); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => fetchData(binNumber.trim());
  const handleRefresh = () => { if (binInfo?.Bin_Number) fetchData(binInfo.Bin_Number); else if (binNumber.trim()) fetchData(binNumber.trim()); };
  const handleReset = () => { setBinNumber(''); setOperations([]); setBinInfo(null); setStats(null); setHasSearched(false); setError(''); setDrawerEvent(null); setPage(0); if (searchInputRef.current) searchInputRef.current.focus(); };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  // ─── Pagination ──────────────────────────────────────────────────────────

  const totalOps = operations.length;
  const paginatedOps = operations.slice(page * pageSize, (page + 1) * pageSize);

  // ─── Export handlers ─────────────────────────────────────────────────────

  const handleExportExcel = () => {
    const rows = operations.map(op => {
      const opCfg = OPERATION_CONFIG[op.type] || {};
      const stInfo = getStatusInfo(op.type);
      const d = op.details || {};
      return {
        'Date & Time': fmtDateTime(op.timestamp),
        Operation: opCfg.label || op.phase || 'Unknown',
        Operator: op.operator || '',
        Role: op.operatorRole || '',
        Bay: d.bay || '',
        Tank: d.tank || '',
        Material: d.material || '',
        Batch: d.batch || '',
        Status: stInfo.label,
        'Duration (min)': durationToMinutes(op.duration),
        Result: d.result || '',
        Remarks: d.remarks || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Bin Operations Log');
    XLSX.writeFile(wb, `PBLMS_Operations_Log_${binInfo?.Bin_Number || binNumber}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(8);
    doc.text(`Operations Log — ${binInfo?.Bin_Number || binNumber}`, 14, 10);
    const head = [['Date & Time', 'Operation', 'Operator', 'Role', 'Bay', 'Tank', 'Material', 'Batch', 'Status', 'Duration', 'Result']];
    const body = operations.map(op => {
      const opCfg = OPERATION_CONFIG[op.type] || {};
      const stInfo = getStatusInfo(op.type);
      const d = op.details || {};
      return [
        fmtDateTime(op.timestamp),
        opCfg.label || op.phase || 'Unknown',
        op.operator || '',
        op.operatorRole || '',
        d.bay || '',
        d.tank || '',
        d.material || '',
        d.batch || '',
        stInfo.label,
        durationToMinutes(op.duration) !== null ? `${durationToMinutes(op.duration)} min` : '',
        d.result || '',
      ];
    });
    doc.autoTable({ head, body, startY: 14, styles: { fontSize: 6 }, headStyles: { fontSize: 6, fillColor: [15, 76, 129] } });
    doc.save(`PBLMS_Operations_Log_${binInfo?.Bin_Number || binNumber}.pdf`);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNextIcon sx={{ fontSize: 11 }} />} sx={{ mb: 0.75 }}>
          <Link underline="hover" color="inherit" onClick={() => navigate('/admin/bin-summary')} sx={{ cursor: 'pointer', fontSize: '0.68rem', fontWeight: 500 }}>
            Bin Summary
          </Link>
          {binInfo && (
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'primary.main', fontWeight: 600, fontFamily: 'monospace' }}>
              {binInfo.Bin_Number}
            </Typography>
          )}
        </Breadcrumbs>

        {/* Header toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Operations Log</Typography>
            {binInfo && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Operational journey for {binInfo.Bin_Number}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Button size="small" variant="outlined" startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />} onClick={() => navigate('/admin/bin-summary')} sx={{ fontSize: '0.68rem', py: 0.3 }}>
              Back
            </Button>
            {binNumber && (
              <Button size="small" variant="outlined" startIcon={<InventoryIcon sx={{ fontSize: 15 }} />} onClick={() => navigate(`/admin/audit/log?binNumber=${binNumber}`)} sx={{ fontSize: '0.68rem', py: 0.3 }}>
                Audit Trail
              </Button>
            )}
            {operations.length > 0 && <ExportToolbar onExcel={handleExportExcel} onPdf={handleExportPdf} />}
          </Box>
        </Box>

        {/* Search bar */}
        <Section>
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={12} sm={5} md={4}>
              <TextField
                label="Bin Number"
                value={binNumber}
                onChange={(e) => setBinNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. BIN-016"
                fullWidth
                size="small"
                inputRef={searchInputRef}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.72rem' } }}
              />
            </Grid>
            <Grid item xs="auto">
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button variant="contained" size="small" startIcon={<SearchIcon sx={{ fontSize: 15 }} />} onClick={handleSearch} disabled={loading} sx={{ fontSize: '0.68rem', py: 0.6 }}>
                  Search
                </Button>
                <Tooltip title="Refresh">
                  <IconButton size="small" onClick={handleRefresh} disabled={loading || !hasSearched}><RefreshIcon sx={{ fontSize: 17 }} /></IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Section>

        {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.72rem' }} onClose={() => setError('')}>{error}</Alert>}
        {loading && <LoadingSpinner />}

        {!hasSearched && !loading && (
          <EmptyState icon={<InventoryIcon sx={{ fontSize: 40 }} />} title="Operations Log" message="Enter a Bin Number above to view its complete operational lifecycle." />
        )}

        {hasSearched && !loading && !error && operations.length === 0 && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
            <InventoryIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {binNumber ? `Bin "${binNumber}" has not entered an operational cycle yet.` : 'No operations records found for this bin.'}
            </Typography>
          </Paper>
        )}

        {!loading && operations.length > 0 && (
          <>
            {/* Compact Bin Information Card */}
            <Paper sx={{ p: 1.5, mb: 1, bgcolor: '#F8FAFD', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem', mr: 0.5 }}>{binInfo?.Bin_Number || binNumber}</Typography>
              <Chip
                label={binInfo?.Current_Status || 'N/A'}
                size="small"
                sx={{
                  height: 20, fontSize: '0.62rem', fontWeight: 600,
                  bgcolor: binInfo?.Current_Status === 'Available' ? '#E8F5E9' : binInfo?.Current_Status === 'In Use' ? '#E3F0FF' : '#FFF3E0',
                  color: binInfo?.Current_Status === 'Available' ? '#2E7D32' : binInfo?.Current_Status === 'In Use' ? '#1565C0' : '#E65100',
                }}
              />
              <Divider orientation="vertical" flexItem />
              <InfoChip label="Type" value={binInfo?.Bin_Type_Name} />
              <InfoChip label="Category" value={binInfo?.Bin_Category_Name} />
              <InfoChip label="Current Bay" value={binInfo?.Current_Bay} />
              <InfoChip label="Current Tank" value={binInfo?.Current_Tank} />
              <InfoChip label="Cycles" value={stats?.cycleCount ?? 0} />
              <InfoChip label="Total Ops" value={totalOps} />
              <Divider orientation="vertical" flexItem />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  Last Updated: {binInfo?.Last_Updated ? fmtDateTime(binInfo.Last_Updated) : '\u2014'}
                </Typography>
              </Box>
            </Paper>

            {/* Summary chips */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Chip icon={<InventoryIcon sx={{ fontSize: 14 }} />} label={`${totalOps} operations`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 24 }} />
              <Chip icon={<AccessTimeIcon sx={{ fontSize: 14 }} />} label={`${fmtDate(operations[operations.length - 1]?.timestamp)} — ${fmtDate(operations[0]?.timestamp)}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 24 }} />
            </Box>

            {/* Enterprise Operations Log Table */}
            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, whiteSpace: 'nowrap', bgcolor: '#F5F6FA' }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Operation</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Operator</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Bay</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Tank</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Material</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Batch</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Result</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, bgcolor: '#F5F6FA' }}>Remarks</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem', py: 1, width: 50, bgcolor: '#F5F6FA' }}>View</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedOps.map((event, idx) => {
                    const opCfg = OPERATION_CONFIG[event.type] || { label: event.phase || 'Unknown', color: '#546E7A', bg: '#F5F5F5', icon: '●' };
                    const stInfo = getStatusInfo(event.type);
                    const d = event.details || {};
                    const durMin = durationToMinutes(event.duration);

                    return (
                      <TableRow
                        key={idx}
                        hover
                        sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                        onClick={() => setDrawerEvent(event)}
                      >
                        {/* Date & Time */}
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.65rem', py: 0.75, whiteSpace: 'nowrap' }}>
                          {fmtDateTime(event.timestamp)}
                        </TableCell>

                        {/* Operation chip */}
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip
                            label={opCfg.label}
                            size="small"
                            icon={<Box component="span" sx={{ fontSize: '0.65rem', ml: '4px' }}>{opCfg.icon}</Box>}
                            sx={{
                              height: 20, fontSize: '0.6rem', fontWeight: 600,
                              bgcolor: opCfg.bg, color: opCfg.color,
                              '& .MuiChip-icon': { color: opCfg.color, fontSize: '0.65rem' },
                            }}
                          />
                        </TableCell>

                        {/* Operator with role underneath */}
                        <TableCell sx={{ py: 0.75 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 500, display: 'block' }}>
                            {event.operator || '\u2014'}
                          </Typography>
                          {event.operatorRole && (
                            <Chip
                              label={event.operatorRole}
                              size="small"
                              variant="outlined"
                              sx={{ height: 16, fontSize: '0.55rem', mt: 0.2, fontWeight: 400, color: 'text.secondary', borderColor: 'divider' }}
                            />
                          )}
                        </TableCell>

                        {/* Bay */}
                        <TableCell sx={{ py: 0.75 }}>
                          {d.bay ? (
                            <Chip label={d.bay} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 500 }} />
                          ) : (
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>\u2014</Typography>
                          )}
                        </TableCell>

                        {/* Tank */}
                        <TableCell sx={{ py: 0.75 }}>
                          {d.tank ? (
                            <Chip label={d.tank} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 500 }} />
                          ) : (
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>\u2014</Typography>
                          )}
                        </TableCell>

                        {/* Material */}
                        <TableCell sx={{ py: 0.75 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                            {d.material || '\u2014'}
                          </Typography>
                        </TableCell>

                        {/* Batch */}
                        <TableCell sx={{ py: 0.75 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontFamily: d.batch ? 'monospace' : undefined }}>
                            {d.batch || '\u2014'}
                          </Typography>
                        </TableCell>

                        {/* Status chip */}
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip
                            label={stInfo.label}
                            size="small"
                            color={stInfo.color}
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.58rem', fontWeight: 600 }}
                          />
                        </TableCell>

                        {/* Duration in minutes */}
                        <TableCell sx={{ py: 0.75 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }}>
                            {durMin !== null ? `${durMin} min` : '\u2014'}
                          </Typography>
                        </TableCell>

                        {/* Result */}
                        <TableCell sx={{ py: 0.75 }}>
                          {d.result ? (
                            <Chip
                              label={d.result}
                              size="small"
                              color={d.result === 'PASS' ? 'success' : 'error'}
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.58rem', fontWeight: 600 }}
                            />
                          ) : (
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>\u2014</Typography>
                          )}
                        </TableCell>

                        {/* Remarks */}
                        <TableCell sx={{ py: 0.75, maxWidth: 160 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.62rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, color: d.remarks ? 'text.primary' : 'text.disabled' }}>
                            {d.remarks || '\u2014'}
                          </Typography>
                        </TableCell>

                        {/* View icon */}
                        <TableCell sx={{ py: 0.75, textAlign: 'center' }}>
                          <Tooltip title="View details">
                            <ViewIcon sx={{ fontSize: 16, color: 'action.active' }} />
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {totalOps > pageSize && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
                <TablePagination
                  component="div"
                  count={totalOps}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                  rowsPerPageOptions={[25, 50, 100]}
                  sx={{ '.MuiTablePagination-toolbar': { minHeight: 40, fontSize: '0.7rem' }, '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '0.68rem' } }}
                />
              </Box>
            )}
          </>
        )}

        {/* Operations Detail Drawer */}
        <Drawer anchor="right" open={Boolean(drawerEvent)} onClose={() => setDrawerEvent(null)} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 0 } }}>
          {drawerEvent && (() => {
            const ev = drawerEvent;
            const opCfg = OPERATION_CONFIG[ev.type] || { label: ev.phase || 'Unknown', color: '#546E7A', bg: '#F5F5F5', icon: '●' };
            const stInfo = getStatusInfo(ev.type);
            const d = ev.details || {};
            const durMin = durationToMinutes(ev.duration);

            return (
              <Box>
                {/* Drawer header */}
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#F8FAFD', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em' }}>
                      Operation Detail
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Box component="span" sx={{ color: opCfg.color, fontSize: '1rem' }}>{opCfg.icon}</Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{ev.title}</Typography>
                      <Chip label={opCfg.label} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: opCfg.bg, color: opCfg.color }} />
                      <Chip label={stInfo.label} size="small" color={stInfo.color} variant="outlined" sx={{ height: 20, fontSize: '0.58rem', fontWeight: 600 }} />
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => setDrawerEvent(null)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
                </Box>

                {/* Drawer body */}
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}><Field label="Timestamp" value={fmtDateTimeFull(ev.timestamp)} mono /></Grid>
                    <Grid item xs={6}><Field label="Duration" value={durMin !== null ? formatMinDisplay(durMin) : '\u2014'} /></Grid>
                    <Grid item xs={6}><Field label="Operator" value={ev.operator || '\u2014'} /></Grid>
                    <Grid item xs={6}><Field label="Role" value={ev.operatorRole || '\u2014'} /></Grid>
                    {ev.startTime && ev.endTime && (
                      <>
                        <Grid item xs={6}><Field label="Start Time" value={fmtDateTimeFull(ev.startTime)} mono /></Grid>
                        <Grid item xs={6}><Field label="End Time" value={fmtDateTimeFull(ev.endTime)} mono /></Grid>
                      </>
                    )}
                    {d.material && <Grid item xs={6}><Field label="Material" value={d.material} /></Grid>}
                    {d.batch && <Grid item xs={6}><Field label="Batch" value={d.batch} mono /></Grid>}
                    {d.quantity && <Grid item xs={6}><Field label="Quantity" value={d.quantity} /></Grid>}
                    {d.bay && <Grid item xs={6}><Field label="Bay" value={d.bay} /></Grid>}
                    {d.tank && <Grid item xs={6}><Field label="Tank" value={d.tank} /></Grid>}
                    {d.condition && <Grid item xs={6}><Field label="Condition" value={d.condition} /></Grid>}
                    {d.method && <Grid item xs={6}><Field label="Cleaning Method" value={d.method} /></Grid>}
                    {d.agent && <Grid item xs={6}><Field label="Cleaning Agent" value={d.agent} /></Grid>}
                    {d.waterTemp && <Grid item xs={6}><Field label="Water Temp" value={d.waterTemp} /></Grid>}
                    {d.rinseCycles && <Grid item xs={6}><Field label="Rinse Cycles" value={d.rinseCycles} /></Grid>}
                    {d.result && (
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Result</Typography>
                        <Chip label={d.result} size="small" color={d.result === 'PASS' ? 'success' : 'error'} sx={{ height: 20, fontSize: '0.62rem', fontWeight: 600, mt: 0.15 }} />
                      </Grid>
                    )}
                    {d.failureReason && <Grid item xs={12}><Field label="Failure Reason" value={d.failureReason} /></Grid>}
                    {d.remarks && <Grid item xs={12}><Field label="Remarks" value={`"${d.remarks}"`} /></Grid>}
                    {d.type && <Grid item xs={6}><Field label="Bin Type" value={d.type} /></Grid>}
                    {d.category && <Grid item xs={6}><Field label="Category" value={d.category} /></Grid>}
                    {d.capacity && <Grid item xs={6}><Field label="Capacity" value={d.capacity} /></Grid>}
                    {d.cycleNumber && <Grid item xs={6}><Field label="Cycle" value={`#${d.cycleNumber}`} /></Grid>}
                  </Grid>

                  {/* Inspection checks */}
                  {d.checks && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>Inspection Checks</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {Object.entries(d.checks).map(([check, value]) => (
                          <Chip
                            key={check}
                            label={`${check}: ${value}`}
                            size="small"
                            color={value === 'Pass' ? 'success' : value === 'Fail' ? 'error' : 'default'}
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.6rem' }}
                          />
                        ))}
                      </Box>
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

// ─── Small helpers ───────────────────────────────────────────────────────────

function InfoChip({ label, value }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.68rem' }}>{value || '\u2014'}</Typography>
    </Box>
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