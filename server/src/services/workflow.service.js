/**
 * PBLMS — Workflow Engine Service
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Thin orchestration layer that coordinates stored procedure calls
 * for every operational workflow (Loading, Unloading, Cleaning, QA).
 *
 * This service contains ZERO business logic — it calls the SPs in the
 * correct order, handles errors, and ensures locks are always released.
 *
 * Orchestration Pattern:
 *   1. Validate transition  (sp_validate_workflow_transition)
 *   2. Acquire lock         (sp_acquire_lock)
 *   3. Execute callback     (supplied by calling module)
 *   4. Insert history       (sp_insert_bin_history)
 *   5. Insert audit log     (sp_insert_audit_log)
 *   6. Release lock         (sp_release_lock — ALWAYS in finally{})
 */

const spExecute = require('../utils/spExecute');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Execute a workflow step with full lifecycle orchestration.
 *
 * @param {Object} options
 * @param {number} options.binId          — Bin being operated on
 * @param {number} options.userId         — User performing the operation
 * @param {string} options.userRole       — User's role (Loader/Unloader/Cleaner/QA_Inspector)
 * @param {string} options.fromStatus     — Expected current bin status
 * @param {string} options.toStatus       — Target bin status after operation
 * @param {number} options.rowVersion     — Row_Version from client's last scan
 * @param {string} options.operationType  — e.g. 'START_LOADING', 'COMPLETE_QA_PASS'
 * @param {number} [options.lockDurationMinutes=60] — Lock TTL
 * @param {Function} options.callback     — async(data) — the actual business operation (e.g. insert Loading_Record, update Bin_Master)
 *   Callback receives { lockId } and must return { operationRecordId, operationRecordType }
 * @param {Object} [options.history]      — Bin_History parameters (optional overrides)
 * @param {Object} [options.audit]        — Audit_Log parameters (optional overrides)
 *
 * @returns {Promise<{ transitionResult, callbackResult, historyResult, auditResult }>}
 */
async function executeWorkflowStep({
  binId,
  userId,
  userRole,
  fromStatus,
  toStatus,
  rowVersion,
  operationType,
  lockDurationMinutes = 60,
  callback,
  history = {},
  audit = {},
}) {
  if (!callback || typeof callback !== 'function') {
    throw new AppError(500, 'INTERNAL_ERROR', 'Workflow callback is required');
  }

  let lockId = null;

  try {
    // -----------------------------------------------------------------------
    // Step 1: Validate the transition
    // -----------------------------------------------------------------------
    logger.debug('Workflow: validating transition', { binId, fromStatus, toStatus, userRole, operationType });

    const transitionResult = await spExecute('sp_validate_workflow_transition', [
      binId, fromStatus, toStatus, userRole, rowVersion,
    ]);

    if (!transitionResult.success) {
      throw new AppError(
        transitionResult.errorCode === 'RBAC_FORBIDDEN' ? 403 : 409,
        transitionResult.errorCode,
        transitionResult.errorMessage,
      );
    }

    // -----------------------------------------------------------------------
    // Step 2: Acquire lock
    // -----------------------------------------------------------------------
    logger.debug('Workflow: acquiring lock', { binId, userId, operationType });

    const lockResult = await spExecute('sp_acquire_lock', [
      binId, userId, operationType, lockDurationMinutes,
    ]);

    if (!lockResult.success) {
      throw new AppError(409, lockResult.errorCode, lockResult.errorMessage);
    }

    // Extract lockId from the first data result row
    lockId = lockResult.data && lockResult.data[0] && lockResult.data[0][0]
      ? lockResult.data[0][0].lock_id
      : null;

    // -----------------------------------------------------------------------
    // Step 3: Execute the business callback (supplied by the calling module)
    // -----------------------------------------------------------------------
    logger.debug('Workflow: executing callback', { binId, operationType });

    const callbackResult = await callback({ lockId, transitionResult, lockResult });

    // -----------------------------------------------------------------------
    // Step 4: Insert Bin_History
    // -----------------------------------------------------------------------
    const historyData = {
      binId,
      previousStatus: fromStatus,
      newStatus: toStatus,
      actingUserId: userId,
      operationType,
      operationRecordId: callbackResult?.operationRecordId ?? null,
      operationRecordType: callbackResult?.operationRecordType ?? null,
      remarks: history.remarks ?? null,
      cycleNumber: history.cycleNumber ?? null,
      ...history,
    };

    logger.debug('Workflow: inserting history', { binId, operationType });

    const historyResult = await spExecute('sp_insert_bin_history', [
      historyData.binId,
      historyData.previousStatus,
      historyData.newStatus,
      historyData.actingUserId,
      historyData.operationType,
      historyData.operationRecordId,
      historyData.operationRecordType,
      historyData.remarks,
      historyData.cycleNumber,
    ]);

    if (!historyResult.success) {
      logger.error('Workflow: history insert failed', { binId, errorCode: historyResult.errorCode });
      // Non-fatal — do not throw; the operation has already succeeded
    }

    // -----------------------------------------------------------------------
    // Step 5: Insert Audit_Log
    // -----------------------------------------------------------------------
    const auditData = {
      actorUserId: userId,
      actionType: audit.actionType ?? operationType,
      targetEntity: audit.targetEntity ?? 'Bin_Master',
      targetId: binId,
      oldValue: audit.oldValue ?? JSON.stringify({ status: fromStatus }),
      newValue: audit.newValue ?? JSON.stringify({ status: toStatus }),
      ipAddress: audit.ipAddress ?? null,
      userAgent: audit.userAgent ?? null,
      ...audit,
    };

    logger.debug('Workflow: inserting audit log', { binId, operationType });

    const auditResult = await spExecute('sp_insert_audit_log', [
      auditData.actorUserId,
      auditData.actionType,
      auditData.targetEntity,
      auditData.targetId,
      auditData.oldValue,
      auditData.newValue,
      auditData.ipAddress,
      auditData.userAgent,
    ]);

    if (!auditResult.success) {
      logger.error('Workflow: audit log insert failed', { binId, errorCode: auditResult.errorCode });
      // Non-fatal
    }

    logger.info('Workflow step completed successfully', {
      binId, userId, operationType, fromStatus, toStatus,
    });

    return { transitionResult, lockResult, callbackResult, historyResult, auditResult };
  } catch (err) {
    // Re-throw AppError instances; wrap unknown errors
    if (err instanceof AppError) {
      throw err;
    }
    logger.error('Workflow step failed', {
      binId, operationType, error: err.message, stack: err.stack,
    });
    throw new AppError(500, 'INTERNAL_ERROR', 'Workflow operation failed');
  } finally {
    // -----------------------------------------------------------------------
    // Step 6: ALWAYS release the lock
    // -----------------------------------------------------------------------
    if (lockId !== null) {
      logger.debug('Workflow: releasing lock', { binId, userId, operationType });
      try {
        await spExecute('sp_release_lock', [binId, userId]);
      } catch (releaseErr) {
        logger.error('Workflow: lock release failed', {
          binId, lockId, error: releaseErr.message,
        });
        // Do not throw — the operation may have succeeded, and the lock
        // will expire naturally via the auto-release scheduler
      }
    }
  }
}

module.exports = { executeWorkflowStep };