/**
 * User Repository Interface
 * Persistence boundary for user data access.
 * 
 * RULE: NEVER exposes passwordHash or credential data.
 * Returns only public User model.
 */

import { User, CreateUserPayload, UpdateUserPayload } from '../types/auth';

/**
 * Repository interface for user persistence operations.
 * Defines the contract for user data access.
 */
export interface IUserRepository {
  /**
   * Find user by username within a tenant.
   * Used for user lookup and authentication preparation.
   */
  findByUsername(tenantId: string, username: string): Promise<User | null>;

  /**
   * Find user by unique identifier.
   * Used for user operations and session validation.
   */
  findById(id: string): Promise<User | null>;

  /**
   * Check if user account is active.
   * Used for authentication validation.
   */
  isUserActive(id: string): Promise<boolean>;

  /**
   * Get all users for a tenant.
   * Used for user management UI.
   */
  getUsersByTenant(tenantId: string): Promise<User[]>;

  /**
   * Create a new user.
   * Used for user provisioning.
   */
  createUser(payload: CreateUserPayload): Promise<User>;

  /**
   * Update an existing user.
   * Used for user profile changes.
   */
  updateUser(id: string, payload: UpdateUserPayload): Promise<User>;

  /**
   * Soft delete a user (set isActive = false).
   * Used for user deactivation.
   */
  deactivateUser(id: string): Promise<boolean>;
}
