/**
 * User Brand Access Repository Interface
 * Persistence boundary for user ↔ brand authorization.
 *
 * RULE: Each access row is scoped by userId and tenantId.
 * RULE: Duplicate (userId, tenantId) pairs are rejected at the database level.
 * RULE: Deactivation does not delete — access rows are soft-disabled.
 */

import { UserBrandAccess, CreateUserBrandAccessPayload, UpdateUserBrandAccessPayload } from '../types/user-brand-access';

export interface IUserBrandAccessRepository {
  /**
   * Get all brand access records for a user.
   * Returns all brands the user is authorized for (active and inactive).
   */
  getByUserId(userId: string): Promise<UserBrandAccess[]>;

  /**
   * Get access record for a specific user + tenant combination.
   * Returns null if no access exists for this pair.
   */
  getByUserAndTenant(userId: string, tenantId: string): Promise<UserBrandAccess | null>;

  /**
   * Get all active access records for a user.
   * Returns only active (isActive=true) records.
   */
  getActiveByUserId(userId: string): Promise<UserBrandAccess[]>;

  /**
   * Create a new user brand access record.
   * Throws if duplicate (userId, tenantId) already exists.
   */
  create(payload: CreateUserBrandAccessPayload): Promise<UserBrandAccess>;

  /**
   * Update an existing user brand access record.
   * Allows changing role and isActive.
   */
  update(id: string, payload: UpdateUserBrandAccessPayload): Promise<UserBrandAccess>;

  /**
   * Deactivate a user brand access record.
   * Sets isActive = false.
   */
  deactivate(id: string): Promise<boolean>;

  /**
   * Activate a user brand access record.
   * Sets isActive = true.
   */
  activate(id: string): Promise<boolean>;

  /**
   * Check if a user has active access to a specific brand.
   * Returns true if an active access row exists.
   */
  isActive(userId: string, tenantId: string): Promise<boolean>;
}
