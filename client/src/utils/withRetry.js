const RETRYABLE_STATUSES = [502, 503, 504];
const RETRY_DELAY = 1000;

export async function withRetry(fn, context = {}) {
  try {
    return await fn();
  } catch (err) {
    const status = err.response?.status;
    const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
    const isRetryable = isNetworkError || RETRYABLE_STATUSES.includes(status);

    if (isRetryable) {
      await new Promise(r => setTimeout(r, RETRY_DELAY));
      return await fn();
    }

    throw err;
  }
}

export function isRetryableError(err) {
  if (!err) return false;
  const status = err.response?.status;
  const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
  return isNetworkError || RETRYABLE_STATUSES.includes(status);
}
