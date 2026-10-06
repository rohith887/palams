import { useState, useCallback } from 'react';
import useBinScan from './useBinScan';
import { useSession } from '../contexts/SessionContext';
import workflowService from '../services/workflowService';

/**
 * useOperationScan — orchestrates the full scan → validate → session-recovery flow.
 *
 * Returns one of:
 *   { error: true }                        — scan failed (binData is null)
 *   { workflowState, workflow }            — not ready, show WorkflowStatusCard
 *   { workflowState: 'SESSION_RESUME', data, workflow } — operator can resume
 *   { ready: true, data, workflow }        — bin is ready, proceed
 *
 * Operators NEVER see raw status codes, API errors, or technical messages.
 * All error messages come from workflowValidationService friendly fields or
 * the notificationService error map.
 */
export default function useOperationScan(expectedStatus, operationLabel, userRole) {
  const { binData, error, isLoading, scanBin, clearScan, setBinData } = useBinScan();
  const { checkScanRecovery } = useSession();
  const [statusError, setStatusError] = useState(null);
  const [recoveryResult, setRecoveryResult] = useState(null);

  const scan = useCallback(async (qrValue) => {
    setStatusError(null);
    setRecoveryResult(null);

    // Step 1: resolve QR code to bin data
    const data = await scanBin(qrValue);
    if (!data) {
      // useBinScan already set error state with a friendly-mapped message
      return { error: true };
    }

    // Step 2: validate workflow state against user's role
    let workflow = null;
    try {
      const res = await workflowService.validateScan(data, userRole);
      workflow = res.data?.data;
    } catch {
      // Network/auth error — treat as scan error so operator sees a friendly message
      // rather than silently proceeding with an unvalidated bin
      setStatusError({
        code: 'NETWORK_ERROR',
        message: 'Unable to validate bin status. Please check your connection and try again.',
      });
      clearScan();
      return { error: true };
    }

    // Step 3: handle workflow states that block the operation
    if (workflow) {
      const state = workflow.workflowState;

      // WRONG_STAGE / WRONG_OPERATOR / ALREADY_COMPLETED / UNKNOWN — show WorkflowStatusCard
      if (state === 'WRONG_STAGE' || state === 'WRONG_OPERATOR' || state === 'ALREADY_COMPLETED' || state === 'UNKNOWN') {
        clearScan();
        return { workflowState: state, workflow };
      }

      // READY or In-Progress for same operator — proceed to session recovery check
    }

    // Step 4: session recovery check
    try {
      const recovery = await checkScanRecovery({ binId: data.Bin_ID, qrCodeValue: qrValue });

      if (recovery?.action === 'BLOCKED') {
        const blockedBy = recovery.session?.Operator_Name || 'another operator';
        clearScan();
        return {
          workflowState: 'BLOCKED',
          workflow: {
            workflowState: 'BLOCKED',
            currentStatus: workflow?.currentStatus || null,
            nextOperator: null,
            nextOperatorFriendly: null,
            currentOperator: blockedBy,
            startedAt: null,
            friendly: {
              title: 'Already Being Processed',
              message: `${blockedBy} is currently processing this bin.`,
              instruction: 'Please scan a different bin.',
            },
          },
        };
      }

      if (recovery?.action === 'ALREADY_COMPLETED') {
        clearScan();
        return {
          workflowState: 'ALREADY_COMPLETED',
          workflow: workflow || {
            workflowState: 'ALREADY_COMPLETED',
            friendly: {
              title: 'Already Completed',
              message: 'This operation has already been completed for this bin.',
              instruction: 'Please scan a different bin.',
            },
          },
        };
      }

      if (recovery?.action === 'RESUME') {
        setRecoveryResult(recovery);
        return {
          workflowState: 'SESSION_RESUME',
          data,
          workflow: {
            workflowState: 'SESSION_RESUME',
            currentStatus: workflow?.currentStatus || null,
            nextOperator: null,
            nextOperatorFriendly: null,
            currentOperator: null,
            startedAt: null,
            friendly: {
              title: 'Resume Operation',
              message: 'You have an existing session for this bin.',
              instruction: 'Continue where you left off.',
            },
          },
        };
      }
      // NEW or other — fall through to ready
    } catch {
      // Session check failure is non-critical — proceed as new operation
    }

    return { ready: true, data, workflow };
  }, [scanBin, clearScan, checkScanRecovery, userRole]);

  const reset = useCallback(() => {
    clearScan();
    setStatusError(null);
    setRecoveryResult(null);
  }, [clearScan]);

  return {
    binData,
    error: statusError || error,
    isLoading,
    scan,
    reset,
    recoveryResult,
    setBinData,
  };
}
