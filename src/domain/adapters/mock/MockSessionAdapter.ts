/**
 * Mock Session Adapter
 * DEVELOPMENT ONLY - In-memory mock implementation of ISessionRepository.
 * 
 * Manages session lifecycle for development and testing.
 */

import { UserSession } from '../../types/auth';
import { ISessionRepository } from '../../repositories/ISessionRepository';

/**
 * Session duration in milliseconds (30 minutes).
 */
const SESSION_DURATION_MS = 30 * 60 * 1000;

/**
 * In-memory storage for mock sessions.
 */
let sessions: Map<string, UserSession> = new Map();

/**
 * Mock implementation of ISessionRepository.
 * DEVELOPMENT ONLY - Do not use in production.
 */
export class MockSessionAdapter implements ISessionRepository {
  /**
   * Create a new session.
   */
  async createSession(
    tenantId: string,
    userId: string
  ): Promise<UserSession> {
    const session: UserSession = {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      tenantId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    };
    sessions.set(session.sessionId, session);
    return session;
  }

  /**
   * Get a session by ID.
   * Returns null if expired or not found.
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }
    // Check if expired
    if (new Date() > session.expiresAt) {
      sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  /**
   * Delete a session (logout).
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    return sessions.delete(sessionId);
  }

  /**
   * Delete all sessions for a user.
   */
  async deleteAllUserSessions(userId: string): Promise<boolean> {
    let deleted = false;
    for (const [id, session] of sessions.entries()) {
      if (session.userId === userId) {
        sessions.delete(id);
        deleted = true;
      }
    }
    return deleted;
  }

  /**
   * Clean up expired sessions.
   * Returns count of deleted sessions.
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [id, session] of sessions.entries()) {
      if (now > session.expiresAt) {
        sessions.delete(id);
        count++;
      }
    }
    return count;
  }
}
