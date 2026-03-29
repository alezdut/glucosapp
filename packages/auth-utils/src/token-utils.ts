/**
 * JWT Token Utilities
 * Shared utilities for decoding and validating JWT tokens across web and mobile apps
 */

/**
 * Decoded JWT payload structure
 */
export interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  [key: string]: unknown;
}

/**
 * Decode JWT token to get expiration time
 * Works in both browser (using atob) and React Native environments
 *
 * @param token - JWT token string
 * @returns Expiration timestamp in milliseconds, or null if invalid
 *
 * @example
 * const expiration = getTokenExpiration('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 * if (expiration && Date.now() < expiration) {
 *   console.log('Token is still valid');
 * }
 */
export function getTokenExpiration(token: string): number | null {
  try {
    // Split JWT into parts (header.payload.signature)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64 payload
    const payload = JSON.parse(atob(parts[1])) as JwtPayload;

    // Convert exp (seconds) to milliseconds
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    // Return null for any decoding errors (invalid token, malformed base64, etc.)
    return null;
  }
}

/**
 * Check if token is expired or expiring soon
 *
 * @param token - JWT token string
 * @param thresholdMinutes - Minutes before expiration to consider "expiring soon" (default: 1)
 * @returns true if token is expired or expiring within threshold, false if still valid
 *
 * @example
 * // Check if token expires in less than 1 minute
 * if (isTokenExpiringSoon(accessToken)) {
 *   await refreshAccessToken();
 * }
 *
 * @example
 * // Check if token expires in less than 5 minutes
 * if (isTokenExpiringSoon(accessToken, 5)) {
 *   console.log('Token will expire soon');
 * }
 */
export function isTokenExpiringSoon(token: string, thresholdMinutes: number = 1): boolean {
  const expiration = getTokenExpiration(token);

  // Treat invalid tokens as expired
  if (!expiration) {
    return true;
  }

  const now = Date.now();
  const timeUntilExpiry = expiration - now;
  const threshold = thresholdMinutes * 60 * 1000;

  // Return true if token expires within threshold
  return timeUntilExpiry < threshold;
}

/**
 * Check if token is currently expired (past expiration time)
 *
 * @param token - JWT token string
 * @returns true if token is expired, false if still valid
 *
 * @example
 * if (isTokenExpired(accessToken)) {
 *   console.log('Token has expired');
 * }
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);

  if (!expiration) {
    return true;
  }

  return Date.now() >= expiration;
}

/**
 * Get remaining time until token expiration
 *
 * @param token - JWT token string
 * @returns Milliseconds until expiration, or null if token is invalid
 *
 * @example
 * const remaining = getTimeUntilExpiration(accessToken);
 * if (remaining !== null) {
 *   console.log(`Token expires in ${Math.floor(remaining / 1000)} seconds`);
 * }
 */
export function getTimeUntilExpiration(token: string): number | null {
  const expiration = getTokenExpiration(token);

  if (!expiration) {
    return null;
  }

  const timeRemaining = expiration - Date.now();

  // Return 0 if already expired (don't return negative values)
  return Math.max(0, timeRemaining);
}
