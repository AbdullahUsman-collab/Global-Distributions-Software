/**
 * Authentication Service Interface
 * Business logic boundary for authentication and session management.
 * 
 * RULE: This is where authentication business rules live.
 * Repositories are for persistence ONLY - not business logic.
 * 
 * RULE: Free-text username is supported (email NOT required).
 */

import {
  LoginCredentials,
  AuthResult,
  UserSession,
  User,
} from '../types/auth';

/**
 * Service interface for authentication business logic.
 * Coordinates between repositories and enforces auth rules.
 */
export interface IAuthService {
  /**
   * Authenticate a user with credentials.
   * Validates username, password, tenant membership, and active status.
   * Returns session on success, error on failure.
   */
  authenticate(credentials: LoginCredentials): Promise<AuthResult>;

  /**
   * Validate an existing session.
   * Returns session if valid, null if expired or invalid.
   */
  validateSession(sessionId: string): Promise<UserSession | null>;

  /**
   * End a session (logout).
   * Deletes the session from storage.
   */
  logout(sessionId: string): Promise<boolean>;

  /**
   * Get user by session.
   * Returns the user associated with a valid session.
   */
  getUserBySession(sessionId: string): Promise<User | null>;

  /**
   * Refresh a session.
   * Extends session expiration if still valid.
   */
  refreshSession(sessionId: string): Promise<UserSession | null>;
}
