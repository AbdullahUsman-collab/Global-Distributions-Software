/**
 * Authorization Service
 * Checks user permissions based on role.
 *
 * RULE: This is a standalone module with no external dependencies.
 * It can be used by any domain service or UI component.
 *
 * RULE: This is a CLIENT-SIDE authorization boundary.
 * In a production system with a real backend, each API endpoint
 * would independently verify authorization server-side.
 */

import { SystemRoleName, Permission, Permissions, SYSTEM_ROLES } from '../types/rbac';

export { Permissions } from '../types/rbac';
export type { Permission } from '../types/rbac';

/**
 * Result of an authorization check.
 */
export interface AuthorizationResult {
  allowed: boolean;
  error?: string;
}

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: SystemRoleName, permission: Permission): boolean {
  const rolePermissions = SYSTEM_ROLES[role];
  if (!rolePermissions) {
    return false;
  }
  return rolePermissions.includes(permission);
}

/**
 * Require a specific permission. Throws if not authorized.
 * Use this at the start of mutation methods.
 */
export function requirePermission(role: SystemRoleName, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const roleName = role;
    throw new Error(
      `Unauthorized: role "${roleName}" does not have permission "${permission}".`
    );
  }
}

/**
 * Check multiple permissions (user must have ALL).
 */
export function hasAllPermissions(role: SystemRoleName, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Check if user can perform a mutation operation on a module.
 * Maps CRUD operations to permissions.
 */
export function canCreate(role: SystemRoleName, module: string): boolean {
  const perm = `${module}.create` as Permission;
  return hasPermission(role, perm);
}

export function canPost(role: SystemRoleName, module: string): boolean {
  const perm = `${module}.post` as Permission;
  return hasPermission(role, perm);
}

export function canDelete(role: SystemRoleName, module: string): boolean {
  const perm = `${module}.delete` as Permission;
  return hasPermission(role, perm);
}

export function canView(role: SystemRoleName, module: string): boolean {
  const perm = `${module}.view` as Permission;
  return hasPermission(role, perm);
}

export function canExport(role: SystemRoleName, module: string): boolean {
  const perm = `${module}.export` as Permission;
  return hasPermission(role, perm);
}
