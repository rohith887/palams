const pool = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const qaWorkspaceService = {
  async getWorkspace(binId) {
    if (!binId) throw new AppError(400, 'VALIDATION_ERROR', 'Bin ID is required');

    logger.debug('QA Workspace service: fetching workspace data', { binId });

    const [rows] = await pool.query(`
      SELECT
        b.Bin_ID, b.Bin_Number, b.Current_Status, b.Consecutive_Fail_Count,
        b.Requires_QA_Attention, b.Row_Version, b.Overdue_Unloading,
        bay.Bay_ID, bay.Bay_Code, bay.Bay_Name,
        tank.Tank_ID, tank.Tank_Code, tank.Tank_Name,
        lr.Material_ID, mm.Material_Name, mm.Material_Code,
        mm.Material_Category, mm.Hazard_Level,
        lr.Batch_Number, lr.Quantity_Loaded, lr.Unit_Of_Measure,
        cr.Cleaning_ID, cr.Cleaning_Method, cr.Cleaning_Agent,
        cr.Cleaning_Start_At, cr.Cleaning_Completed_At,
        cr.Water_Temp_Celsius, cr.Rinse_Cycles,
        cleaner.User_ID AS Cleaner_User_ID,
        cleaner.Full_Name AS Cleaner_Name
      FROM Bin_Master b
      LEFT JOIN Bay_Master bay ON bay.Bay_ID = b.Current_Bay_ID
      LEFT JOIN Tank_Master tank ON tank.Tank_ID = b.Current_Tank_ID
      LEFT JOIN Loading_Record lr ON lr.Bin_ID = b.Bin_ID AND lr.Is_Current = 1
      LEFT JOIN Material_Master mm ON mm.Material_ID = lr.Material_ID
      LEFT JOIN Cleaning_Record cr ON cr.Bin_ID = b.Bin_ID AND cr.Cleaning_ID = (
        SELECT MAX(cr2.Cleaning_ID) FROM Cleaning_Record cr2 WHERE cr2.Bin_ID = b.Bin_ID
      )
      LEFT JOIN User_Master cleaner ON cleaner.User_ID = cr.Cleaner_User_ID
      WHERE b.Bin_ID = ?
    `, [binId]);

    if (rows.length === 0) throw new AppError(404, 'BIN_NOT_FOUND', `Bin with ID ${binId} not found`);

    const row = rows[0];

    const [qaRows] = await pool.query(`
      SELECT QA_ID, QA_Inspector_User_ID, QA_Start_At, QA_Completed_At,
        Overall_Result, Is_Reinspection, Failure_Reason
      FROM QA_Record
      WHERE Bin_ID = ? AND QA_Completed_At IS NOT NULL
      ORDER BY QA_Completed_At DESC
      LIMIT 5
    `, [binId]);

    const allowedStatuses = ['Awaiting_QA', 'Awaiting_Reinspection', 'QA_In_Progress'];
    const canStartQA = allowedStatuses.includes(row.Current_Status);
    const isReinspection = row.Current_Status === 'Awaiting_Reinspection';
    const isInProgress = row.Current_Status === 'QA_In_Progress';

    return {
      bin: {
        binId: row.Bin_ID,
        binNumber: row.Bin_Number,
        currentStatus: row.Current_Status,
        consecutiveFailCount: row.Consecutive_Fail_Count,
        requiresQaAttention: row.Requires_QA_Attention === 1,
        overdueUnloading: row.Overdue_Unloading === 1,
        rowVersion: row.Row_Version,
      },
      location: {
        bayId: row.Bay_ID,
        bayCode: row.Bay_Code,
        bayName: row.Bay_Name,
        tankId: row.Tank_ID,
        tankCode: row.Tank_Code,
        tankName: row.Tank_Name,
      },
      material: {
        materialId: row.Material_ID,
        materialName: row.Material_Name,
        materialCode: row.Material_Code,
        category: row.Material_Category,
        hazardLevel: row.Hazard_Level,
        batchNumber: row.Batch_Number,
        quantityLoaded: row.Quantity_Loaded,
        unitOfMeasure: row.Unit_Of_Measure,
      },
      cleaning: {
        cleaningId: row.Cleaning_ID,
        method: row.Cleaning_Method,
        agent: row.Cleaning_Agent,
        waterTemp: row.Water_Temp_Celsius,
        rinseCycles: row.Rinse_Cycles,
        startedAt: row.Cleaning_Start_At,
        completedAt: row.Cleaning_Completed_At,
        cleanerName: row.Cleaner_Name,
        cleanerUserId: row.Cleaner_User_ID,
      },
      workflow: {
        canStartQA,
        isReinspection,
        isInProgress,
      },
      previousInspections: qaRows,
    };
  },
};

module.exports = qaWorkspaceService;
