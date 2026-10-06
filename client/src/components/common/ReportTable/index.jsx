import { useState, useMemo } from 'react';
import {
  Box, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination,
  TableSortLabel, Typography, InputAdornment, Paper, Button, Tooltip, IconButton, Skeleton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';

function descendingComparator(a, b, key) {
  const aVal = a[key] ?? '';
  const bVal = b[key] ?? '';
  if (aVal < bVal) return -1;
  if (aVal > bVal) return 1;
  return 0;
}

function getComparator(order, key) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, key)
    : (a, b) => -descendingComparator(a, b, key);
}

function stableSort(array, comparator) {
  const stabilized = array.map((el, index) => [el, index]);
  stabilized.sort((a, b) => {
    const cmp = comparator(a[0], b[0]);
    if (cmp !== 0) return cmp;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

export default function ReportTable({
  columns,
  rows,
  loading,
  error,
  onRetry,
  onExcel,
  onPdf,
  stickyFirstColumn = true,
  slots = {},
  emptyMessage = 'No records found.',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const handleSort = (key) => {
    const isAsc = sortBy === key && sortOrder === 'asc';
    setSortBy(key);
    setSortOrder(isAsc ? 'desc' : 'asc');
  };

  const handlePageChange = (_, newPage) => setPage(newPage);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(0);
  };

  const searchedRows = useMemo(() => {
    if (!searchTerm || !rows.length) return rows;
    const lower = searchTerm.toLowerCase();
    const filtered = rows.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(lower);
      }),
    );
    return filtered;
  }, [rows, searchTerm, columns]);

  const comparator = useMemo(() => getComparator(sortOrder, sortBy), [sortOrder, sortBy]);
  const sortedRows = useMemo(() => stableSort(searchedRows, comparator), [searchedRows, comparator]);

  const pagedRows = useMemo(() => {
    const start = page * pageSize;
    const p = sortedRows.slice(start, start + pageSize);
    return p;
  }, [sortedRows, page, pageSize]);

  if (loading) {
    const skeletonRow = (key) => (
      <TableRow key={key}>
        {columns.map((col) => (
          <TableCell key={col.key} sx={{ py: 0.375, px: 1 }}>
            <Skeleton variant="text" width={col.minWidth ? col.minWidth * 0.55 : 60} height={16} />
          </TableCell>
        ))}
      </TableRow>
    );
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
          {slots.toolbarStart}
          <TextField
            disabled
            value=""
            placeholder="Search within results..."
            size="small"
            variant="outlined"
            sx={{ minWidth: 280 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment>,
            }}
          />
          <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
            <Tooltip title="Export Excel">
              <span><IconButton size="small" disabled><FileDownloadIcon fontSize="small" /></IconButton></span>
            </Tooltip>
            <Tooltip title="Export PDF">
              <span><IconButton size="small" disabled><PictureAsPdfIcon fontSize="small" /></IconButton></span>
            </Tooltip>
            <Tooltip title="Refresh">
              <span><IconButton size="small" disabled><RefreshIcon fontSize="small" /></IconButton></span>
            </Tooltip>
          </Box>
        </Box>
        <Paper sx={{ overflow: 'hidden' }}>
          <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
            <Table size="small" stickyHeader sx={{ minWidth: columns.reduce((sum, c) => sum + (c.minWidth || 80), 0) }}>
              <TableHead>
                <TableRow>
                  {columns.map((col, colIndex) => {
                    const isFirst = stickyFirstColumn && colIndex === 0;
                    return (
                      <TableCell key={col.key} sx={{ minWidth: col.minWidth, fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', bgcolor: 'background.paper', py: 0.5, ...(isFirst ? { position: 'sticky', left: 0, zIndex: 3 } : {}) }}>
                        {col.label}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {[1, 2, 3, 4, 5].map(skeletonRow)}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', border: '1px solid', borderColor: 'error.light' }}>
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>
        {onRetry && (
          <Button variant="outlined" size="small" onClick={onRetry}>Retry</Button>
        )}
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        {slots.toolbarStart}
        <TextField
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
          placeholder="Search within results..."
          size="small"
          variant="outlined"
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
          }}
        />
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
          <Tooltip title="Export Excel">
            <span>
              <IconButton size="small" onClick={onExcel} disabled={!rows.length}>
                <FileDownloadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export PDF">
            <span>
              <IconButton size="small" onClick={onPdf} disabled={!rows.length}>
                <PictureAsPdfIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={onRetry}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
          <Table size="small" stickyHeader sx={{ minWidth: columns.reduce((sum, c) => sum + (c.minWidth || 80), 0) }}>
            <TableHead>
              <TableRow>
                {columns.map((col, colIndex) => {
                  const isFirst = stickyFirstColumn && colIndex === 0;
                  return (
                  <TableCell
                    key={col.key}
                    sx={{
                      minWidth: col.minWidth,
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                      bgcolor: 'background.paper',
                      py: 0.5,
                      ...(isFirst ? { position: 'sticky', left: 0, zIndex: 3 } : {}),
                    }}
                  >
                    <TableSortLabel
                      active={sortBy === col.key}
                      direction={sortBy === col.key ? sortOrder : 'asc'}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
                  </TableCell>
                </TableRow>
              ) : pagedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">No results match your search</Typography>
                  </TableCell>
                </TableRow>
              ) : pagedRows.map((row, i) => (
                <TableRow
                  key={i}
                  hover
                  sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                >
                  {columns.map((col, colIndex) => {
                    const isFirst = stickyFirstColumn && colIndex === 0;
                    const rawValue = row[col.key];
                    const displayValue = rawValue != null ? String(rawValue) : '\u2014';
                    const cellContent = col.render ? col.render(row) : displayValue;
                    return (
                    <TableCell
                      key={col.key}
                      sx={{
                        py: 0.375,
                        px: 1,
                        fontSize: '0.75rem',
                        lineHeight: 1.35,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: col.minWidth ? `${col.minWidth}px` : undefined,
                        ...(isFirst ? { position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' } : {}),
                      }}
                    >
                      {col.render ? (
                        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cellContent}</Box>
                      ) : (
                        <Tooltip title={rawValue != null ? String(rawValue) : ''} enterDelay={500}>
                          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cellContent}</Box>
                        </Tooltip>
                      )}
                    </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={sortedRows.length}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handlePageSizeChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      </Paper>
    </Box>
  );
}
