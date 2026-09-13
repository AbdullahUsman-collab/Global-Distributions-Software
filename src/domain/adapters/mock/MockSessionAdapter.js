"use strict";
/**
 * Mock Session Adapter
 * DEVELOPMENT ONLY - In-memory mock implementation of ISessionRepository.
 *
 * Manages session lifecycle for development and testing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSessionAdapter = void 0;
exports.resetSessionStore = resetSessionStore;
/**
 * Session duration in milliseconds (30 minutes).
 */
const SESSION_DURATION_MS = 30 * 60 * 1000;
/**
 * In-memory storage for mock sessions.
 */
let sessions = new Map();
/**
 * Reset store to empty state. Use in test beforeEach to isolate tests.
 */
function resetSessionStore() {
    sessions = new Map();
}
/**
 * Mock implementation of ISessionRepository.
 * DEVELOPMENT ONLY - Do not use in production.
 */
class MockSessionAdapter {
    /**
     * Create a new session.
     */
    async createSession(tenantId, userId) {
        const session = {
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
    async getSession(sessionId) {
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
    async deleteSession(sessionId) {
        return sessions.delete(sessionId);
    }
    /**
     * Delete all sessions for a user.
     */
    async deleteAllUserSessions(userId) {
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
    async cleanupExpiredSessions() {
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
exports.MockSessionAdapter = MockSessionAdapter;
