/**
 * Role-Based Access Control (RBAC) Domain Types
 * Defines roles, permissions, and access control structures.
 */

/**
 * Permission scope string literal union.
 * Represents module-level access scopes.
 */
export type Permission =
  // Master Data
  | 'master_data:read'
  | 'master_data:write'
  | 'master_data:delete'
  // Accounts
  | 'accounts:read'
  | 'accounts:write'
  | 'accounts:delete'
  // Items
  | 'items:read'
  | 'items:write'
  | 'items:delete'
  // Vouchers
  | 'vouchers:read'
  | 'vouchers:write'
  | 'vouchers:delete'
  // Bills
  | 'bills:read'
  | 'bills:write'
  | 'bills:delete'
  // Reports
  | 'reports:read'
  | 'reports:export'
  // Stock
  | 'stock:read'
  | 'stock:write'
  // Users
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  // Tenants
  | 'tenants:read'
  | 'tenants:write'
  // System
  | 'system:admin';

/**
 * Role entity.
 * Defines a named collection of permissions within a tenant.
 */
export interface Role {
  /** Unique role identifier */
  id: string;
  /** Tenant this role belongs to */
  tenantId: string;
  /** Role display name */
  roleName: string;
  /** Description of the role's purpose */
  description?: string;
  /** Whether this is a system-defined role (cannot be deleted) */
  isSystemRole: boolean;
  /** Role creation timestamp */
  createdAt: Date;
}

/**
 * User-role assignment.
 * Maps users to roles within a tenant.
 */
export interface UserRole {
  /** User identifier */
  userId: string;
  /** Role identifier */
  roleId: string;
  /** Tenant identifier */
  tenantId: string;
  /** Assignment timestamp */
  assignedAt: Date;
}

/**
 * Role creation payload.
 */
export interface CreateRolePayload {
  tenantId: string;
  roleName: string;
  description?: string;
  permissions: Permission[];
}

/**
 * Permission check result.
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}
