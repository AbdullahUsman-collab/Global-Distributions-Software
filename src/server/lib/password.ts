/**
 * Password Hashing Utility
 * Uses bcrypt for secure password hashing and verification.
 *
 * RULE: Passwords are NEVER stored in plaintext.
 * RULE: Passwords are NEVER returned from API responses.
 * RULE: Verification is timing-safe (provided by bcrypt.compare).
 * RULE: No password values are logged.
 */

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt.
 * Returns the bcrypt hash string.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * Uses timing-safe comparison (provided by bcrypt).
 * Returns true if the password matches.
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/**
 * Check if a hash needs rehashing (e.g., if salt rounds changed).
 */
export function needsRehash(passwordHash: string): boolean {
  return bcrypt.getRounds(passwordHash) < SALT_ROUNDS;
}
