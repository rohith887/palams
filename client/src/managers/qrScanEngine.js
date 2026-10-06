const DEBOUNCE_MS = 1500;

let _lastValue = null;
let _lastTime = 0;
let _isFrozen = false;
let _isProcessing = false;

export function resetEngine() {
  _lastValue = null;
  _lastTime = 0;
  _isFrozen = false;
  _isProcessing = false;
}

export function freezeEngine() {
  _isFrozen = true;
}

export function unfreezeEngine() {
  _isFrozen = false;
}

export function isEngineFrozen() {
  return _isFrozen;
}

export function isEngineProcessing() {
  return _isProcessing;
}

export function setEngineProcessing(v) {
  _isProcessing = v;
}

export function validateScan(value) {
  if (!value || !value.trim()) {
    return { allowed: false, reason: 'EMPTY' };
  }

  const trimmed = value.trim();

  if (_isFrozen) {
    return { allowed: false, reason: 'FROZEN' };
  }

  if (_isProcessing) {
    return { allowed: false, reason: 'ALREADY_PROCESSING' };
  }

  if (trimmed === _lastValue && Date.now() - _lastTime < DEBOUNCE_MS) {
    return { allowed: false, reason: 'DUPLICATE' };
  }

  _lastValue = trimmed;
  _lastTime = Date.now();
  return { allowed: true, reason: null };
}
