const spExecute = require('../utils/spExecute');
const { executeWorkflowStep } = require('./workflow.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const pool = require('../config/database');

/**
 * PBLMS — Unloading Service
 *
 * Unloading-specific business rules enforced here:
 *   - Loading_Record must belong to the same Bin
 *   - Quantity unloaded must not exceed what was loaded (also in SP)
 *   - If condition is Damaged/Contamination_Suspected → set Requires_QA_Attention
 */

const unloadingService = {
  async completeUnloading({
    binId,
    userId,
    userRole,
    rowVersion,
    loadingId,
    quantityUnloaded,
    unloadingCondition,
    comments = null,
    ipAddress = null,
    userAgent = null,
  }) {
    // Basic input validation
    if (!binId || !userId || !loadingId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Missing required unloading parameters');
    }

    if (!quantityUnloaded || quantityUnloaded <= 0) {
      const [ldRows] = await pool.query('SELECT Quantity_Loaded FROM Loading_Record WHERE Loading_ID = ?', [loadingId]);
      quantityUnloaded = ldRows.length > 0 ? ldRows[0].Quantity_Loaded : 1;
    }
    if (!unloadingCondition || !['Normal', 'Damaged', 'Contamination_Suspected'].includes(unloadingCondition)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Unloading condition must be Normal, Damaged, or Contamination_Suspected');
    }

    // ------------------------------------------------------------------
    // Domain rule 1: Loading_Record must belong to the same Bin
    // ------------------------------------------------------------------
    const [loadingRows] = await pool.query(
      'SELECT Bin_ID, Quantity_Loaded FROM Loading_Record WHERE Loading_ID = ?',
      [loadingId],
    );
    if (loadingRows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Loading record not found');
    }
    if (loadingRows[0].Bin_ID !== binId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Loading record does not belong to this bin');
    }

    // ------------------------------------------------------------------
    // Domain rule 2: Quantity unloaded must not exceed quantity loaded
    // (also enforced in SP, but checked here for early feedback)
    // ------------------------------------------------------------------
    if (quantityUnloaded > loadingRows[0].Quantity_Loaded) {
      throw new AppError(400, 'VALIDATION_ERROR',
        `Quantity unloaded (${quantityUnloaded}) exceeds quantity loaded (${loadingRows[0].Quantity_Loaded})`,
      );
    }

    logger.debug('Unloading service: completing unloading', { binId, loadingId });

    const targetStatus = 'Awaiting_Cleaning';
    const currentStatus = 'Unloading_In_Progress';

    const result = await executeWorkflowStep({
      binId,
      userId,
      userRole,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      rowVersion,
      operationType: 'COMPLETE_UNLOADING',
      lockDurationMinutes: 60,
      callback: async ({ lockId }) => {
        // Update bin status (preserve Bay/Tank — do NOT clear location)
        const [updateResult] = await pool.execute(
          'UPDATE Bin_Master SET Current_Status = ?, Row_Version = Row_Version + 1, Updated_At = NOW() WHERE Bin_ID = ? AND Row_Version = ?',
          [targetStatus, binId, rowVersion],
        );
        if (updateResult.affectedRows === 0) {
          throw new AppError(409, 'CONCURRENT_MODIFICATION_CONFLICT', 'Bin has been modified by another user. Please re-scan.');
        }

        // Insert unloading record (pass null for start — SP uses NOW())
        const spResult = await spExecute('sp_insert_unloading_record', [
          binId, loadingId, userId,
          quantityUnloaded, unloadingCondition,
          null, comments,
        ]);

        if (!spResult.success) {
          throw new AppError(409, spResult.errorCode, spResult.errorMessage);
        }

        const record = spResult.data?.[0]?.[0];
        const unloadingId = record?.unloading_id ?? null;

        // ------------------------------------------------------------------
        // Domain rule 3: Abnormal condition → set Requires_QA_Attention
        // ------------------------------------------------------------------
        if (unloadingCondition === 'Damaged' || unloadingCondition === 'Contamination_Suspected') {
          const conn = await pool.getConnection();
          try {
            await conn.execute(
              'UPDATE Bin_Master SET Requires_QA_Attention = 1 WHERE Bin_ID = ?',
              [binId],
            );
            logger.info('QA attention flag set on bin', { binId, unloadingCondition });
          } finally {
            conn.release();
          }
        }

        logger.info('Unloading record created', { binId, unloadingId });
        return { operationRecordId: unloadingId, operationRecordType: 'Unloading_Record' };
      },
      audit: {
        actionType: 'COMPLETE_UNLOADING',
        targetEntity: 'Unloading_Record',
        ipAddress,
        userAgent,
      },
    });

    const unloadingId = result.callbackResult?.operationRecordId ?? null;
    return { unloadingId };
  },
};

module.exports = unloadingService;