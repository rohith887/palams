const { validationResult } = require('express-validator');
const { executeWorkflowStep } = require('../services/workflow.service');
const { validateWorkflow } = require('../services/workflowValidationService');
const spExecute = require('../utils/spExecute');
const { success } = require('../utils/responseBuilder');
const { mapErrorCodeToHttpStatus } = require('../utils/errorMapper');
const logger = require('../utils/logger');

/**
 * Generic status-update callback used by workflow start/complete endpoints.
 * Updates Bin_Master.Current_Status and Row_Version atomically.
 * Module-specific operations (insert Loading_Record, etc.) extend this.
 */
async function statusUpdateCallback(binId, toStatus, rowVersion) {
  const conn = await require('../config/database').getConnection();
  try {
    await conn.execute(
      'UPDATE Bin_Master SET Current_Status = ?, Row_Version = Row_Version + 1, Updated_At = NOW() WHERE Bin_ID = ? AND Row_Version = ?',
      [toStatus, binId, rowVersion],
    );
    return { operationRecordId: null, operationRecordType: null };
  } finally {
    conn.release();
  }
}

const workflowController = {
  /**
   * POST /api/v1/workflow/start
   * Starts a workflow operation — validates transition, acquires lock,
   * updates bin status, writes history + audit.
   */
  async startOperation(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() },
        });
      }

      const { binId, rowVersion, fromStatus, toStatus, operationType } = req.body;
      const { userId, role: userRole } = req.user;

      const result = await executeWorkflowStep({
        binId,
        userId,
        userRole,
        fromStatus,
        toStatus,
        rowVersion,
        operationType,
        callback: async () => statusUpdateCallback(binId, toStatus, rowVersion),
        audit: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent') || null,
        },
      });

      res.status(200).json(success({
        binId,
        newStatus: toStatus,
        lockId: result.lockResult?.data?.[0]?.[0]?.lock_id ?? null,
        message: 'Operation started successfully',
      }));
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/workflow/complete
   * Completes a workflow operation — validates transition, executes
   * callback (status update via workflow engine), releases lock,
   * writes history + audit.
   */
  async completeOperation(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() },
        });
      }

      const { binId, rowVersion, fromStatus, toStatus, operationType } = req.body;
      const { userId, role: userRole } = req.user;

      const result = await executeWorkflowStep({
        binId,
        userId,
        userRole,
        fromStatus,
        toStatus,
        rowVersion,
        operationType,
        callback: async () => statusUpdateCallback(binId, toStatus, rowVersion),
        audit: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent') || null,
        },
      });

      res.status(200).json(success({
        binId,
        newStatus: toStatus,
        message: 'Operation completed successfully',
      }));
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/workflow/validate
   * Validates a workflow transition without executing it.
   * Read-only — no locks, no mutations.
   */
  async validateTransition(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() },
        });
      }

      const { binId, fromStatus, toStatus, rowVersion } = req.body;
      const { role: userRole } = req.user;

      const result = await spExecute('sp_validate_workflow_transition', [
        binId, fromStatus, toStatus, userRole, rowVersion,
      ]);

      if (!result.success) {
        return res.status(mapErrorCodeToHttpStatus(result.errorCode) || 409).json({
          success: false, data: null,
          error: { code: result.errorCode, message: result.errorMessage },
        });
      }

      const metadata = result.data && result.data[0] && result.data[0][0]
        ? result.data[0][0]
        : {};

      res.status(200).json(success({
        valid: true,
        requiresLock: metadata.requires_lock === 1,
        operationType: metadata.operation_type,
      }));
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/workflow/validate-scan
   * Validates a scanned bin against the user's role.
   * Returns structured workflow result with friendly messages.
   * Read-only — no locks, no mutations.
   */
  async validateScan(req, res, next) {
    try {
      const { binData } = req.body;
      const { userId, role: userRole } = req.user;

      if (!binData || !binData.Current_Status) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Bin data with Current_Status is required' },
        });
      }

      const result = validateWorkflow(binData, userId, userRole);
      res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = workflowController;