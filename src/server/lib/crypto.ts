/**
 * Cryptographic Utilities
 * Secure token generation for sessions and CSRF.
 *
 * RULE: Never use Math.random() for security-sensitive tokens.
 * RULE: Use Node.js crypto module for cryptographic randomness.
 */

import { randomBytes, timingSafeEqual } from 'crypto';

const SESSION_TOKEN_BYTES = 32;
const CSRF_TOKEN_BYTES = 32;

/**
 * Generate a cryptographically secure random token.
 * Returns a hex-encoded string.
 */
export function generateSecureToken(bytes: number = SESSION_TOKEN_BYTES): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Generate a session token suitable for HTTP-only cookies.
 */
export function generateSessionToken(): string {
  return generateSecureToken(SESSION_TOKEN_BYTES);
}

/**
 * Generate a CSRF token.
 */
export function generateCsrfToken(): string {
  return generateSecureToken(CSRF_TOKEN_BYTES);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return timingSafeEqual(bufA, bufB);
}
