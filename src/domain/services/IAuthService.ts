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
  SwitchTenantResult,
  UserSession,
  User,
} from '../types/auth';
import { TenantPublicConfig } from '../types/tenant';

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

  /**
   * Switch the tenant context for an authenticated session.
   * Validates brand access and tenant status, rotates session.
   * Returns updated user info with access-derived role.
   */
  switchTenant(sessionId: string, targetTenantId: string): Promise<SwitchTenantResult>;

  /**
   * Get all authorized tenants for a user.
   * Returns only active brand access records with tenant details.
   */
  getAuthorizedTenants(userId: string): Promise<TenantPublicConfig[]>;
}
