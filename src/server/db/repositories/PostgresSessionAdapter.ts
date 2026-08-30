/**
 * PostgreSQL Session Repository
 * Persistent session storage with hashed token lookup.
 *
 * RULE: Raw session token is NEVER stored in the database.
 * RULE: SHA-256 hash of token is used for lookup.
 * RULE: Expired sessions are rejected server-side.
 * RULE: Logout deletes/revokes the server-side session.
 */

import { createHash } from 'crypto';
import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { UserSession } from '../../../domain/types/auth';
import { query } from '../pool.js';

const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Hash a session token for storage.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * PostgreSQL implementation of ISessionRepository.
 */
export class PostgresSessionAdapter implements ISessionRepository {
  /**
   * Create a new session.
   * Stores a SHA-256 hash of the token, not the raw token.
   */
  async createSession(tenantId: string, userId: string): Promise<UserSession> {
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    const tokenHash = hashToken(sessionId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    await query(
      `INSERT INTO sessions (id, token_hash, user_id, tenant_id, expires_at, created_at, last_activity_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, tokenHash, userId, tenantId, expiresAt, now, now]
    );

    return {
      sessionId,
      userId,
      tenantId,
      expiresAt,
      createdAt: now,
    };
  }

  /**
   * Get a session by token.
   * Looks up by SHA-256 hash, not raw token.
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    const tokenHash = hashToken(sessionId);
    const result = await query(
      `SELECT id, user_id, tenant_id, expires_at, created_at
       FROM sessions
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      sessionId: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Delete a session (logout).
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const tokenHash = hashToken(sessionId);
    const result = await query(
      'DELETE FROM sessions WHERE token_hash = $1',
      [tokenHash]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete all sessions for a user.
   */
  async deleteAllUserSessions(userId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM sessions WHERE user_id = $1',
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Clean up expired sessions.
   * Returns count of deleted sessions.
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await query(
      'DELETE FROM sessions WHERE expires_at < NOW()'
    );
    return result.rowCount ?? 0;
  }
}
