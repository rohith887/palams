import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Chip, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../../components/layout/PortalLayout';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import PageHeader from '../../../components/common/PageHeader';
import DataTable from '../../../components/common/DataTable';
import EmptyState from '../../../components/common/EmptyState';
import FilterBar from '../../../components/common/FilterBar';
import useAuth from '../../../hooks/useAuth';
import qaService from '../../../services/qaService';
import masterService from '../../../services/masterService';
import { STATUS_LABELS } from '../../../constants/statusLabels';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const SORT_OPTIONS = [
  { value: 'oldest', label: 'Oldest Waiting' },
  { value: 'newest', label: 'Newest' },
  { value: 'priority', label: 'Priority' },
  { value: 'bin_number', label: 'Bin Number' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'High', label: 'High (Reinspection)' },
  { value: 'Normal', label: 'Normal' },
];

function formatDuration(minutes) {
  if (minutes == null) return '\u2014';
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs < 24) return `${hrs}h ${mins}m`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h`;
}

export default function QAQueue() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [materials, setMaterials] = useState([]);
  const [bays, setBays] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    materialId: '',
    bayId: '',
    priority: '',
    fromDate: '',
    toDate: '',
    search: '',
  });
  const [sortBy, setSortBy] = useState('oldest');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: page + 1, pageSize, sortBy };
      if (filters.materialId) params.materialId = filters.materialId;
      if (filters.bayId) params.bayId = filters.bayId;
      if (filters.priority) params.priority = filters.priority;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;
      if (filters.search) params.search = filters.search;

      const res = await qaService.getQueue(params);
      const data = res.data.data;
      setRows(data.rows || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, page, pageSize]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    masterService.getAllMaterials().then(r => setMaterials(r.data.data || [])).catch(() => {});
    masterService.getAllBays().then(r => setBays(r.data.data || [])).catch(() => {});
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({ materialId: '', bayId: '', priority: '', fromDate: '', toDate: '', search: '' });
    setSortBy('oldest');
    setPage(0);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const columns = [
    { key: 'Bin_Number', label: 'Bin', sortable: true, minWidth: 90 },
    {
      key: 'Current_Status', label: 'Status', minWidth: 130,
      render: (row) => (
        <Chip
          label={STATUS_LABELS[row.Current_Status] || row.Current_Status}
          color={row.Current_Status === 'Awaiting_Reinspection' ? 'warning' : 'primary'}
          size="small"
        />
      ),
    },
    {
      key: 'priority', label: 'Priority', minWidth: 80,
      render: (row) => (
        <Chip
          label={row.priority}
          color={row.priority === 'High' ? 'error' : 'default'}
          size="small"
          variant={row.priority === 'High' ? 'filled' : 'outlined'}
        />
      ),
    },
    { key: 'Material_Name', label: 'Material', minWidth: 130 },
    { key: 'Batch_Number', label: 'Batch', minWidth: 100 },
    { key: 'Bay_Code', label: 'Bay', minWidth: 70 },
    { key: 'Tank_Code', label: 'Tank', minWidth: 70 },
    { key: 'Cleaner_Name', label: 'Cleaning Operator', minWidth: 130 },
    {
      key: 'Cleaning_Completed_At', label: 'Cleaning Completed', minWidth: 140,
      render: (row) => row.Cleaning_Completed_At
        ? new Date(row.Cleaning_Completed_At).toLocaleString()
        : '\u2014',
    },
    {
      key: 'waiting_minutes', label: 'Waiting', minWidth: 80,
      render: (row) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: row.waiting_minutes > 1440 ? 700 : 400,
            color: row.waiting_minutes > 1440 ? 'error.main' : row.waiting_minutes > 480 ? 'warning.main' : 'text.primary',
          }}
        >
          {formatDuration(row.waiting_minutes)}
        </Typography>
      ),
    },
    {
      key: 'actions', label: '', minWidth: 120,
      sx: { textAlign: 'right' },
      render: (row) => (
        <Button
          variant="contained"
          size="small"
          startIcon={<PlayArrowIcon />}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/qa/workspace/${row.Bin_ID}`);
          }}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Start Inspection
        </Button>
      ),
    },
  ];

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <PageHeader title="Inspection Queue" subtitle="All bins waiting for quality assurance">
          <Button
            variant="text"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/qa/dashboard')}
          >
            Dashboard
          </Button>
          <Tooltip title={showFilters ? 'Hide filters' : 'Show filters'}>
            <IconButton size="small" onClick={() => setShowFilters(!showFilters)}>
              <FilterListIcon color={hasActiveFilters ? 'primary' : 'inherit'} />
            </IconButton>
          </Tooltip>
        </PageHeader>

        {showFilters && (
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid item xs={6} sm={4} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Material</InputLabel>
                <Select
                  value={filters.materialId}
                  label="Material"
                  onChange={e => handleFilterChange('materialId', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {materials.map(m => (
                    <MenuItem key={m.Material_ID} value={m.Material_ID}>{m.Material_Name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Bay</InputLabel>
                <Select
                  value={filters.bayId}
                  label="Bay"
                  onChange={e => handleFilterChange('bayId', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {bays.map(b => (
                    <MenuItem key={b.Bay_ID} value={b.Bay_ID}>{b.Bay_Name} ({b.Bay_Code})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  label="Priority"
                  onChange={e => handleFilterChange('priority', e.target.value)}
                >
                  {PRIORITY_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                fullWidth
                size="small"
                label="From Date"
                type="date"
                value={filters.fromDate}
                onChange={e => handleFilterChange('fromDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                fullWidth
                size="small"
                label="To Date"
                type="date"
                value={filters.toDate}
                onChange={e => handleFilterChange('toDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Search Bin"
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                placeholder="Bin number"
              />
            </Grid>
          </Grid>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Sort by</InputLabel>
            <Select value={sortBy} label="Sort by" onChange={e => { setSortBy(e.target.value); setPage(0); }}>
              {SORT_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {hasActiveFilters && (
            <Button size="small" onClick={handleClearFilters} startIcon={<ClearIcon />}>
              Clear filters
            </Button>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {totalCount} bin{totalCount !== 1 ? 's' : ''} in queue
          </Typography>
        </Box>

        {loading && <LoadingSpinner />}

        {error && (
          <EmptyState
            title="Failed to load queue"
            message={error}
            actionLabel="Retry"
            onAction={fetchQueue}
          />
        )}

        {!loading && !error && (
          rows.length === 0 ? (
            <EmptyState
              icon={<SearchIcon />}
              title="No bins in queue"
              message={hasActiveFilters ? 'Try adjusting your filters.' : 'All bins have been inspected.'}
              actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
              onAction={hasActiveFilters ? handleClearFilters : undefined}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              keyField="Bin_ID"
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={(e, p) => setPage(p)}
              onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
              emptyMessage="No bins match the current filters"
            />
          )
        )}
      </Box>
    </PortalLayout>
  );
}
