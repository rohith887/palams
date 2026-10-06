const pool = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const qaDashboardService = {
  async getDashboard(userId) {
    if (!userId) throw new AppError(400, 'VALIDATION_ERROR', 'User ID is required');

    logger.debug('QA Dashboard service: fetching dashboard data', { userId });

    const [metricsRows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM Bin_Master WHERE Current_Status='Awaiting_QA' AND Is_Active=1) AS awaiting_qa,
        (SELECT COUNT(*) FROM Bin_Master WHERE Current_Status='QA_In_Progress' AND Is_Active=1) AS qa_in_progress,
        (SELECT COUNT(*) FROM QA_Record WHERE DATE(QA_Completed_At)=CURDATE()) AS completed_today,
        (SELECT COUNT(*) FROM QA_Record WHERE DATE(QA_Completed_At)=CURDATE() AND Overall_Result='FAIL') AS today_failures,
        (SELECT COUNT(*) FROM Bin_Master WHERE Current_Status='Awaiting_Reinspection' AND Is_Active=1) AS awaiting_reinspection
    `);
    const metrics = metricsRows[0];

    const [queueRows] = await pool.query(`
      SELECT
        b.Bin_ID, b.Bin_Number, b.Current_Status,
        bay.Bay_ID, bay.Bay_Code,
        lr.Material_ID, mm.Material_Name, lr.Batch_Number,
        cr.Cleaning_ID, cr.Cleaning_Completed_At,
        lr.Quantity_Loaded, lr.Unit_Of_Measure
      FROM Bin_Master b
      LEFT JOIN Bay_Master bay ON bay.Bay_ID = b.Current_Bay_ID
      LEFT JOIN Loading_Record lr ON lr.Bin_ID = b.Bin_ID AND lr.Is_Current = 1
      LEFT JOIN Material_Master mm ON mm.Material_ID = lr.Material_ID
      LEFT JOIN Cleaning_Record cr ON cr.Bin_ID = b.Bin_ID AND cr.Cleaning_ID = (
        SELECT MAX(cr2.Cleaning_ID) FROM Cleaning_Record cr2 WHERE cr2.Bin_ID = b.Bin_ID
      )
      WHERE b.Current_Status IN ('Awaiting_QA', 'Awaiting_Reinspection') AND b.Is_Active = 1
      ORDER BY
        CASE b.Current_Status
          WHEN 'Awaiting_Reinspection' THEN 1
          WHEN 'Awaiting_QA' THEN 2
        END,
        cr.Cleaning_Completed_At ASC
    `);

    const [recentRows] = await pool.query(`
      SELECT
        qa.QA_ID, qa.Overall_Result, qa.Is_Reinspection,
        qa.QA_Start_At, qa.QA_Completed_At,
        b.Bin_Number,
        TIMESTAMPDIFF(MINUTE, qa.QA_Start_At, qa.QA_Completed_At) AS duration_minutes
      FROM QA_Record qa
      JOIN Bin_Master b ON b.Bin_ID = qa.Bin_ID
      WHERE qa.QA_Inspector_User_ID = ? AND qa.QA_Completed_At IS NOT NULL
      ORDER BY qa.QA_Completed_At DESC
      LIMIT 10
    `, [userId]);

    return { metrics, queue: queueRows, recentActivity: recentRows };
  },
};

module.exports = qaDashboardService;
