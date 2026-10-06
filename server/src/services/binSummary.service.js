const spExecute = require('../utils/spExecute');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const VALID_SORT_COLUMNS = [
  'Bin_Number', 'Bin_Type', 'Current_Status', 'Current_Bay', 'Current_Tank',
  'Material_Name', 'Batch_Number', 'Loaded_By', 'Unloaded_By', 'Cleaned_By',
  'QA_Inspector', 'QA_Result', 'Last_Updated', 'QR_Code_Value', 'Quantity_Loaded',
  'Loading_Start_At', 'Loading_Completed_At', 'Unloading_Start_At', 'Unloading_Completed_At',
  'Cleaning_Start_At', 'Cleaning_Completed_At', 'QA_Start_At', 'QA_Completed_At', 'Cycle_Count',
];

function toInt(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeKpiRow(row) {
  if (!row) return null;
  return {
    total_bins: toInt(row.total_bins, 0),
    available: toInt(row.available, 0),
    loading: toInt(row.loading, 0),
    awaiting_unloading: toInt(row.awaiting_unloading, 0),
    unloading: toInt(row.unloading, 0),
    awaiting_cleaning: toInt(row.awaiting_cleaning, 0),
    cleaning: toInt(row.cleaning, 0),
    awaiting_qa: toInt(row.awaiting_qa, 0),
    qa_in_progress: toInt(row.qa_in_progress, 0),
    qa_failed: toInt(row.qa_failed, 0),
    completed_today: toInt(row.completed_today, 0),
    rejected_today: toInt(row.rejected_today, 0),
  };
}

const binSummaryService = {
  async getSummary({
    search, status, bayId, tankId, materialId,
    fromDate, toDate, page = 1, pageSize = 25,
    sortColumn, sortOrder,
  }) {
    if (pageSize && ![10, 25, 50, 100, 500].includes(pageSize)) pageSize = 25;
    if (!page || page < 1) page = 1;

    // Only pass allowed sort columns
    const safeSortColumn = sortColumn && VALID_SORT_COLUMNS.includes(sortColumn) ? sortColumn : null;
    const safeSortOrder = sortOrder && ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder : null;

    const spResult = await spExecute('sp_get_bin_summary', [
      search || null,
      status || null,
      bayId || null,
      tankId || null,
      materialId || null,
      fromDate || null,
      toDate || null,
      page,
      pageSize,
      safeSortColumn,
      safeSortOrder,
    ]);

    if (!spResult.success) {
      throw new AppError(400, spResult.errorCode, spResult.errorMessage);
    }

    // sp_get_bin_summary returns 4 result sets:
    //   [0] KPI row (array with 1 element)
    //   [1] Data rows (array of row objects)
    //   [2] Pagination info (array with 1 element)
    // The extra result set is from COUNT INTO in prepared statement (OkPacket, filtered out by spExecute)
    const dataSets = spResult.data || [];

    // Find KPI result set: row with total_bins field
    const kpiRow = dataSets.find(rs => Array.isArray(rs) && rs.length > 0 && rs[0].total_bins !== undefined);
    const summary = normalizeKpiRow(kpiRow ? kpiRow[0] : null);

    // Find data result set: array with row objects that have Bin_Number
    const dataRows = dataSets.find(rs => Array.isArray(rs) && rs.length > 0 && rs[0].Bin_Number !== undefined) || [];

    // Find pagination result set: array with total_count field
    const paginationRow = dataSets.find(rs => Array.isArray(rs) && rs.length > 0 && rs[0].total_count !== undefined && rs[0].total_bins === undefined);
    const pagination = paginationRow && paginationRow[0] ? {
      totalCount: toInt(paginationRow[0].total_count, dataRows.length),
      currentPage: toInt(paginationRow[0].current_page, page),
      pageSize: toInt(paginationRow[0].page_size, pageSize),
    } : { totalCount: dataRows.length, currentPage: page, pageSize };

    logger.debug('Bin summary service: result', {
      rowCount: dataRows.length, totalCount: pagination.totalCount, summary,
    });

    return { summary, rows: dataRows, pagination };
  },
};

module.exports = binSummaryService;
