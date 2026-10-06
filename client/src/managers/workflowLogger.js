import axiosInstance from '../utils/axiosInstance';

const eventBuffer = [];
let flushTimer = null;

const EVENT_FLUSH_INTERVAL = 15_000;

function getTimestamp() {
  return new Date().toISOString();
}

function flush() {
  if (eventBuffer.length === 0) return;
  const batch = eventBuffer.splice(0);
  axiosInstance.post('/v1/sessions/log-activity', { events: batch }).catch(() => {});
}

function scheduleFlush() {
  if (!flushTimer) {
    flushTimer = setInterval(flush, EVENT_FLUSH_INTERVAL);
  }
}

export function logWorkflowEvent(eventType, metadata = {}) {
  try {
    const entry = { eventType, metadata: { ...metadata, ts: getTimestamp() } };
    eventBuffer.push(entry);
    scheduleFlush();
    if (eventBuffer.length >= 20) flush();
  } catch {
  }
}

export function flushWorkflowEvents() {
  flush();
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export function logWorkflowRestored(binNumber, operation) {
  logWorkflowEvent('WORKFLOW_RESTORED', { binNumber, operation });
}

export function logWorkflowCancelled(binNumber, reason) {
  logWorkflowEvent('WORKFLOW_CANCELLED', { binNumber, reason });
}

export function logOffline() {
  logWorkflowEvent('OFFLINE');
}

export function logOnline() {
  logWorkflowEvent('ONLINE');
}

export function logDuplicateScan(binNumber) {
  logWorkflowEvent('DUPLICATE_SCAN_BLOCKED', { binNumber });
}

export function logScanTimeout() {
  logWorkflowEvent('TIMEOUT');
}

export function logRetry(binNumber, operation, attempt) {
  logWorkflowEvent('RETRY', { binNumber, operation, attempt });
}

export function logSessionExpired(binNumber) {
  logWorkflowEvent('SESSION_EXPIRED', { binNumber });
}

export function logHeartbeat(binNumber, step) {
  logWorkflowEvent('HEARTBEAT', { binNumber, step });
}
