import { useState, useEffect, useCallback, useRef } from 'react';
import useOperationScan from './useOperationScan';
import { useSession } from '../contexts/SessionContext';
import { useNotification } from '../contexts/NotificationContext';
import { saveSession, clearSession } from '../managers/workflowSessionManager';
import { checkRecoveryOnMount, validateSessionWithBackend } from '../managers/recoveryManager';
import { validateScan, freezeEngine, resetEngine, setEngineProcessing } from '../managers/qrScanEngine';
import { withRetry, isRetryableError } from '../utils/withRetry';
import { logWorkflowEvent, logHeartbeat, flushWorkflowEvents, logOffline, logOnline } from '../managers/workflowLogger';
import axiosInstance from '../utils/axiosInstance';

export const S = { IDLE: 0, SCANNING: 1, CONFIRMED: 2, CONTEXT: 3, STARTED: 4, COMPLETING: 5, DONE: 6, ALREADY_DONE: 7, WORKFLOW_ISSUE: 8 };

const TIMEOUT_MS = 10_000;
const HEARTBEAT_INTERVAL = 30_000;

export default function useOperatorWorkflow({ operationLabel, role, expectedStatuses }) {
  const { binData, error, isLoading, scan: scanBin, reset: clearScan, recoveryResult, setBinData } = useOperationScan(expectedStatuses, operationLabel, role);
  const { updateSessionStatus, cancelSession, currentSession } = useSession();
  const { notifySuccess, notifyFromApiError } = useNotification();

  const [step, setStep] = useState(S.IDLE);
  const [formError, setFormError] = useState(null);
  const [workflowResult, setWorkflowResult] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [recovered, setRecovered] = useState(false);
  const [timeoutExpired, setTimeoutExpired] = useState(false);
  const [recoveryBanner, setRecoveryBanner] = useState(null);
  const [retryError, setRetryError] = useState(null);
  const [recovering, setRecovering] = useState(false);
  const heartbeatRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    resetEngine();
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const onOnline = () => {
      if (mountedRef.current) {
        setOffline(false);
        logOnline();
      }
    };
    const onOffline = () => {
      if (mountedRef.current) {
        setOffline(true);
        logOffline();
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const persist = useCallback((currentStep, data, wfResult) => {
    saveSession({
      step: currentStep,
      binData: data,
      workflowResult: wfResult,
      operationLabel,
    });
  }, [operationLabel]);

  useEffect(() => {
    if (recovered) return;
    const doRecovery = async () => {
      setRecovering(true);
      const recovery = checkRecoveryOnMount();
      if (!recovery.needsRecovery) {
        if (recovery.expired) {
          setFormError({ code: 'SESSION_EXPIRED', message: recovery.message || 'Previous session expired. Start a new scan.' });
          logWorkflowEvent('SESSION_EXPIRED');
          clearSession();
        }
        setRecovered(true);
        setRecovering(false);
        return;
      }

      const backend = await validateSessionWithBackend(recovery.state);
      if (!backend.valid) {
        clearSession();
        if (backend.reason === 'ALREADY_COMPLETED') {
          setFormError({ code: 'ALREADY_COMPLETED', message: backend.message || 'This operation has already been completed.' });
        } else {
          setFormError({ code: 'SESSION_STALE', message: backend.message || 'Your previous session is no longer valid. Start a new scan.' });
        }
        logWorkflowEvent('SESSION_EXPIRED', { reason: backend.reason });
        setRecovered(true);
        setRecovering(false);
        return;
      }

      setStep(recovery.state.step);
      if (recovery.state.binData) {
        setBinData(recovery.state.binData);
        setWorkflowResult(recovery.state.workflowResult || null);
      }
      logWorkflowEvent('WORKFLOW_RESTORED', { step: recovery.state.step, binNumber: recovery.state.binData?.Bin_Number });

      if (recovery.state.step === S.STARTED) {
        const binNum = recovery.state.binData?.Bin_Number || 'Unknown';
        setRecoveryBanner({
          title: 'Previous workflow restored',
          message: `Bin ${binNum} — ${operationLabel} — Resume where you left off.`,
        });
        setTimeout(() => {
          if (mountedRef.current) setRecoveryBanner(null);
        }, 8000);
      }

      setRecovered(true);
      setRecovering(false);
    };
    doRecovery();
  }, [recovered, operationLabel, setBinData]);

  useEffect(() => {
    if (step === S.IDLE || step === S.DONE || step === S.WORKFLOW_ISSUE) {
      clearSession();
    } else {
      persist(step, binData, workflowResult);
    }
  }, [step, binData, workflowResult, persist]);

  useEffect(() => {
    if (recoveryResult?.action === 'RESUME' && step < S.STARTED) {
      setStep(S.STARTED);
    }
  }, [recoveryResult, step]);

  useEffect(() => {
    if (step === S.STARTED && currentSession?.sessionId) {
      heartbeatRef.current = setInterval(() => {
        if (mountedRef.current) {
          axiosInstance.post('/v1/sessions/heartbeat', { sessionId: currentSession.sessionId }).catch(() => {});
          logHeartbeat(binData?.Bin_Number, step);
        }
      }, HEARTBEAT_INTERVAL);
    }
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [step, currentSession?.sessionId, binData?.Bin_Number]);

  useEffect(() => {
    return () => {
      flushWorkflowEvents();
    };
  }, []);

  const handleScan = useCallback(async (qrValue) => {
    const validation = validateScan(qrValue);
    if (!validation.allowed) {
      if (validation.reason === 'DUPLICATE') {
        logWorkflowEvent('DUPLICATE_SCAN_BLOCKED', { qrValue });
      }
      return;
    }

    setEngineProcessing(true);
    freezeEngine();
    setStep(S.SCANNING);
    setFormError(null);
    setWorkflowResult(null);
    setRetryError(null);

    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        setTimeoutExpired(true);
        logWorkflowEvent('SCAN_TIMEOUT', { qrValue });
      }
    }, TIMEOUT_MS);

    const result = await scanBin(qrValue);
    clearTimeout(timeoutId);
    setTimeoutExpired(false);

    if (!mountedRef.current) return;

    setEngineProcessing(false);

    if (result?.workflowState && result?.workflow) {
      setWorkflowResult(result.workflow);
      if (result.workflowState === 'SESSION_RESUME') {
        setStep(S.STARTED);
      } else {
        setStep(S.WORKFLOW_ISSUE);
        resetEngine();
      }
    } else if (result?.ready && result?.data) {
      setStep(S.CONFIRMED);
    } else {
      setStep(S.IDLE);
      resetEngine();
    }
  }, [scanBin]);

  const handleContinue = useCallback(() => {
    setStep(S.CONTEXT);
  }, []);

  const handleStart = useCallback(async (startFn) => {
    if (starting || completing) return;
    setStarting(true);
    setFormError(null);
    setRetryError(null);
    try {
      await withRetry(() => startFn(binData), { operation: 'start' });
      if (currentSession?.sessionId) {
        await updateSessionStatus(currentSession.sessionId, 'IN_PROGRESS');
      }
      if (mountedRef.current) setStep(S.STARTED);
    } catch (e) {
      const err = e.response?.data?.error;
      if (mountedRef.current) {
        const msg = err?.message || e.message || 'Start failed';
        setFormError({ code: err?.code || 'ERROR', message: msg });
        notifyFromApiError(e);
        if (isRetryableError(e)) {
          setRetryError({ type: 'start', message: msg });
        }
      }
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  }, [starting, completing, binData, currentSession, updateSessionStatus, notifyFromApiError]);

  const retryLastOperation = useCallback(() => {
    setRetryError(null);
  }, []);

  const handleComplete = useCallback(async (completeFn) => {
    if (completing) return;
    setCompleting(true);
    setStep(S.COMPLETING);
    setFormError(null);
    setRetryError(null);
    try {
      const result = await withRetry(() => completeFn(binData), { operation: 'complete' });
      if (currentSession?.sessionId) {
        await updateSessionStatus(currentSession.sessionId, 'COMPLETED').catch(() => {});
      }
      if (mountedRef.current) {
        setStep(S.DONE);
      }
      return result;
    } catch (e) {
      const err = e.response?.data?.error;
      if (mountedRef.current) {
        const msg = err?.message || e.message || 'Complete failed';
        setFormError({ code: err?.code || 'ERROR', message: msg });
        notifyFromApiError(e);
        if (isRetryableError(e)) {
          setRetryError({ type: 'complete', message: msg });
        }
        setStep(S.STARTED);
      }
      return null;
    } finally {
      if (mountedRef.current) setCompleting(false);
    }
  }, [completing, binData, currentSession, updateSessionStatus, notifyFromApiError]);

  const doReset = useCallback(() => {
    if (currentSession?.sessionId && step === S.DONE) {
      cancelSession(currentSession.sessionId).catch(() => {});
    }
    clearScan();
    resetEngine();
    setStep(S.IDLE);
    setFormError(null);
    setWorkflowResult(null);
    setRetryError(null);
    setRecoveryBanner(null);
    clearSession();
  }, [clearScan, cancelSession, currentSession, step]);

  const cancelWorkflow = useCallback(() => {
    if (currentSession?.sessionId) {
      logWorkflowEvent('WORKFLOW_CANCELLED', { binNumber: binData?.Bin_Number, step });
      cancelSession(currentSession.sessionId).catch(() => {});
    }
    clearScan();
    resetEngine();
    setStep(S.IDLE);
    setFormError(null);
    setWorkflowResult(null);
    setRetryError(null);
    setRecoveryBanner(null);
    clearSession();
  }, [clearScan, cancelSession, currentSession, binData, step]);

  return {
    step,
    setStep,
    binData,
    error,
    formError,
    setFormError,
    isLoading,
    workflowResult,
    completing,
    starting,
    offline,
    timeoutExpired,
    recovered,
    recovering,
    recoveryBanner,
    retryError,
    retryLastOperation,
    handleScan,
    handleContinue,
    handleStart,
    handleComplete,
    doReset,
    cancelWorkflow,
    binNumber: binData?.Bin_Number,
  };
}
