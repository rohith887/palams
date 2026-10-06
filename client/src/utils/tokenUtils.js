/**
 * PBLMS — JWT Token Utilities
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Client-side JWT parsing utilities. No external library required —
 * JWT payload is base64-decoded directly.
 *
 * Functions:
 *   - parseToken: Decodes JWT payload
 *   - getTokenExpiry: Extracts expiration timestamp
 *   - isTokenExpiringSoon: Checks if token expires within N minutes
 */

/**
 * Parse a JWT and return the decoded payload object.
 * Does NOT verify the signature — verification is server-side only.
 *
 * @param {string} token — Raw JWT string
 * @returns {Object|null} Decoded payload or null if invalid
 */
export function parseToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64Url decode the payload (second part)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Extract the expiry timestamp (in seconds since epoch) from a JWT.
 *
 * @param {string} token — Raw JWT string
 * @returns {number|null} Expiry timestamp in seconds, or null
 */
export function getTokenExpiry(token) {
  const payload = parseToken(token);
  if (!payload || !payload.exp) return null;
  return payload.exp;
}

/**
 * Check if a token is expiring within the specified number of minutes.
 * Used by ProtectedRoute to trigger silent refresh before expiry.
 *
 * @param {string} token — Raw JWT string
 * @param {number} [minutesThreshold=5] — Minutes before expiry to check
 * @returns {boolean} True if token expires within the threshold
 */
export function isTokenExpiringSoon(token, minutesThreshold = 5) {
  const exp = getTokenExpiry(token);
  if (!exp) return true; // If we can't parse it, treat as expiring
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const thresholdInSeconds = minutesThreshold * 60;
  return exp - nowInSeconds <= thresholdInSeconds;
}

/**
 * Check if a token is already expired.
 *
 * @param {string} token — Raw JWT string
 * @returns {boolean} True if token has expired
 */
export function isTokenExpired(token) {
  const exp = getTokenExpiry(token);
  if (!exp) return true;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp < nowInSeconds;
}

export default { parseToken, getTokenExpiry, isTokenExpiringSoon, isTokenExpired };