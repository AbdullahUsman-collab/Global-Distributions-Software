/**
 * User Credentials Repository Interface
 * ISOLATED persistence boundary for credential verification.
 * 
 * RULE: NEVER exposed to UI or application services directly.
 * Only accessed for authentication verification.
 * 
 * RULE: This repository is for persistence ONLY.
 * Password hashing and verification belong in IAuthService.
 */

import { UserCredentials } from '../types/auth';

/**
 * Isolated repository interface for credential persistence.
 * This is a security boundary - credentials never leave this boundary.
 */
export interface IUserCredentialsRepository {
  /**
   * Get credentials by username within a tenant.
   * Used during authentication to verify password.
   */
  getCredentialsByUsername(
    tenantId: string,
    username: string
  ): Promise<UserCredentials | null>;

  /**
   * Get credentials by user identifier.
   * Used for credential refresh and management.
   */
  getCredentialsByUserId(userId: string): Promise<UserCredentials | null>;

  /**
   * Store new credentials for a user.
   * Used during user creation.
   */
  storeCredentials(
    userId: string,
    tenantId: string,
    passwordHash: string,
    algo?: string
  ): Promise<boolean>;

  /**
   * Update existing credentials.
   * Used during password change.
   */
  updateCredentials(
    userId: string,
    passwordHash: string,
    algo?: string
  ): Promise<boolean>;

  /**
   * Check if credentials exist for a user.
   * Used for credential status checks.
   */
  hasCredentials(userId: string): Promise<boolean>;
}
