/**
 * User Brand Access Domain Types
 * Multi-brand access authorization for the ERP system.
 *
 * RULE: One user can have access to multiple brands (tenants).
 * RULE: Each access row defines the user's role for a specific brand.
 * RULE: UserBrandAccess is an additional authorization layer — it does NOT
 *       replace users.tenant_id or users.role until later migration steps.
 * RULE: OWNER is a global system role — not represented in user_brand_access.role.
 *       Owner access is expressed via ADMIN access rows for each authorized brand.
 */

import { SystemRoleName } from './rbac';

/**
 * User brand access entity.
 * Maps users to authorized brands with per-brand roles.
 */
export interface UserBrandAccess {
  /** Unique identifier */
  id: string;
  /** User reference */
  userId: string;
  /** Tenant/brand reference */
  tenantId: string;
  /** Per-brand role for this user */
  role: SystemRoleName;
  /** Whether this access is currently active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating a user brand access record.
 */
export interface CreateUserBrandAccessPayload {
  userId: string;
  tenantId: string;
  role: SystemRoleName;
  isActive?: boolean;
}

/**
 * DTO for updating a user brand access record.
 */
export interface UpdateUserBrandAccessPayload {
  role?: SystemRoleName;
  isActive?: boolean;
}
