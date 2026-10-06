const spExecute = require('../utils/spExecute');
const { executeWorkflowStep } = require('./workflow.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * PBLMS — QA Service
 *
 * QA-specific orchestration layer.
 * Workflow concerns (transition validation, locking, history, audit)
 * are delegated to the workflow engine via executeWorkflowStep.
 *
 * Business logic (sp_start_qa / sp_complete_qa) runs inside the
 * workflow callback so it is protected by the lock.
 */

const qaService = {
  async startQA({ binId, userId, userRole, rowVersion, ipAddress = null, userAgent = null }) {
    if (!binId || !userId) throw new AppError(400, 'VALIDATION_ERROR', 'Missing required parameters');

    logger.debug('QA service: starting QA via workflow engine', { binId, userId });

    const result = await executeWorkflowStep({
      binId,
      userId,
      userRole: userRole || 'QA_Inspector',
      fromStatus: 'Awaiting_QA',
      toStatus: 'QA_In_Progress',
      rowVersion,
      operationType: 'START_QA',
      lockDurationMinutes: 60,
      callback: async () => {
        const spResult = await spExecute('sp_start_qa', [binId, userId, userRole || 'QA_Inspector', rowVersion]);
        if (!spResult.success) throw new AppError(409, spResult.errorCode, spResult.errorMessage);

        const ctx = spResult.data?.[0]?.[0] || {};
        return {
          operationRecordId: ctx.qa_id ?? null,
          operationRecordType: 'QA_Record',
          // Return context fields needed by controller response
          cleaningId: ctx.Cleaning_ID,
          cleaningMethod: ctx.Cleaning_Method,
          cleaningAgent: ctx.Cleaning_Agent,
          waterTemp: ctx.Water_Temp_Celsius,
          rinseCycles: ctx.Rinse_Cycles,
          cleaningComments: ctx.cleaning_comments,
          materialId: ctx.Material_ID,
          materialName: ctx.Material_Name,
          batchNumber: ctx.Batch_Number,
          quantityLoaded: ctx.Quantity_Loaded,
          requiresQaAttention: ctx.requires_qa_attention === 1,
          isReinspection: ctx.is_reinspection === 1,
        };
      },
      audit: {
        actionType: 'START_QA',
        targetEntity: 'QA_Record',
        ipAddress,
        userAgent,
      },
    });

    const cb = result.callbackResult || {};
    return {
      cleaningId: cb.cleaningId,
      cleaningMethod: cb.cleaningMethod,
      cleaningAgent: cb.cleaningAgent,
      waterTemp: cb.waterTemp,
      rinseCycles: cb.rinseCycles,
      cleaningComments: cb.cleaningComments,
      materialId: cb.materialId,
      materialName: cb.materialName,
      batchNumber: cb.batchNumber,
      quantityLoaded: cb.quantityLoaded,
      requiresQaAttention: !!cb.requiresQaAttention,
      isReinspection: !!cb.isReinspection,
    };
  },

  async completeQA({
    binId, userId, userRole, rowVersion,
    visual, visualNotes, residue, residueNotes,
    damage, damageNotes, odor, odorNotes,
    label, labelNotes, seal, sealNotes,
    overallResult, failureReason, comments,
    ipAddress = null, userAgent = null,
  }) {
    if (!binId || !userId || !overallResult) throw new AppError(400, 'VALIDATION_ERROR', 'Missing required parameters');

    const toStatus = overallResult === 'PASS' ? 'QA_Passed' : 'QA_Failed';
    const operationType = overallResult === 'PASS' ? 'COMPLETE_QA_PASS' : 'COMPLETE_QA_FAIL';

    logger.debug('QA service: completing QA via workflow engine', { binId, userId, overallResult });

    const result = await executeWorkflowStep({
      binId,
      userId,
      userRole: userRole || 'QA_Inspector',
      fromStatus: 'QA_In_Progress',
      toStatus,
      rowVersion,
      operationType,
      lockDurationMinutes: 60,
      callback: async () => {
        const spResult = await spExecute('sp_complete_qa', [
          binId, userId, userRole || 'QA_Inspector',
          visual || 'Pass', comments || visualNotes || null,
          residue || 'Pass', residueNotes || null,
          damage || 'Pass', damageNotes || null,
          odor || 'Pass', odorNotes || null,
          label || 'Pass', labelNotes || null,
          seal || 'Pass', sealNotes || null,
          overallResult, failureReason || null,
          rowVersion,
        ]);
        if (!spResult.success) throw new AppError(409, spResult.errorCode, spResult.errorMessage);

        const record = spResult.data?.[0]?.[0] || {};
        return {
          operationRecordId: record.qa_id ?? null,
          operationRecordType: 'QA_Record',
          finalStatus: record.final_status ?? toStatus,
        };
      },
      audit: {
        actionType: operationType,
        targetEntity: 'QA_Record',
        oldValue: JSON.stringify({ status: 'QA_In_Progress' }),
        newValue: JSON.stringify({ status: toStatus, result: overallResult, reason: failureReason || null }),
        ipAddress,
        userAgent,
      },
    });

    const cb = result.callbackResult || {};
    return {
      qaId: cb.operationRecordId,
      finalStatus: cb.finalStatus || toStatus,
    };
  },
};

module.exports = qaService;