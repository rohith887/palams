const spExecute = require('../utils/spExecute');
const { executeWorkflowStep } = require('./workflow.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const pool = require('../config/database');

/**
 * PBLMS — Loading Service
 *
 * Thin orchestration layer for loading operations.
 * Workflow concerns (transition validation, locking, history, audit)
 * are delegated to the workflow engine.
 *
 * Loading-specific business rules enforced here:
 *   - Tank must belong to the selected Bay
 *   - Quantity loaded must not exceed bin capacity
 *   - Bay/Tank must not already have an active bin assigned (LOCATION_IN_USE)
 */

const loadingService = {
  async completeLoading({
    binId,
    userId,
    userRole,
    rowVersion,
    bayId,
    tankId,
    materialId,
    quantityLoaded,
    unitOfMeasure,
    batchNumber,
    expectedUnloadingDate,
    comments = null,
    ipAddress = null,
    userAgent = null,
  }) {
    // ------------------------------------------------------------------
    // Basic input validation (removed fields defaulted for simplified UI)
    // ------------------------------------------------------------------
    if (!binId || !userId || !bayId || !tankId || !materialId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Missing required loading parameters');
    }

    if (!quantityLoaded || quantityLoaded <= 0) {
      const [capRows] = await pool.query('SELECT Capacity FROM Bin_Master WHERE Bin_ID = ?', [binId]);
      quantityLoaded = capRows.length > 0 ? capRows[0].Capacity : 1;
    }
    if (!expectedUnloadingDate) {
      const d = new Date(); d.setDate(d.getDate() + 30);
      expectedUnloadingDate = d.toISOString().slice(0, 10);
    }
    if (!batchNumber) {
      batchNumber = `AUTO-${Date.now()}`;
    }
    if (!unitOfMeasure) {
      unitOfMeasure = 'L';
    }

    // ------------------------------------------------------------------
    // Domain rule 1: Tank must belong to the selected Bay
    // ------------------------------------------------------------------
    const [tankRows] = await pool.query(
      'SELECT Bay_ID FROM Tank_Master WHERE Tank_ID = ? AND Is_Active = 1',
      [tankId],
    );
    if (tankRows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Tank not found or inactive');
    }
    if (tankRows[0].Bay_ID !== bayId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Selected tank does not belong to the selected bay');
    }

    // ------------------------------------------------------------------
    // Domain rule 2: Quantity loaded must not exceed bin capacity
    // ------------------------------------------------------------------
    const [binRows] = await pool.query(
      'SELECT Capacity FROM Bin_Master WHERE Bin_ID = ?',
      [binId],
    );
    if (binRows.length === 0) {
      throw new AppError(404, 'BIN_NOT_FOUND', 'Bin not found');
    }
    if (quantityLoaded > binRows[0].Capacity) {
      throw new AppError(400, 'VALIDATION_ERROR',
        `Quantity loaded (${quantityLoaded}) exceeds bin capacity (${binRows[0].Capacity})`,
      );
    }

    // ------------------------------------------------------------------
    // Domain rule 3: Bay/Tank must not already have an active bin
    // assigned (LOCATION_IN_USE — prevents double-assignment)
    // ------------------------------------------------------------------
    const [locationRows] = await pool.query(
      `SELECT Bin_ID FROM Bin_Master
       WHERE Current_Bay_ID = ? AND Current_Tank_ID = ?
         AND Current_Status NOT IN ('Awaiting_Loading', 'Retired')
         AND Is_Active = 1
         AND Bin_ID <> ?`,
      [bayId, tankId, binId],
    );
    if (locationRows.length > 0) {
      throw new AppError(409, 'LOCATION_IN_USE',
        'This bay/tank combination is already assigned to an active bin',
      );
    }

    logger.debug('Loading service: completing loading', {
      binId, userId, bayId, tankId, materialId, batchNumber,
    });

    // ------------------------------------------------------------------
    // Execute the complete workflow using the workflow engine
    // (delegates: transition validation, locking, history, audit)
    // ------------------------------------------------------------------
    const targetStatus = 'Awaiting_Unloading';
    const currentStatus = 'Loading_In_Progress';

    const result = await executeWorkflowStep({
      binId,
      userId,
      userRole,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      rowVersion,
      operationType: 'COMPLETE_LOADING',
      lockDurationMinutes: 60,
      callback: async ({ lockId }) => {
        // Use MySQL NOW() via SP — avoids JavaScript timezone (UTC vs local) inconsistency
        const loadingStartAt = null;

        // Update bin status (like statusUpdateCallback in workflow.controller)
        const [updateResult] = await pool.execute(
          'UPDATE Bin_Master SET Current_Status = ?, Current_Bay_ID = ?, Row_Version = Row_Version + 1, Updated_At = NOW() WHERE Bin_ID = ? AND Row_Version = ?',
          [targetStatus, bayId, binId, rowVersion],
        );
        if (updateResult.affectedRows === 0) {
          throw new AppError(409, 'CONCURRENT_MODIFICATION_CONFLICT', 'Bin has been modified by another user. Please re-scan.');
        }

        // Insert loading record via SP (pass null for start — SP uses NOW())
        const spResult = await spExecute('sp_insert_loading_record', [
          binId, userId, bayId, tankId, materialId,
          quantityLoaded, unitOfMeasure, batchNumber,
          expectedUnloadingDate, null, comments,
        ]);

        if (!spResult.success) {
          throw new AppError(409, spResult.errorCode, spResult.errorMessage);
        }

        const record = spResult.data?.[0]?.[0];
        const loadingId = record?.loading_id ?? null;

        logger.info('Loading record created', { binId, loadingId, batchNumber });

        return {
          operationRecordId: loadingId,
          operationRecordType: 'Loading_Record',
        };
      },
      audit: {
        actionType: 'COMPLETE_LOADING',
        targetEntity: 'Loading_Record',
        ipAddress,
        userAgent,
      },
    });

    const loadingId = result.callbackResult?.operationRecordId ?? null;
    return { loadingId };
  },
};

module.exports = loadingService;