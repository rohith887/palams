const spExecute = require('../utils/spExecute');
const { executeWorkflowStep } = require('./workflow.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * PBLMS — Cleaning Service
 *
 * Cleaning-specific orchestration layer.
 * Workflow concerns (transition validation, locking, history, audit)
 * are delegated to the workflow engine via executeWorkflowStep.
 *
 * Business logic (sp_start_cleaning / sp_complete_cleaning) runs
 * inside the workflow callback so it is protected by the lock.
 */

const cleaningService = {
  async startCleaning({ binId, userId, userRole, rowVersion, ipAddress = null, userAgent = null }) {
    if (!binId || !userId) throw new AppError(400, 'VALIDATION_ERROR', 'Missing required parameters');

    logger.debug('Cleaning service: starting cleaning via workflow engine', { binId, userId });

    const result = await executeWorkflowStep({
      binId,
      userId,
      userRole: userRole || 'Cleaner',
      fromStatus: 'Awaiting_Cleaning',
      toStatus: 'Cleaning_In_Progress',
      rowVersion,
      operationType: 'START_CLEANING',
      lockDurationMinutes: 60,
      callback: async () => {
        const spResult = await spExecute('sp_start_cleaning', [binId, userId, userRole || 'Cleaner', rowVersion]);
        if (!spResult.success) throw new AppError(409, spResult.errorCode, spResult.errorMessage);

        const ctx = spResult.data?.[0]?.[0] || {};

        // Return the SP context alongside the standard workflow callback fields
        return {
          operationRecordId: ctx.cleaning_id ?? null,
          operationRecordType: 'Cleaning_Record',
          // Context fields needed by controller response
          loadingId: ctx.loading_id,
          materialId: ctx.material_id,
          materialName: ctx.Material_Name,
          batchNumber: ctx.batch_number,
          quantityLoaded: ctx.quantity_loaded,
          loadingComments: ctx.loading_comments,
          unloadingCondition: ctx.unloading_condition,
          unloadingComments: ctx.unloading_comments,
          isReinspection: ctx.is_reinspection === 1,
        };
      },
      audit: {
        actionType: 'START_CLEANING',
        targetEntity: 'Cleaning_Record',
        ipAddress,
        userAgent,
      },
    });

    const cb = result.callbackResult || {};
    return {
      loadingId: cb.loadingId,
      materialId: cb.materialId,
      materialName: cb.materialName,
      batchNumber: cb.batchNumber,
      quantityLoaded: cb.quantityLoaded,
      loadingComments: cb.loadingComments,
      unloadingCondition: cb.unloadingCondition,
      unloadingComments: cb.unloadingComments,
      isReinspection: !!cb.isReinspection,
    };
  },

  async completeCleaning({ binId, userId, userRole, method, agent, waterTemp, rinseCycles, comments, rowVersion, ipAddress = null, userAgent = null }) {
    if (!binId || !userId) throw new AppError(400, 'VALIDATION_ERROR', 'Missing required parameters');
    if (!method) method = 'Rinse';
    if (!agent) agent = 'Standard';
    if (!waterTemp && waterTemp !== 0) waterTemp = 40;
    if (!rinseCycles) rinseCycles = 1;
    const finalMethod = method;
    const finalAgent = agent;

    logger.debug('Cleaning service: completing cleaning via workflow engine', { binId, userId, method: finalMethod });

    const result = await executeWorkflowStep({
      binId,
      userId,
      userRole: userRole || 'Cleaner',
      fromStatus: 'Cleaning_In_Progress',
      toStatus: 'Awaiting_QA',
      rowVersion,
      operationType: 'COMPLETE_CLEANING',
      lockDurationMinutes: 60,
      callback: async () => {
        const spResult = await spExecute('sp_complete_cleaning', [
          binId, userId, userRole || 'Cleaner', finalMethod, finalAgent, waterTemp, rinseCycles, comments || null, rowVersion,
        ]);
        if (!spResult.success) throw new AppError(409, spResult.errorCode, spResult.errorMessage);

        const record = spResult.data?.[0]?.[0] || {};
        return {
          operationRecordId: record.cleaning_id ?? null,
          operationRecordType: 'Cleaning_Record',
          nextStatus: record.next_status ?? 'Awaiting_QA',
        };
      },
      audit: {
        actionType: 'COMPLETE_CLEANING',
        targetEntity: 'Cleaning_Record',
        oldValue: JSON.stringify({ method: finalMethod, agent: finalAgent }),
        newValue: JSON.stringify({ status: 'Awaiting_QA', method: finalMethod, agent: finalAgent }),
        ipAddress,
        userAgent,
      },
    });

    const cb = result.callbackResult || {};
    return {
      cleaningId: cb.operationRecordId,
      nextStatus: cb.nextStatus || 'Awaiting_QA',
    };
  },
};

module.exports = cleaningService;