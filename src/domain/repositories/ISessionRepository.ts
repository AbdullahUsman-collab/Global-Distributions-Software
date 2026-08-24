/**
 * Session Repository Interface
 * Persistence boundary for session management.
 * 
 * Manages session lifecycle: creation, retrieval, and deletion.
 */

import { UserSession } from '../types/auth';

/**
 * Repository interface for session persistence operations.
 * Defines the contract for session management.
 */
export interface ISessionRepository {
  /**
   * Create a new session for a user within a tenant.
   * Sets expiration based on session policy.
   */
  createSession(tenantId: string, userId: string): Promise<UserSession>;

  /**
   * Retrieve a session by its identifier.
   * Returns null if session expired or not found.
   */
  getSession(sessionId: string): Promise<UserSession | null>;

  /**
   * Delete a session (logout).
   * Returns true if session was found and deleted.
   */
  deleteSession(sessionId: string): Promise<boolean>;

  /**
   * Delete all sessions for a user.
   * Used for force logout or security events.
   */
  deleteAllUserSessions(userId: string): Promise<boolean>;

  /**
   * Clean up expired sessions.
   * Used for periodic maintenance.
   */
  cleanupExpiredSessions(): Promise<number>;
}
