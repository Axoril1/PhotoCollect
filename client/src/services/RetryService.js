/**
 * Check if the error is transient and can be retried.
 * - Timeouts (ECONNABORTED, status 408)
 * - Network failures (no response object from server)
 * - Server errors (5xx status code)
 */
export const isTransientError = (error) => {
  if (!error) return false;

  // Timeout check
  if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
    return true;
  }

  // Network interruption (no server response received)
  if (!error.response) {
    return true;
  }

  const status = error.response.status;
  // Retry 408 Timeout and any 5xx server errors
  return status === 408 || (status >= 500 && status < 600);
};

/**
 * Calculate exponential backoff delay with random jitter.
 * @param {number} attempt - Current retry attempt index (1-based)
 * @param {number} baseDelay - Initial delay in milliseconds
 */
export const getBackoffDelay = (attempt, baseDelay = 1000) => {
  const exponent = Math.min(attempt - 1, 4); // Cap exponential growth at 2^4 = 16x
  const delay = Math.pow(2, exponent) * baseDelay;
  const jitter = Math.random() * 300; // Add up to 300ms of random jitter
  return Math.round(delay + jitter);
};
