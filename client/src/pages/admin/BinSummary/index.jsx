import { useState, useCallback, useEffect, useMemo, Fragment, useRef } from 'react';
import {
  Box, Chip, Select, MenuItem, FormControl, InputLabel, TextField, InputAdornment,
  IconButton, Tooltip, Typography, useTheme, Paper, Grid, Button, Skeleton,
  Collapse, Popover, Checkbox, FormControlLabel,
  Divider, Drawer, Menu, ListItemIcon, ListItemText, MenuList,
  Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress,
} from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PortalLayout from '../../../components/layout/PortalLayout';
import PageHeader from '../../../components/common/PageHeader';
import ReportTable from '../../../components/common/ReportTable';
import useAuth from '../../../hooks/useAuth';
import masterService from '../../../services/masterService';
import binSummaryService from '../../../services/binSummaryService';
import KpiTile from '../../../components/enterprise/KpiTile';
import DateRangeFilter from '../../../components/reports/DateRangeFilter';

// ─── Icons ───────────────────────────────────────────────────────────────────
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCodeIcon from '@mui/icons-material/QrCode';
import HistoryIcon from '@mui/icons-material/History';
import TimelineIcon from '@mui/icons-material/Timeline';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import ScienceIcon from '@mui/icons-material/Science';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import ClearIcon from '@mui/icons-material/Clear';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DotIcon from '@mui/icons-material/FiberManualRecord';
import PrintIcon from '@mui/icons-material/Print';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// ─── Session storage keys for filter preservation ──────────────────────────────
const FILTER_STORAGE_KEY = 'pblms_binsummary_filters';

function saveFiltersToSession(filters, expandedRows, visibleKeys) {
  try {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ filters, expandedRows, visibleKeys }));
  } catch {}
}

function loadFiltersFromSession() {
  try {
    const raw = sessionStorage.getItem(FILTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearFiltersSession() {
  try { sessionStorage.removeItem(FILTER_STORAGE_KEY); } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderDateTime(value) {
  if (!value) return '\u2014';
  const d = new Date(value);
  const text = `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  return (
    <Tooltip title={d.toLocaleString('en-GB')} enterDelay={500}>
      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.62rem', whiteSpace: 'nowrap' }}>{text}</Typography>
    </Tooltip>
  );
}

// ─── Status badge with icon, color, and enhanced tooltip ──────────────────────

const STATUS_META = {
  Awaiting_Loading: { icon: '●', category: 'available', tooltip: 'Bin is ready to be loaded with material.\nNext: Loading In Progress\nRole: Loader' },
  Loading_In_Progress: { icon: '⬇', category: 'loading', tooltip: 'Material is being loaded into the bin.\nNext: Awaiting Unloading\nRole: Loader' },
  Awaiting_Unloading: { icon: '●', category: 'available', tooltip: 'Bin contains loaded material pending unloading.\nNext: Unloading In Progress\nRole: Unloader' },
  Unloading_In_Progress: { icon: '⬆', category: 'unloading', tooltip: 'Material is being unloaded from the bin.\nNext: Awaiting Cleaning\nRole: Unloader' },
  Awaiting_Cleaning: { icon: '●', category: 'cleaning', tooltip: 'Bin requires cleaning before next use.\nNext: Cleaning In Progress\nRole: Cleaner' },
  Cleaning_In_Progress: { icon: '🧹', category: 'cleaning', tooltip: 'Cleaning operation is underway.\nNext: Awaiting QA\nRole: Cleaner' },
  Awaiting_QA: { icon: '●', category: 'qa', tooltip: 'Bin is awaiting quality inspection.\nNext: QA In Progress\nRole: QA Inspector' },
  QA_In_Progress: { icon: '🔬', category: 'qa', tooltip: 'Quality inspection is being performed.\nNext: QA Passed / QA Failed\nRole: QA Inspector' },
  QA_Passed: { icon: '✓', category: 'completed', tooltip: 'Bin has passed quality inspection.\nReady for next cycle.' },
  QA_Failed: { icon: '✗', category: 'rejected', tooltip: 'Bin failed quality inspection.\nNext: Reinspection Cleaning\nRole: QA Inspector' },
  Reinspection_Cleaning: { icon: '🧹', category: 'cleaning', tooltip: 'Re-cleaning after QA failure.\nNext: Awaiting Reinspection\nRole: Cleaner' },
  Awaiting_Reinspection: { icon: '●', category: 'qa', tooltip: 'Bin is awaiting re-inspection.\nNext: QA In Progress\nRole: QA Inspector' },
  Retired: { icon: '✕', category: 'retired', tooltip: 'Bin has been retired from service.' },
};

function EnterpriseStatusChip({ value }) {
  const theme = useTheme();
  const statusColors = theme.custom?.status || {};
  const cfg = statusColors[value];
  const meta = STATUS_META[value];
  if (!cfg && !meta) {
    return <Chip label={value} size="small" variant="outlined" sx={{ height: 24, fontSize: '0.7rem', fontWeight: 500 }} />;
  }
  return (
    <Tooltip title={<Box sx={{ whiteSpace: 'pre-line', fontSize: '0.7rem', lineHeight: 1.4 }}>{meta?.tooltip || cfg?.label || value}</Box>} arrow placement="top">
      <Chip
        icon={<Box component="span" sx={{ fontSize: 10, ml: '4px !important' }}>{meta?.icon || '●'}</Box>}
        label={cfg?.label || value}
        size="small"
        sx={{ backgroundColor: cfg?.bg || '#F5F5F5', color: cfg?.text || '#757575', fontWeight: 600, height: 24, fontSize: '0.72rem', borderRadius: '5px', '& .MuiChip-icon': { marginLeft: '6px' } }}
      />
    </Tooltip>
  );
}

function LocationChip({ label }) {
  if (!label) return <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>\u2014</Box>;
  return <Chip label={label} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 500, borderRadius: '4px', borderColor: 'divider' }} />;
}

// ─── Row expansion: lifecycle timeline ────────────────────────────────────────

function BinLifecycleTimeline({ row }) {
  const steps = [
    { label: 'Loading', start: row.Loading_Start_At, end: row.Loading_Completed_At, operator: row.Loaded_By, remarks: row.Loading_Remarks, status: row.Loading_Start_At ? (row.Loading_Completed_At ? 'completed' : 'active') : 'pending' },
    { label: 'Unloading', start: row.Unloading_Start_At, end: row.Unloading_Completed_At, operator: row.Unloaded_By, remarks: row.Unloading_Remarks, status: row.Unloading_Start_At ? (row.Unloading_Completed_At ? 'completed' : 'active') : 'pending' },
    { label: 'Cleaning', start: row.Cleaning_Start_At, end: row.Cleaning_Completed_At, operator: row.Cleaned_By, remarks: row.Cleaning_Remarks, agent: row.Cleaning_Agent, method: row.Cleaning_Method, status: row.Cleaning_Start_At ? (row.Cleaning_Completed_At ? 'completed' : 'active') : 'pending' },
    { label: 'QA', start: row.QA_Start_At, end: row.QA_Completed_At, operator: row.QA_Inspector, result: row.QA_Result, failureReason: row.Failure_Reason, status: row.QA_Start_At ? (row.QA_Completed_At ? 'completed' : 'active') : 'pending' },
  ];
  const statusColors = { completed: { dot: '#2E7D32', line: '#C8E6C9', bg: '#E8F5E9' }, active: { dot: '#1565C0', line: '#BBDEFB', bg: '#E3F0FF' }, pending: { dot: '#BDBDBD', line: '#E0E0E0', bg: '#FAFAFA' } };

  return (
    <Box sx={{ py: 2, px: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        {steps.map((step, idx) => {
          const cols = statusColors[step.status];
          const isLast = idx === steps.length - 1;
          return (
            <Box key={step.label} sx={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: cols.dot, flexShrink: 0, mr: 1, border: '2px solid', borderColor: cols.dot }} />
                {!isLast && <Box sx={{ flex: 1, height: 2, backgroundColor: step.status === 'completed' ? cols.line : '#E0E0E0', mr: -1 }} />}
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', color: cols.dot, display: 'block', mb: 0.5 }}>{step.label}</Typography>
              <Box sx={{ fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.4 }}>
                {step.start && <Box>Start: {new Date(step.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(step.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Box>}
                {step.end && <Box>End: {new Date(step.end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(step.end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Box>}
                {step.start && step.end && <Box sx={{ color: 'primary.main', fontWeight: 600, mt: 0.25 }}>Duration: {(() => { const diff = new Date(step.end) - new Date(step.start); const hrs = Math.floor(diff / 3600000); const mins = Math.floor((diff % 3600000) / 60000); return `${hrs}h ${mins}m`; })()}</Box>}
                {step.operator && <Box sx={{ mt: 0.25, fontWeight: 500 }}>Operator: {step.operator}</Box>}
                {step.agent && <Box sx={{ mt: 0.25 }}>Agent: {step.agent}</Box>}
                {step.method && <Box>Method: {step.method}</Box>}
                {step.result && <Box sx={{ mt: 0.25, fontWeight: 600, color: step.result === 'FAIL' ? 'error.main' : 'success.main' }}>Result: {step.result}</Box>}
                {step.failureReason && <Box sx={{ color: 'error.main', mt: 0.25 }}>Failure: {step.failureReason}</Box>}
                {step.remarks && <Box sx={{ fontStyle: 'italic', mt: 0.25 }}>"{step.remarks}"</Box>}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ─── Investigation Drawer ──────────────────────────────────────────────────────

function InvestigationDrawer({ bin, open, onClose, onOpenHistory, onOpenAudit }) {
  if (!bin) return null;
  const theme = useTheme();

  const hasLifecycle = bin.Loading_Start_At || bin.Unloading_Start_At || bin.Cleaning_Start_At || bin.QA_Start_At;
  const lifecycleStages = [
    { key: 'Loading', started: bin.Loading_Start_At, completed: bin.Loading_Completed_At, operator: bin.Loaded_By },
    { key: 'Unloading', started: bin.Unloading_Start_At, completed: bin.Unloading_Completed_At, operator: bin.Unloaded_By },
    { key: 'Cleaning', started: bin.Cleaning_Start_At, completed: bin.Cleaning_Completed_At, operator: bin.Cleaned_By },
    { key: 'QA', started: bin.QA_Start_At, completed: bin.QA_Completed_At, operator: bin.QA_Inspector, result: bin.QA_Result },
  ];

  const completedStages = lifecycleStages.filter(s => s.completed).length;
  const progressPct = lifecycleStages.length > 0 ? Math.round((completedStages / lifecycleStages.length) * 100) : 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 540 }, p: 0 } }}
    >
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: '#F8FAFD' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em' }}>
              Investigation Summary
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'primary.main', mt: 0.5 }}>
              {bin.Bin_Number}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <EnterpriseStatusChip value={bin.Current_Status} />
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <ClearIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Info grid */}
      <Box sx={{ p: 2.5 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Material</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{bin.Material_Name || '\u2014'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Batch</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{bin.Batch_Number || '\u2014'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Current Bay</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{bin.Current_Bay || '\u2014'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Current Tank</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{bin.Current_Tank || '\u2014'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Current Operator</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{bin.Loaded_By || bin.Unloaded_By || bin.Cleaned_By || bin.QA_Inspector || '\u2014'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Last Updated</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{bin.Last_Updated ? new Date(bin.Last_Updated).toLocaleString('en-GB') : '\u2014'}</Typography>
          </Grid>
        </Grid>

        {/* Lifecycle progress */}
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em' }}>
            Lifecycle Progress
          </Typography>
          {!hasLifecycle ? (
            <Paper variant="outlined" sx={{ mt: 1, p: 2, textAlign: 'center', bgcolor: '#FAFBFC' }}>
              <InfoOutlinedIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                This bin has not entered an operational cycle yet.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>{completedStages} of {lifecycleStages.length} complete</Typography>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'primary.main', fontWeight: 600 }}>{progressPct}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progressPct} sx={{ height: 6, borderRadius: 3, mb: 2 }} />
              {lifecycleStages.map((stage, idx) => (
                <Box key={stage.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, borderBottom: idx < lifecycleStages.length - 1 ? `1px solid ${theme.palette.divider}` : 'none' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: stage.completed ? 'success.main' : stage.started ? 'info.main' : 'grey.300', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>{stage.key}</Typography>
                    {stage.operator && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.62rem' }}>{stage.operator}</Typography>}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    {stage.completed ? (
                      <Chip label="Done" size="small" color="success" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600 }} />
                    ) : stage.started ? (
                      <Chip label="Active" size="small" color="info" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600 }} />
                    ) : (
                      <Chip label="Pending" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* QA Result if applicable */}
        {bin.QA_Result && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary' }}>
              QA Result
            </Typography>
            <Chip
              label={bin.QA_Result}
              size="small"
              color={bin.QA_Result === 'PASS' ? 'success' : 'error'}
              sx={{ mt: 0.5, fontWeight: 600, fontSize: '0.7rem' }}
            />
            {bin.Failure_Reason && (
              <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontSize: '0.68rem' }}>
                {bin.Failure_Reason}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Action buttons */}
      <Box sx={{ p: 2.5, borderTop: `1px solid ${theme.palette.divider}`, mt: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<HistoryIcon />}
            fullWidth
            onClick={() => { onClose(); onOpenHistory(bin); }}
            size="medium"
          >
            Open Bin History
          </Button>
          <Button
            variant="outlined"
            startIcon={<TimelineIcon />}
            fullWidth
            onClick={() => { onClose(); onOpenAudit(bin); }}
            size="medium"
          >
            Open Audit Trail
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

// ─── Column chooser popover ────────────────────────────────────────────────────

function ColumnChooserPopover({ columns, visibleKeys, onToggle, open, anchorEl, onClose }) {
  return (
    <Popover open={open} anchorEl={anchorEl} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { p: 1.5, minWidth: 240, maxHeight: 400, overflowY: 'auto' } }}>
      <Typography variant="overline" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>Visible Columns</Typography>
      {columns.map((col) => (
        <FormControlLabel
          key={col.key}
          control={<Checkbox size="small" checked={visibleKeys.includes(col.key)} onChange={() => onToggle(col.key)} disabled={col.key === 'Bin_Number' || col.key === '_actions'} />}
          label={<Typography variant="caption">{col.label}</Typography>}
          sx={{ display: 'block', m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
        />
      ))}
    </Popover>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_HEIGHT = 36;
const ALL = null;

const STATUSES = [
  { label: 'Awaiting Loading', value: 'Awaiting_Loading' },
  { label: 'Loading In Progress', value: 'Loading_In_Progress' },
  { label: 'Awaiting Unloading', value: 'Awaiting_Unloading' },
  { label: 'Unloading In Progress', value: 'Unloading_In_Progress' },
  { label: 'Awaiting Cleaning', value: 'Awaiting_Cleaning' },
  { label: 'Cleaning In Progress', value: 'Cleaning_In_Progress' },
  { label: 'Awaiting QA', value: 'Awaiting_QA' },
  { label: 'QA In Progress', value: 'QA_In_Progress' },
  { label: 'QA Passed', value: 'QA_Passed' },
  { label: 'QA Failed', value: 'QA_Failed' },
  { label: 'Reinspection Cleaning', value: 'Reinspection_Cleaning' },
  { label: 'Awaiting Reinspection', value: 'Awaiting_Reinspection' },
  { label: 'Retired', value: 'Retired' },
];

const EXPORT_COLUMNS = [
  { key: 'Bin_Number', label: 'Bin Number' }, { key: 'Bin_Type', label: 'Bin Type' },
  { key: 'Current_Status', label: 'Current Status' }, { key: 'Current_Bay', label: 'Current Bay' },
  { key: 'Current_Tank', label: 'Current Tank' }, { key: 'Material_Name', label: 'Material' },
  { key: 'Batch_Number', label: 'Batch Number' }, { key: 'Quantity_Loaded', label: 'Quantity Loaded' },
  { key: 'Unit_Of_Measure', label: 'Unit' }, { key: 'Loaded_By', label: 'Loaded By' },
  { key: 'Loading_Start_At', label: 'Loading Start' }, { key: 'Loading_Completed_At', label: 'Loading End' },
  { key: 'Unloaded_By', label: 'Unloaded By' }, { key: 'Unloading_Start_At', label: 'Unloading Start' },
  { key: 'Unloading_Completed_At', label: 'Unloading End' }, { key: 'Cleaned_By', label: 'Cleaned By' },
  { key: 'Cleaning_Start_At', label: 'Cleaning Start' }, { key: 'Cleaning_Completed_At', label: 'Cleaning End' },
  { key: 'QA_Inspector', label: 'QA Inspector' }, { key: 'QA_Result', label: 'QA Result' },
  { key: 'QA_Start_At', label: 'QA Start' }, { key: 'QA_Completed_At', label: 'QA End' },
  { key: 'Failure_Reason', label: 'Failure Reason' }, { key: 'Last_Updated', label: 'Last Updated' },
];

function buildAllColumns(navigate, onOpenInvestigation) {
  return [
    { key: 'Bin_Number', label: 'Bin Number', group: 'Identity', minWidth: 100, sticky: true },
    { key: 'QR_Code', label: 'QR Code', group: 'Identity', minWidth: 100 },
    { key: 'Bin_Type', label: 'Bin Type', group: 'Identity', minWidth: 75 },
    { key: 'Material_Name', label: 'Material', group: 'Identity', minWidth: 100 },
    { key: 'Batch_Number', label: 'Batch', group: 'Identity', minWidth: 85 },
    { key: 'Current_Bay', label: 'Bay', group: 'Location', minWidth: 75, render: (r) => <LocationChip label={r.Current_Bay} /> },
    { key: 'Current_Tank', label: 'Tank', group: 'Location', minWidth: 75, render: (r) => <LocationChip label={r.Current_Tank} /> },
    { key: 'Current_Status', label: 'Status', group: 'Current Status', minWidth: 130, render: (r) => <EnterpriseStatusChip value={r.Current_Status} /> },
    { key: 'Loading_Start_At', label: 'Load Start', group: 'Operations', minWidth: 95, render: (r) => renderDateTime(r.Loading_Start_At) },
    { key: 'Loading_Completed_At', label: 'Load End', group: 'Operations', minWidth: 95, render: (r) => renderDateTime(r.Loading_Completed_At) },
    { key: 'Unloading_Start_At', label: 'Unld Start', group: 'Operations', minWidth: 95, render: (r) => renderDateTime(r.Unloading_Start_At) },
    { key: 'Unloading_Completed_At', label: 'Unld End', group: 'Operations', minWidth: 95, render: (r) => renderDateTime(r.Unloading_Completed_At) },
    { key: 'Cleaning_Start_At', label: 'Cln Start', group: 'Operations', minWidth: 95, render: (r) => renderDateTime(r.Cleaning_Start_At) },
    { key: 'Cleaning_Completed_At', label: 'Cln End', group: 'Operations', minWidth: 95, render: (r) => renderDateTime(r.Cleaning_Completed_At) },
    { key: 'QA_Start_At', label: 'QA Start', group: 'Operations', minWidth: 95, render: (r) => renderDateTime(r.QA_Start_At) },
    { key: 'QA_Completed_At', label: 'QA End', group: 'Operations', minWidth: 95, render: (r) => renderDateTime(r.QA_Completed_At) },
    { key: 'Loaded_By', label: 'Loaded By', group: 'Operators', minWidth: 90 },
    { key: 'Unloaded_By', label: 'Unld By', group: 'Operators', minWidth: 90 },
    { key: 'Cleaned_By', label: 'Cleaner', group: 'Operators', minWidth: 90 },
    { key: 'QA_Inspector', label: 'QA Insp', group: 'Operators', minWidth: 90 },
    { key: 'Cycle_Count', label: 'Cycles', group: 'Operational', minWidth: 55 },
    { key: 'Last_Updated', label: 'Updated', group: 'Operational', minWidth: 95, render: (r) => renderDateTime(r.Last_Updated) },
    { key: 'QA_Result', label: 'QA Result', group: 'Operational', minWidth: 75 },
    { key: 'Failure_Reason', label: 'Failure', group: 'Operational', minWidth: 120 },
    { key: 'Cleaning_Agent', label: 'Agent', group: 'Operational', minWidth: 100 },
    { key: 'Cleaning_Method', label: 'Method', group: 'Operational', minWidth: 90 },
    { key: 'Remarks', label: 'Remarks', group: 'Operational', minWidth: 130 },
    {
      key: '_actions', label: 'Actions', group: 'Actions', minWidth: 120, sticky: true,
      render: (r) => (
        <Box sx={{ display: 'flex', gap: 0, justifyContent: 'center', alignItems: 'center' }}>
          <Tooltip title="Open Investigation"><IconButton size="small" onClick={(e) => { e.stopPropagation(); onOpenInvestigation(r); }} sx={{ p: 0.25 }}><InfoOutlinedIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
          <Tooltip title="View Bin History"><IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/audit/bin-history?binNumber=${r.Bin_Number}`); }} sx={{ p: 0.25 }}><HistoryIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
          <Tooltip title="View Audit Trail"><IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/audit/log?targetId=${r.Bin_ID}&targetEntity=Bin_Master`); }} sx={{ p: 0.25 }}><TimelineIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
          <Tooltip title="Copy Bin Number"><IconButton size="small" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(r.Bin_Number); }} sx={{ p: 0.25 }}><ContentCopyIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
          <Tooltip title="Copy QR"><IconButton size="small" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(r.QR_Code || r.Bin_Number); }} sx={{ p: 0.25 }}><QrCodeIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
        </Box>
      ),
    },
  ];
}

// ─── KPI cards ─────────────────────────────────────────────────────────────────

function BinSummaryKpis({ summary, loading }) {
  const kpis = [
    { label: 'Total Bins', value: summary?.total_bins, icon: <InventoryIcon />, color: 'primary.main' },
    { label: 'Available', value: summary?.available, icon: <CheckCircleOutlineIcon />, color: 'success.main' },
    { label: 'Loading', value: summary?.loading, icon: <AutorenewIcon />, color: 'info.main' },
    { label: 'Unloading', value: summary?.unloading, icon: <LocalShippingIcon />, color: 'warning.main' },
    { label: 'Cleaning', value: summary?.cleaning, icon: <CleaningServicesIcon />, color: '#00838F' },
    { label: 'QA', value: summary?.qa_in_progress, icon: <ScienceIcon />, color: '#7B1FA2' },
    { label: 'Completed Today', value: summary?.completed_today, icon: <TaskAltIcon />, color: 'success.dark' },
    { label: 'Rejected Today', value: summary?.rejected_today, icon: <CancelIcon />, color: summary?.rejected_today > 0 ? 'error.main' : 'text.secondary' },
  ];
  return (
    <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
      {kpis.map((kpi) => (
        <Grid item xs={6} sm={4} md={3} lg={1.5} key={kpi.label}>
          {loading ? <Paper sx={{ p: 1.5 }}><Skeleton variant="text" width="60%" height={16} /><Skeleton variant="text" width="40%" height={28} sx={{ mt: 0.5 }} /></Paper> : <KpiTile icon={kpi.icon} label={kpi.label} value={kpi.value ?? '\u2014'} color={kpi.color} sx={{ height: '100%' }} />}
        </Grid>
      ))}
    </Grid>
  );
}

function exportExcel(rows, filename) {
  const data = rows.map(row => { const obj = {}; EXPORT_COLUMNS.forEach(col => { obj[col.label] = row[col.key] != null ? String(row[col.key]) : ''; }); return obj; });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bin Summary');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportPdf(rows, title, filename) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(10);
  doc.text(title, 14, 14);
  const head = [EXPORT_COLUMNS.map(c => c.label)];
  const body = rows.map(row => EXPORT_COLUMNS.map(c => { const val = row[c.key]; return val != null ? String(val) : ''; }));
  doc.autoTable({ head, body, startY: 20, styles: { fontSize: 7 }, headStyles: { fontSize: 7, fillColor: [15, 76, 129] } });
  doc.save(`${filename}.pdf`);
}

const DEFAULT_VISIBLE = ['Bin_Number', 'Current_Status', 'Loaded_By', 'Unloaded_By', 'Cleaned_By', 'QA_Inspector', 'Loading_Start_At', 'Loading_Completed_At', 'Unloading_Start_At', 'Unloading_Completed_At', 'Cleaning_Start_At', 'Cleaning_Completed_At', 'QA_Start_At', 'QA_Completed_At', 'Last_Updated', '_actions'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BinSummary() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const urlStatusFilter = useMemo(() => { const raw = searchParams.get('status'); return raw ? raw.split(',') : null; }, [searchParams]);

  // Restore saved filters on mount
  const savedState = useMemo(() => loadFiltersFromSession(), []);

  const [data, setData] = useState({ rows: [], totalCount: 0, summary: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [masterData, setMasterData] = useState({ bays: [], tanks: [], materials: [] });

  const [filters, setFilters] = useState(savedState?.filters || { status: ALL, bay: ALL, tank: ALL, material: ALL, search: '', fromDate: '', toDate: '' });
  const [expandedRows, setExpandedRows] = useState(savedState?.expandedRows || {});
  // Merge saved visibleKeys with DEFAULT_VISIBLE so newly added columns
  // appear automatically without requiring a sessionStorage reset.
  const initVisibleKeys = useMemo(() => {
    const saved = savedState?.visibleKeys;
    if (!saved || !Array.isArray(saved)) return DEFAULT_VISIBLE;
    // Ensure all DEFAULT_VISIBLE keys are present; any new defaults get appended
    const keys = new Set(saved);
    DEFAULT_VISIBLE.forEach(k => keys.add(k));
    return Array.from(keys);
  }, [savedState]);
  const [visibleKeys, setVisibleKeys] = useState(initVisibleKeys);
  const [columnChooserAnchor, setColumnChooserAnchor] = useState(null);
  const columnChooserOpen = Boolean(columnChooserAnchor);

  // Investigation drawer
  const [investigationBin, setInvestigationBin] = useState(null);

  const allColumns = useMemo(() => buildAllColumns(navigate, (bin) => setInvestigationBin(bin)), [navigate]);
  const visibleColumns = useMemo(() => allColumns.filter(c => visibleKeys.includes(c.key)), [allColumns, visibleKeys]);

  // Save filter state to session whenever it changes
  useEffect(() => { saveFiltersToSession(filters, expandedRows, visibleKeys); }, [filters, expandedRows, visibleKeys]);

  // Clear saved state when component unmounts (clean navigation back)
  useEffect(() => { return () => { clearFiltersSession(); }; }, []);

  useEffect(() => {
    Promise.all([masterService.getAllBays(), masterService.getTanks(), masterService.getAllMaterials()])
      .then(([baysRes, tanksRes, matsRes]) => setMasterData({ bays: baysRes.data?.data || [], tanks: tanksRes.data?.data || [], materials: matsRes.data?.data || [] }))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const effectiveStatus = filters.status !== ALL ? filters.status : (urlStatusFilter ? urlStatusFilter.join(',') : null);
      const params = {
        search: filters.search || undefined,
        status: effectiveStatus || undefined,
        bayId: filters.bay !== ALL ? Number(filters.bay) : undefined,
        tankId: filters.tank !== ALL ? Number(filters.tank) : undefined,
        materialId: filters.material !== ALL ? Number(filters.material) : undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        page: 1,
        pageSize: 500,
      };
      const res = await binSummaryService.getSummary(params);
      const result = res.data?.data || {};
      setData({
        rows: result.rows || [],
        totalCount: result.pagination?.totalCount || 0,
        summary: result.summary || null,
      });
    } catch (e) { setError('Failed to load bin summary'); setData({ rows: [], totalCount: 0, summary: null }); }
    finally { setLoading(false); }
  }, [filters, urlStatusFilter]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleFilterChange = (field) => (e) => { setFilters(prev => ({ ...prev, [field]: e.target.value === '' ? ALL : e.target.value })); };
  const handleSearchChange = (e) => setFilters(prev => ({ ...prev, search: e.target.value }));
  const handleResetFilters = () => setFilters({ status: ALL, bay: ALL, tank: ALL, material: ALL, search: '', fromDate: '', toDate: '' });
  const handleRefresh = () => fetchReport();
  const handleExportExcel = () => exportExcel(data.rows, 'PBLMS_Bin_Summary');
  const handleExportPdf = () => exportPdf(data.rows, 'Bin Summary - PBLMS', 'PBLMS_Bin_Summary');
  const toggleRow = (binNumber) => setExpandedRows(prev => ({ ...prev, [binNumber]: !prev[binNumber] }));
  const toggleColumn = (key) => setVisibleKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const anyFilterActive = filters.status !== ALL || filters.bay !== ALL || filters.tank !== ALL || filters.material !== ALL || filters.search !== '' || filters.fromDate !== '' || filters.toDate !== '';

  // Build table columns with row click to expand and investigation trigger
  const tableColumns = useMemo(() => {
    return visibleColumns.map(col => {
      if (col.key === 'Bin_Number') {
        return {
          ...col,
          render: (r) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', minWidth: 0 }}
              onClick={(e) => { e.stopPropagation(); toggleRow(r.Bin_Number); }}
              role="button" tabIndex={0}
              aria-label={`Expand row for bin ${r.Bin_Number}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(r.Bin_Number); } }}
            >
              <IconButton size="small" sx={{ p: 0, flexShrink: 0 }}>
                {expandedRows[r.Bin_Number] ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
              </IconButton>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', fontFamily: 'monospace', color: 'primary.main' }}>
                {r.Bin_Number}
              </Typography>
            </Box>
          ),
        };
      }
      return col;
    });
  }, [visibleColumns, expandedRows]);

  const renderFilter = (label, value, options, onChange, width = 140) => (
    <FormControl size="small" sx={{ minWidth: width }}>
      <InputLabel sx={{ fontSize: '0.72rem' }}>{label}</InputLabel>
      <Select value={value ?? ''} label={label} onChange={onChange} sx={{ fontSize: '0.72rem', height: FILTER_HEIGHT, '& .MuiSelect-select': { py: 0.75 } }}>
        <MenuItem value="" sx={{ fontSize: '0.72rem' }}><em>All</em></MenuItem>
        {options.map(opt => <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.72rem' }}>{opt.label}</MenuItem>)}
      </Select>
    </FormControl>
  );

  const enterpriseToolbar = (
    <Paper elevation={0} sx={{ p: 1.25, mb: 0, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', border: `1px solid ${theme.palette.divider}`, borderRadius: 1, backgroundColor: '#FAFBFC' }}>
      <TextField value={filters.search} onChange={handleSearchChange} placeholder="Search bins..." size="small" variant="outlined"
        sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { height: FILTER_HEIGHT, fontSize: '0.72rem' } }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
          endAdornment: filters.search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setFilters(p => ({ ...p, search: '' }))} sx={{ p: 0.25 }}><ClearIcon sx={{ fontSize: 14 }} /></IconButton></InputAdornment> : null,
        }}
      />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
      {renderFilter('Status', filters.status, STATUSES, handleFilterChange('status'), 150)}
      {renderFilter('Bay', filters.bay, masterData.bays.map(b => ({ label: b.Bay_Name, value: String(b.Bay_ID) })), handleFilterChange('bay'), 110)}
      {renderFilter('Tank', filters.tank, masterData.tanks.map(t => ({ label: t.Tank_Name, value: String(t.Tank_ID) })), handleFilterChange('tank'), 110)}
      {renderFilter('Material', filters.material, masterData.materials.map(m => ({ label: m.Material_Name, value: String(m.Material_ID) })), handleFilterChange('material'), 160)}
      <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
      <DateRangeFilter from={filters.fromDate} to={filters.toDate} onFromChange={v => setFilters(p => ({ ...p, fromDate: v }))} onToChange={v => setFilters(p => ({ ...p, toDate: v }))} fromLabel="From Date" toLabel="To Date" size="small"
        sx={{ '& .MuiTextField-root': { minWidth: 145, '& .MuiOutlinedInput-root': { height: FILTER_HEIGHT, fontSize: '0.72rem' } } }}
      />
      <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5, alignItems: 'center' }}>
        {anyFilterActive && <Tooltip title="Reset all filters"><Button size="small" variant="text" onClick={handleResetFilters} startIcon={<ClearIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: '0.72rem', minHeight: 32, color: 'text.secondary' }}>Reset</Button></Tooltip>}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
        <Tooltip title="Choose columns"><IconButton size="small" onClick={e => setColumnChooserAnchor(e.currentTarget)} sx={{ p: 1 }}><ViewColumnIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
        <ColumnChooserPopover columns={allColumns.filter(c => c.key !== '_actions')} visibleKeys={visibleKeys} onToggle={toggleColumn} open={columnChooserOpen} anchorEl={columnChooserAnchor} onClose={() => setColumnChooserAnchor(null)} />
        <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
        <Tooltip title="Refresh data"><IconButton size="small" onClick={handleRefresh} disabled={loading} sx={{ p: 1 }}><RefreshIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
        <Tooltip title="Export to Excel"><span><IconButton size="small" onClick={handleExportExcel} disabled={!data.rows.length} sx={{ p: 1 }}><FileDownloadIcon sx={{ fontSize: 18 }} /></IconButton></span></Tooltip>
        <Tooltip title="Export to PDF"><span><IconButton size="small" onClick={handleExportPdf} disabled={!data.rows.length} sx={{ p: 1 }}><PictureAsPdfIcon sx={{ fontSize: 18 }} /></IconButton></span></Tooltip>
      </Box>
    </Paper>
  );

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <PageHeader title="Bin Summary" subtitle={urlStatusFilter ? `Filtered by status: ${urlStatusFilter.join(', ')}` : 'Manufacturing Execution System — Operational Console'}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={`${data.totalCount} bins`} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem', height: 28 }} />
            {loading && <Chip label="Loading..." size="small" color="primary" variant="outlined" sx={{ height: 28, fontSize: '0.7rem' }} />}
          </Box>
        </PageHeader>

        <BinSummaryKpis summary={data.summary} loading={loading} />
        {enterpriseToolbar}
        <Box sx={{ mt: 0 }} />

        <ReportTable columns={tableColumns} rows={data.rows} loading={loading} error={error} onRetry={handleRefresh} onExcel={handleExportExcel} onPdf={handleExportPdf}
          stickyFirstColumn={true} emptyMessage="No bins found matching the selected criteria. Try adjusting your filters."
          slots={{ toolbarStart: null }}
          onRowClick={(r) => toggleRow(r.Bin_Number)}
        />

        {data.rows.length > 0 && Object.keys(expandedRows).some(k => expandedRows[k]) && (
          <Paper sx={{ mt: 0.5, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: 'hidden' }}>
            {data.rows.filter(r => expandedRows[r.Bin_Number]).map(r => (
              <Box key={r.Bin_Number} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, '&:last-child': { borderBottom: 'none' } }}>
                <Box sx={{ px: 2, py: 1, backgroundColor: '#F8FAFD', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => toggleRow(r.Bin_Number)} role="button" tabIndex={0}
                  aria-label={`Collapse row for bin ${r.Bin_Number}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(r.Bin_Number); } }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="overline" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Bin {r.Bin_Number}</Typography>
                    <EnterpriseStatusChip value={r.Current_Status} />
                    {r.Material_Name && <Chip label={r.Material_Name} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 22 }} />}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Open Investigation"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setInvestigationBin(r); }} sx={{ p: 0.5 }}><InfoOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                    <Tooltip title="Bin History"><IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/audit/bin-history?binNumber=${r.Bin_Number}`); }} sx={{ p: 0.5 }}><HistoryIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                    <IconButton size="small" sx={{ p: 0.5 }}><ExpandLessIcon sx={{ fontSize: 18 }} /></IconButton>
                  </Box>
                </Box>
                <Collapse in={true}><BinLifecycleTimeline row={r} /></Collapse>
              </Box>
            ))}
          </Paper>
        )}

        {/* Investigation Drawer */}
        <InvestigationDrawer
          bin={investigationBin}
          open={Boolean(investigationBin)}
          onClose={() => setInvestigationBin(null)}
          onOpenHistory={(bin) => navigate(`/admin/audit/bin-history?binNumber=${bin.Bin_Number}`)}
          onOpenAudit={(bin) => navigate(`/admin/audit/log?targetId=${bin.Bin_ID}&targetEntity=Bin_Master`)}
        />
      </Box>
    </PortalLayout>
  );
}