const spExecute = require('../utils/spExecute');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const pool = require('../config/database');

const VALID_TYPES = ['loading','unloading','cleaning','qa','rejected-bin','bin-lifecycle','user-activity','audit-trail','bin-summary'];

const reportService = {
  async generateReport({
    reportType, fromDate, toDate, binNumber, operatorId, bayId, materialId,
    page = 1, pageSize = 25, status, tankId, search, sortColumn, sortOrder,
  }) {
    if (!reportType || !VALID_TYPES.includes(reportType)) {
      throw new AppError(400, 'VALIDATION_ERROR', `Invalid report type. Must be one of: ${VALID_TYPES.join(', ')}`);
    }
    if (pageSize && ![25,50,100,500].includes(pageSize)) pageSize = 25;
    if (!page || page < 1) page = 1;

    const spResult = await spExecute('sp_generate_report', [
      reportType, fromDate || null, toDate || null,
      binNumber || null, operatorId || null, bayId || null, materialId || null,
      page, pageSize,
      status || null, tankId || null, search || null, sortColumn || null, sortOrder || null,
    ]);

    if (!spResult.success) throw new AppError(400, spResult.errorCode, spResult.errorMessage);

    const dataRows = spResult.data?.[0] || [];
    const totalCount = dataRows.length > 0 ? (dataRows[0].total_count || dataRows.length) : 0;

    return { rows: dataRows, totalCount, page, pageSize };
  },

  async getExceptions() {
    const result = [];

    const [qaFailures] = await pool.query(`
      SELECT qr.QA_ID, qr.Bin_ID, b.Bin_Number, qr.QA_Inspector_User_ID,
             u.Full_Name AS Inspector_Name, qr.QA_Completed_At, qr.Overall_Result, qr.Failure_Reason
      FROM QA_Record qr
      JOIN Bin_Master b ON b.Bin_ID = qr.Bin_ID
      LEFT JOIN User_Master u ON u.User_ID = qr.QA_Inspector_User_ID
      WHERE qr.Overall_Result = 'FAIL'
      ORDER BY qr.QA_Completed_At DESC
      LIMIT 100
    `);
    for (const row of qaFailures) {
      result.push({
        Exception_Type: 'QA Failure',
        Bin_Number: row.Bin_Number,
        Details: row.Failure_Reason || 'No reason provided',
        Timestamp: row.QA_Completed_At,
        Status: 'Open',
        Assigned_To: row.Inspector_Name || 'Unassigned',
      });
    }

    const [reinspections] = await pool.query(`
      SELECT b.Bin_Number, cr.Cleaning_ID, cr.Cleaning_Start_At, cr.Cleaner_User_ID,
             u.Full_Name AS Cleaner_Name
      FROM Cleaning_Record cr
      JOIN Bin_Master b ON b.Bin_ID = cr.Bin_ID
      LEFT JOIN User_Master u ON u.User_ID = cr.Cleaner_User_ID
      WHERE cr.Cleaning_Completed_At IS NULL
      ORDER BY cr.Cleaning_Start_At DESC
      LIMIT 50
    `);
    for (const row of reinspections) {
      result.push({
        Exception_Type: 'Reinspection',
        Bin_Number: row.Bin_Number,
        Details: 'Cleaning in progress',
        Timestamp: row.Cleaning_Start_At,
        Status: 'In Progress',
        Assigned_To: row.Cleaner_Name || 'Unassigned',
      });
    }

    const [overdue] = await pool.query(`
      SELECT b.Bin_Number, lr.Loading_ID, lr.Loading_Start_At, lr.Loader_User_ID,
             u.Full_Name AS Loader_Name
      FROM Loading_Record lr
      JOIN Bin_Master b ON b.Bin_ID = lr.Bin_ID
      LEFT JOIN User_Master u ON u.User_ID = lr.Loader_User_ID
      WHERE lr.Loading_Completed_At IS NULL AND lr.Loading_Start_At < DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY lr.Loading_Start_At ASC
      LIMIT 50
    `);
    for (const row of overdue) {
      result.push({
        Exception_Type: 'Overdue Operation',
        Bin_Number: row.Bin_Number,
        Details: 'Loading exceeded 24 hours',
        Timestamp: row.Loading_Start_At,
        Status: 'Overdue',
        Assigned_To: row.Loader_Name || 'Unassigned',
      });
    }

    const [unloadingOverdue] = await pool.query(`
      SELECT b.Bin_Number, ur.Unloading_ID, ur.Unloading_Start_At, ur.Unloader_User_ID,
             u.Full_Name AS Unloader_Name
      FROM Unloading_Record ur
      JOIN Bin_Master b ON b.Bin_ID = ur.Bin_ID
      LEFT JOIN User_Master u ON u.User_ID = ur.Unloader_User_ID
      WHERE ur.Unloading_Completed_At IS NULL AND ur.Unloading_Start_At < DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY ur.Unloading_Start_At ASC
      LIMIT 50
    `);
    for (const row of unloadingOverdue) {
      result.push({
        Exception_Type: 'Overdue Operation',
        Bin_Number: row.Bin_Number,
        Details: 'Unloading exceeded 24 hours',
        Timestamp: row.Unloading_Start_At,
        Status: 'Overdue',
        Assigned_To: row.Unloader_Name || 'Unassigned',
      });
    }

    const [lockConflicts] = await pool.query(`
      SELECT l.Lock_ID, l.Bin_ID, b.Bin_Number, l.Locked_By_User_ID,
             u.Full_Name AS Locked_By_Name, l.Lock_Timestamp, l.Operation_Type
      FROM Lock_Table l
      JOIN Bin_Master b ON b.Bin_ID = l.Bin_ID
      LEFT JOIN User_Master u ON u.User_ID = l.Locked_By_User_ID
      ORDER BY l.Lock_Timestamp DESC
      LIMIT 50
    `);
    for (const row of lockConflicts) {
      result.push({
        Exception_Type: 'Lock Conflict',
        Bin_Number: row.Bin_Number,
        Details: `Locked by ${row.Locked_By_Name || 'Unknown'} (${row.Operation_Type || 'N/A'})`,
        Timestamp: row.Lock_Timestamp,
        Status: 'Active',
        Assigned_To: row.Locked_By_Name || 'Unknown',
      });
    }

    result.sort((a, b) => {
      const ta = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
      const tb = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
      return tb - ta;
    });

    return { rows: result, totalCount: result.length };
  },
};

module.exports = reportService;