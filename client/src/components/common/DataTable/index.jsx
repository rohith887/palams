import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, TableSortLabel, Tooltip,
} from '@mui/material';

export default function DataTable({
  columns, rows, keyField = 'id', loading,
  page, pageSize, totalCount, onPageChange, onPageSizeChange,
  sortBy, sortOrder, onSort,
  size = 'small', sx, emptyMessage = 'No records found', onRowClick,
  stickyFirstColumn = false,
}) {
  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto', maxWidth: '100%', ...sx }}>
      <Table size={size} stickyHeader sx={{ minWidth: columns.reduce((sum, c) => sum + (c.minWidth || 80), 0) }}>
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
                  ...(col.sx || {}),
                }}
              >
                {col.sortable ? (
                  <TableSortLabel
                    active={sortBy === col.sortKey || sortBy === col.key}
                    direction={sortBy === (col.sortKey || col.key) ? sortOrder : 'asc'}
                    onClick={() => onSort && onSort(col.sortKey || col.key)}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : col.label}
              </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4, fontSize: '0.8rem', color: 'text.secondary' }}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : rows.map((row, idx) => (
            <TableRow
              key={typeof keyField === 'function' ? keyField(row, idx) : row[keyField] ?? idx}
              hover
              onClick={() => onRowClick && onRowClick(row)}
              sx={{ cursor: onRowClick ? 'pointer' : 'default', '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
            >
              {columns.map((col, colIndex) => {
                const isFirst = stickyFirstColumn && colIndex === 0;
                const rawValue = row[col.key];
                const cellContent = col.render ? col.render(row) : (rawValue != null ? String(rawValue) : '\u2014');
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
                    ...(col.cellSx || {}),
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
      {totalCount !== undefined && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page ?? 0}
          onPageChange={(e, p) => onPageChange && onPageChange(e, p)}
          rowsPerPage={pageSize ?? 25}
          onRowsPerPageChange={(e) => onPageSizeChange && onPageSizeChange(e)}
          rowsPerPageOptions={[25, 50, 100]}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      )}
    </TableContainer>
  );
}
