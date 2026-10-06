const spExecute = require('../utils/spExecute');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const pool = require('../config/database');

const auditService = {
  async getAuditHistory({ entityType, binId, userId, actionType, fromDate, toDate, page = 1, pageSize = 25 }) {
    if (!entityType || !['bin_history', 'audit_log'].includes(entityType)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'entityType must be bin_history or audit_log');
    }
    if (pageSize && ![25, 50, 100].includes(pageSize)) pageSize = 25;
    if (!page || page < 1) page = 1;

    logger.debug('Audit service: fetching history', { entityType, page, pageSize });

    const spResult = await spExecute('sp_get_audit_history', [
      entityType, binId || null, userId || null, actionType || null,
      fromDate || null, toDate || null, page, pageSize,
    ]);

    if (!spResult.success) throw new AppError(400, spResult.errorCode, spResult.errorMessage);

    const dataRows = spResult.data?.[0] || [];
    const totalCount = dataRows.length > 0 ? (dataRows[0].total_count || dataRows.length) : 0;

    return { rows: dataRows, totalCount, page, pageSize };
  },

  async getAuditLog({ actorId, actionType, targetEntity, targetId, fromDate, toDate, page = 1, pageSize = 25 }) {
    if (pageSize && ![25, 50, 100].includes(pageSize)) pageSize = 25;
    if (!page || page < 1) page = 1;

    const offset = (page - 1) * pageSize;
    const params = [];
    const where = [];

    if (actorId) { where.push('a.Actor_User_ID = ?'); params.push(actorId); }
    if (actionType) { where.push('a.Action_Type = ?'); params.push(actionType); }
    if (targetEntity) { where.push('a.Target_Entity LIKE ?'); params.push(`%${targetEntity}%`); }
    if (targetId) { where.push('a.Target_ID = ?'); params.push(parseInt(targetId, 10)); }
    if (fromDate) { where.push('a.Event_Timestamp >= ?'); params.push(fromDate); }
    if (toDate) { where.push('a.Event_Timestamp <= ?'); params.push(toDate); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countSql = `SELECT COUNT(*) AS cnt FROM Audit_Log a ${whereClause}`;
    const [countRows] = await pool.query(countSql, params);
    const totalCount = countRows[0]?.cnt || 0;

    const dataSql = `
      SELECT a.Audit_ID, a.Event_Timestamp AS Timestamp, a.Action_Type, a.Target_Entity, a.Target_ID,
             a.Old_Value, a.New_Value, a.IP_Address, a.User_Agent, a.Actor_User_ID,
             u.Full_Name AS Actor_Full_Name
      FROM Audit_Log a
      LEFT JOIN User_Master u ON u.User_ID = a.Actor_User_ID
      ${whereClause}
      ORDER BY a.Event_Timestamp DESC
      LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    const [rows] = await pool.query(dataSql, params);
    return { rows, totalCount, page, pageSize };
  },

  /**
   * Get the operational lifecycle timeline for a bin.
   * Built from operational records (Loading, Unloading, Cleaning, QA) —
   * NOT from Audit_Log or Bin_History.
   */
  async getBinLifecycleTimeline(binNumber) {
    if (!binNumber) throw new AppError(400, 'VALIDATION_ERROR', 'Bin number is required');

    // 1. Look up the bin
    let binRows;
    try {
      [binRows] = await pool.query(
        `SELECT b.Bin_ID, b.Bin_Number, b.QR_Code_Value AS Bin_Code, b.Current_Status, b.Is_Active,
                b.Capacity, b.Capacity_Unit,
                bt.Type_Name AS Bin_Type_Name, bc.Category_Name AS Bin_Category_Name,
                bay.Bay_Name AS Current_Bay, tank.Tank_Name AS Current_Tank,
                b.Created_At, b.Updated_At AS Last_Updated, b.QR_Code_Value AS QR_Image
         FROM Bin_Master b
         LEFT JOIN Bin_Type_Master bt ON bt.Bin_Type_ID = b.Bin_Type_ID
         LEFT JOIN Bin_Category_Master bc ON bc.Bin_Category_ID = b.Bin_Category_ID
         LEFT JOIN Bay_Master bay ON bay.Bay_ID = b.Current_Bay_ID
         LEFT JOIN Tank_Master tank ON tank.Tank_ID = b.Current_Tank_ID
         WHERE b.Bin_Number = ?`, [binNumber],
      );
    } catch (err) {
      console.error('=== FAILED QUERY: Bin_Master lookup ===');
      console.error('binNumber param:', binNumber);
      console.error('errno:', err.errno, 'sqlState:', err.sqlState, 'code:', err.code);
      console.error('message:', err.message);
      console.error('stack:', err.stack);
      throw err;
    }
    if (binRows.length === 0) throw new AppError(404, 'BIN_NOT_FOUND', `Bin "${binNumber}" not found`);

    const bin = binRows[0];

    // 2. Fetch all operational records for this bin
    let loadingRows;
    try {
      [loadingRows] = await pool.query(
        `SELECT l.Loading_ID, l.Bin_ID, l.Material_ID, m.Material_Name, l.Batch_Number,
                l.Quantity_Loaded, l.Unit_Of_Measure, l.Loading_Start_At, l.Loading_Completed_At,
                l.Loader_User_ID, lu.Full_Name AS Loader_Name,
                bay.Bay_Name AS Bay_Name, tank.Tank_Name AS Tank_Name,
                l.Comments AS Loading_Remarks
         FROM Loading_Record l
         LEFT JOIN Material_Master m ON m.Material_ID = l.Material_ID
         LEFT JOIN User_Master lu ON lu.User_ID = l.Loader_User_ID
         LEFT JOIN Bay_Master bay ON bay.Bay_ID = l.Bay_ID
         LEFT JOIN Tank_Master tank ON tank.Tank_ID = l.Tank_ID
         WHERE l.Bin_ID = ?
         ORDER BY l.Loading_ID`, [bin.Bin_ID],
      );
    } catch (err) {
      console.error('=== FAILED QUERY: Loading_Record ===');
      console.error('bin.Bin_ID:', bin.Bin_ID);
      console.error('errno:', err.errno, 'sqlState:', err.sqlState, 'code:', err.code);
      console.error('message:', err.message);
      console.error('stack:', err.stack);
      throw err;
    }

    const loadingIds = loadingRows.map(r => r.Loading_ID);

    let unloadingRows;
    try {
      [unloadingRows] = await pool.query(
        `SELECT ur.Unloading_ID, ur.Loading_ID, ur.Unloading_Start_At, ur.Unloading_Completed_At,
                ur.Unloader_User_ID, uu.Full_Name AS Unloader_Name,
                ur.Quantity_Unloaded, ur.Unloading_Condition, ur.Comments AS Unloading_Remarks
         FROM Unloading_Record ur
         LEFT JOIN User_Master uu ON uu.User_ID = ur.Unloader_User_ID
         WHERE ur.Bin_ID = ?
         ORDER BY ur.Unloading_ID`, [bin.Bin_ID],
      );
    } catch (err) {
      console.error('=== FAILED QUERY: Unloading_Record ===');
      console.error('bin.Bin_ID:', bin.Bin_ID);
      console.error('errno:', err.errno, 'sqlState:', err.sqlState, 'code:', err.code);
      console.error('message:', err.message);
      console.error('stack:', err.stack);
      throw err;
    }

    let cleaningRows;
    try {
      [cleaningRows] = await pool.query(
        `SELECT cr.Cleaning_ID, cr.Loading_ID, cr.Cleaning_Start_At, cr.Cleaning_Completed_At,
                cr.Cleaner_User_ID, cu.Full_Name AS Cleaner_Name,
                cr.Cleaning_Method, cr.Cleaning_Agent,
                cr.Water_Temp_Celsius, cr.Rinse_Cycles, cr.Comments AS Cleaning_Remarks
         FROM Cleaning_Record cr
         LEFT JOIN User_Master cu ON cu.User_ID = cr.Cleaner_User_ID
         WHERE cr.Bin_ID = ?
         ORDER BY cr.Cleaning_ID`, [bin.Bin_ID],
      );
    } catch (err) {
      console.error('=== FAILED QUERY: Cleaning_Record ===');
      console.error('bin.Bin_ID:', bin.Bin_ID);
      console.error('errno:', err.errno, 'sqlState:', err.sqlState, 'code:', err.code);
      console.error('message:', err.message);
      console.error('stack:', err.stack);
      throw err;
    }

    let qaRows;
    try {
      [qaRows] = await pool.query(
        `SELECT qr.QA_ID, qr.Cleaning_ID, qr.QA_Start_At, qr.QA_Completed_At,
                qr.QA_Inspector_User_ID, qu.Full_Name AS QA_Inspector_Name,
                qr.Overall_Result, qr.Failure_Reason, NULL AS QA_Remarks,
                qr.Visual_Inspection AS Visual_Check, qr.Residue_Check, qr.Damage_Assessment AS Damage_Check,
                qr.Odor_Check, qr.Label_Integrity AS Label_Check, qr.Seal_Integrity AS Seal_Check
         FROM QA_Record qr
         LEFT JOIN User_Master qu ON qu.User_ID = qr.QA_Inspector_User_ID
         WHERE qr.Bin_ID = ?
         ORDER BY qr.QA_ID`, [bin.Bin_ID],
      );
    } catch (err) {
      console.error('=== FAILED QUERY: QA_Record ===');
      console.error('bin.Bin_ID:', bin.Bin_ID);
      console.error('errno:', err.errno, 'sqlState:', err.sqlState, 'code:', err.code);
      console.error('message:', err.message);
      console.error('stack:', err.stack);
      throw err;
    }

    // 3. Build loadingId → { bay, tank } lookup for downstream operations
    const loadingLocationMap = {};
    for (const l of loadingRows) {
      loadingLocationMap[l.Loading_ID] = {
        bay: l.Bay_Name || null,
        tank: l.Tank_Name || null,
      };
    }

    // Build cleaningId → loadingId lookup for QA events
    // (QA_Record has Cleaning_ID, not Loading_ID; chain through Cleaning_Record)
    const cleaningToLoadingId = {};
    for (const c of cleaningRows) {
      cleaningToLoadingId[c.Cleaning_ID] = c.Loading_ID;
    }

    // 4. Build a unified chronological timeline
    const timeline = [];

    // Bin created event
    if (bin.Created_At) {
      timeline.push({
        phase: 'Registered',
        type: 'created',
        timestamp: bin.Created_At,
        title: 'Bin Registered',
        description: `Bin ${bin.Bin_Number} created in the system`,
        icon: 'inventory',
        details: {
          type: bin.Bin_Type_Name,
          category: bin.Bin_Category_Name,
          capacity: bin.Capacity ? `${bin.Capacity} ${bin.Capacity_Unit || ''}` : null,
        },
      });
    }

    // Loading events
    for (const l of loadingRows) {
      const cycleLabel = `(Cycle ${l.Loading_ID})`;

      timeline.push({
        phase: 'Loading',
        type: 'loading_start',
        timestamp: l.Loading_Start_At,
        title: 'Loading Started',
        description: `Material loading began ${cycleLabel}`,
        icon: 'download',
        operator: l.Loader_Name,
        operatorRole: 'Loader',
        details: {
          material: l.Material_Name,
          batch: l.Batch_Number,
          quantity: l.Quantity_Loaded ? `${l.Quantity_Loaded} ${l.Unit_Of_Measure || ''}` : null,
          bay: l.Bay_Name,
          tank: l.Tank_Name,
          recordId: l.Loading_ID,
        },
      });

      if (l.Loading_Completed_At) {
        const duration = computeDuration(l.Loading_Start_At, l.Loading_Completed_At);
        timeline.push({
          phase: 'Loading',
          type: 'loading_complete',
          timestamp: l.Loading_Completed_At,
          title: 'Loading Completed',
          description: `Loading finished in ${duration}`,
          icon: 'check_circle',
          operator: l.Loader_Name,
          operatorRole: 'Loader',
          startTime: l.Loading_Start_At,
          endTime: l.Loading_Completed_At,
          duration,
          details: {
            material: l.Material_Name,
            batch: l.Batch_Number,
            quantity: l.Quantity_Loaded ? `${l.Quantity_Loaded} ${l.Unit_Of_Measure || ''}` : null,
            bay: l.Bay_Name,
            tank: l.Tank_Name,
            remarks: l.Loading_Remarks,
            recordId: l.Loading_ID,
          },
        });
      }
    }

    // Unloading events (resolve bay/tank from parent Loading_Record)
    for (const u of unloadingRows) {
      const loc = loadingLocationMap[u.Loading_ID] || {};
      timeline.push({
        phase: 'Unloading',
        type: 'unloading_start',
        timestamp: u.Unloading_Start_At,
        title: 'Unloading Started',
        description: 'Material unloading began',
        icon: 'upload',
        operator: u.Unloader_Name,
        operatorRole: 'Unloader',
        details: {
          bay: loc.bay,
          tank: loc.tank,
          condition: u.Unloading_Condition,
          recordId: u.Unloading_ID,
        },
      });

      if (u.Unloading_Completed_At) {
        const duration = computeDuration(u.Unloading_Start_At, u.Unloading_Completed_At);
        timeline.push({
          phase: 'Unloading',
          type: 'unloading_complete',
          timestamp: u.Unloading_Completed_At,
          title: 'Unloading Completed',
          description: `Unloading finished in ${duration}`,
          icon: 'check_circle',
          operator: u.Unloader_Name,
          operatorRole: 'Unloader',
          startTime: u.Unloading_Start_At,
          endTime: u.Unloading_Completed_At,
          duration,
          details: {
            bay: loc.bay,
            tank: loc.tank,
            condition: u.Unloading_Condition,
            quantity: u.Quantity_Unloaded,
            remarks: u.Unloading_Remarks,
            recordId: u.Unloading_ID,
          },
        });
      }
    }

    // Cleaning events (resolve bay/tank from parent Loading_Record)
    for (const c of cleaningRows) {
      const loc = loadingLocationMap[c.Loading_ID] || {};
      timeline.push({
        phase: 'Cleaning',
        type: 'cleaning_start',
        timestamp: c.Cleaning_Start_At,
        title: 'Cleaning Started',
        description: 'Bin cleaning began',
        icon: 'cleaning_services',
        operator: c.Cleaner_Name,
        operatorRole: 'Cleaner',
        details: {
          bay: loc.bay,
          tank: loc.tank,
          method: c.Cleaning_Method,
          agent: c.Cleaning_Agent,
          recordId: c.Cleaning_ID,
        },
      });

      if (c.Cleaning_Completed_At) {
        const duration = computeDuration(c.Cleaning_Start_At, c.Cleaning_Completed_At);
        timeline.push({
          phase: 'Cleaning',
          type: 'cleaning_complete',
          timestamp: c.Cleaning_Completed_At,
          title: 'Cleaning Completed',
          description: `Cleaning finished in ${duration}`,
          icon: 'check_circle',
          operator: c.Cleaner_Name,
          operatorRole: 'Cleaner',
          startTime: c.Cleaning_Start_At,
          endTime: c.Cleaning_Completed_At,
          duration,
          details: {
            bay: loc.bay,
            tank: loc.tank,
            method: c.Cleaning_Method,
            agent: c.Cleaning_Agent,
            waterTemp: c.Water_Temp_Celsius ? `${c.Water_Temp_Celsius}°C` : null,
            rinseCycles: c.Rinse_Cycles,
            remarks: c.Cleaning_Remarks,
            recordId: c.Cleaning_ID,
          },
        });
      }
    }

    // QA events (resolve bay/tank via Cleaning_Record → Loading_Record chain)
    for (const q of qaRows) {
      const loadingId = cleaningToLoadingId[q.Cleaning_ID];
      const loc = loadingLocationMap[loadingId] || {};
      timeline.push({
        phase: 'QA',
        type: 'qa_start',
        timestamp: q.QA_Start_At,
        title: 'QA Inspection Started',
        description: 'Quality inspection began',
        icon: 'science',
        operator: q.QA_Inspector_Name,
        operatorRole: 'QA Inspector',
        details: {
          bay: loc.bay,
          tank: loc.tank,
          recordId: q.QA_ID,
        },
      });

      if (q.QA_Completed_At) {
        const duration = computeDuration(q.QA_Start_At, q.QA_Completed_At);
        const passed = q.Overall_Result === 'PASS';
        timeline.push({
          phase: 'QA',
          type: passed ? 'qa_pass' : 'qa_fail',
          timestamp: q.QA_Completed_At,
          title: passed ? 'QA Passed' : 'QA Failed',
          description: passed ? `Inspection passed in ${duration}` : `Inspection failed — ${q.Failure_Reason || 'No reason provided'}`,
          icon: passed ? 'verified' : 'cancel',
          operator: q.QA_Inspector_Name,
          operatorRole: 'QA Inspector',
          startTime: q.QA_Start_At,
          endTime: q.QA_Completed_At,
          duration,
          severity: passed ? 'success' : 'error',
          details: {
            bay: loc.bay,
            tank: loc.tank,
            result: q.Overall_Result,
            failureReason: q.Failure_Reason,
            remarks: q.QA_Remarks,
            checks: {
              visual: q.Visual_Check,
              residue: q.Residue_Check,
              damage: q.Damage_Check,
              odor: q.Odor_Check,
              label: q.Label_Check,
              seal: q.Seal_Check,
            },
            recordId: q.QA_ID,
          },
        });
      }
    }

    // Add cycle summary for each completed QA
    // Cycle count is derived from number of loading records
    if (qaRows.length > 0) {
      const lastQa = qaRows[qaRows.length - 1];
      if (lastQa?.QA_Completed_At) {
        const cycleCount = loadingRows.length || qaRows.length;
        timeline.push({
          phase: 'Complete',
          type: 'cycle_complete',
          timestamp: lastQa.QA_Completed_At,
          title: `Cycle ${cycleCount} Complete`,
          description: 'Bin operational cycle finished — ready for next use',
          icon: 'replay',
          details: {
            cycleNumber: cycleCount,
          },
        });
      }
    }

    // Sort timeline chronologically (ascending)
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return {
      bin: {
        ...bin,
        Bin_Type_Name: bin.Bin_Type_Name,
        Bin_Category_Name: bin.Bin_Category_Name,
      },
      timeline,
      stats: {
        totalOperations: timeline.length,
        loadingCount: loadingRows.length,
        unloadingCount: unloadingRows.length,
        cleaningCount: cleaningRows.length,
        qaCount: qaRows.length,
        cycleCount: loadingRows.length,
        lastUpdated: bin.Last_Updated,
      },
    };
  },

  /** Legacy: get Bin_History status changes (kept for backward compat) */
  async getBinHistoryByNumber(binNumber) {
    if (!binNumber) throw new AppError(400, 'VALIDATION_ERROR', 'Bin number is required');

    const [binRows] = await pool.query(
      `SELECT b.Bin_ID, b.Bin_Number, b.Current_Status, b.Is_Active,
              bt.Type_Name AS Bin_Type_Name
       FROM Bin_Master b
       LEFT JOIN Bin_Type_Master bt ON bt.Bin_Type_ID = b.Bin_Type_ID
       WHERE b.Bin_Number = ?`, [binNumber],
    );
    if (binRows.length === 0) throw new AppError(404, 'BIN_NOT_FOUND', `Bin "${binNumber}" not found`);

    const bin = binRows[0];

    const [historyRows] = await pool.query(
      `SELECT h.History_ID, h.Event_Timestamp, h.Previous_Status, h.New_Status,
              h.Operation_Type, h.Operation_Record_ID, h.Operation_Record_Type,
              h.Remarks, h.Cycle_Number, h.Acting_User_ID,
              u.Full_Name AS Actor_Full_Name
       FROM Bin_History h
       LEFT JOIN User_Master u ON u.User_ID = h.Acting_User_ID
       WHERE h.Bin_ID = ?
       ORDER BY h.Event_Timestamp DESC`, [bin.Bin_ID],
    );

    return { bin, history: historyRows };
  },

  async getDistinctActionTypes() {
    const [rows] = await pool.query(
      'SELECT DISTINCT Action_Type FROM Audit_Log WHERE Action_Type IS NOT NULL ORDER BY Action_Type',
    );
    return rows.map(r => r.Action_Type);
  },

  async getDistinctActors() {
    const [rows] = await pool.query(
      `SELECT DISTINCT u.User_ID, u.Full_Name, u.Username
       FROM User_Master u
       INNER JOIN Audit_Log a ON a.Actor_User_ID = u.User_ID
       WHERE u.Is_Active = 1
       ORDER BY u.Full_Name`,
    );
    return rows;
  },
};

function computeDuration(start, end) {
  if (!start || !end) return null;
  const diff = new Date(end) - new Date(start);
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

module.exports = auditService;