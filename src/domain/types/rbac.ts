/**
 * Role-Based Access Control (RBAC) Domain Types
 * Defines roles, permissions, and access control structures.
 *
 * Permission format: "module:action"
 * Module names match ERP modules (sales, purchases, finance, etc.)
 * Actions: view, create, post, delete, export, manage
 */

/* ─── ERP Permission Constants ────────────────────────────── */

export const Permissions = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Sales
  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_POST: 'sales.post',
  SALES_DELETE: 'sales.delete',

  // Purchases
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_POST: 'purchases.post',
  PURCHASES_DELETE: 'purchases.delete',

  // Returns
  RETURNS_VIEW: 'returns.view',
  RETURNS_CREATE: 'returns.create',
  RETURNS_POST: 'returns.post',
  RETURNS_DELETE: 'returns.delete',

  // Customer Receipts
  RECEIPTS_VIEW: 'receipts.view',
  RECEIPTS_CREATE: 'receipts.create',
  RECEIPTS_POST: 'receipts.post',
  RECEIPTS_DELETE: 'receipts.delete',

  // Cash Book
  CASH_VIEW: 'cash.view',
  CASH_CREATE: 'cash.create',
  CASH_POST: 'cash.post',
  CASH_DELETE: 'cash.delete',

  // Finance
  FINANCE_VIEW: 'finance.view',
  FINANCE_CREATE: 'finance.create',
  FINANCE_POST: 'finance.post',
  FINANCE_DELETE: 'finance.delete',

  // Aging
  AGING_VIEW: 'aging.view',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',

  // Bills
  BILLS_VIEW: 'bills.view',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // Administration
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  TENANT_MANAGE: 'tenant.manage',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

/* ─── Role Definitions ────────────────────────────────────── */

export type SystemRoleName = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'PURCHASE' | 'VIEWER';

/**
 * Role entity.
 * Defines a named collection of permissions within a tenant.
 */
export interface Role {
  id: string;
  tenantId: string;
  roleName: SystemRoleName;
  description?: string;
  isSystemRole: boolean;
  permissions: Permission[];
  createdAt: Date;
}

/**
 * User-role assignment.
 * Maps users to roles within a tenant.
 */
export interface UserRole {
  userId: string;
  roleId: string;
  tenantId: string;
  assignedAt: Date;
}

/**
 * Permission check result.
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/* ─── System Role Definitions ─────────────────────────────── */

export const SYSTEM_ROLES: Record<SystemRoleName, Permission[]> = {
  ADMIN: [
    Permissions.DASHBOARD_VIEW,
    Permissions.SALES_VIEW, Permissions.SALES_CREATE, Permissions.SALES_POST, Permissions.SALES_DELETE,
    Permissions.PURCHASES_VIEW, Permissions.PURCHASES_CREATE, Permissions.PURCHASES_POST, Permissions.PURCHASES_DELETE,
    Permissions.RETURNS_VIEW, Permissions.RETURNS_CREATE, Permissions.RETURNS_POST, Permissions.RETURNS_DELETE,
    Permissions.RECEIPTS_VIEW, Permissions.RECEIPTS_CREATE, Permissions.RECEIPTS_POST, Permissions.RECEIPTS_DELETE,
    Permissions.CASH_VIEW, Permissions.CASH_CREATE, Permissions.CASH_POST, Permissions.CASH_DELETE,
    Permissions.FINANCE_VIEW, Permissions.FINANCE_CREATE, Permissions.FINANCE_POST, Permissions.FINANCE_DELETE,
    Permissions.AGING_VIEW,
    Permissions.INVENTORY_VIEW, Permissions.INVENTORY_ADJUST,
    Permissions.BILLS_VIEW,
    Permissions.REPORTS_VIEW, Permissions.REPORTS_EXPORT,
    Permissions.USERS_MANAGE, Permissions.ROLES_MANAGE, Permissions.TENANT_MANAGE,
  ],
  MANAGER: [
    Permissions.DASHBOARD_VIEW,
    Permissions.SALES_VIEW, Permissions.SALES_CREATE, Permissions.SALES_POST, Permissions.SALES_DELETE,
    Permissions.PURCHASES_VIEW, Permissions.PURCHASES_CREATE, Permissions.PURCHASES_POST, Permissions.PURCHASES_DELETE,
    Permissions.RETURNS_VIEW, Permissions.RETURNS_CREATE, Permissions.RETURNS_POST, Permissions.RETURNS_DELETE,
    Permissions.RECEIPTS_VIEW, Permissions.RECEIPTS_CREATE, Permissions.RECEIPTS_POST, Permissions.RECEIPTS_DELETE,
    Permissions.CASH_VIEW, Permissions.CASH_CREATE, Permissions.CASH_POST, Permissions.CASH_DELETE,
    Permissions.FINANCE_VIEW, Permissions.FINANCE_CREATE, Permissions.FINANCE_POST, Permissions.FINANCE_DELETE,
    Permissions.AGING_VIEW,
    Permissions.INVENTORY_VIEW, Permissions.INVENTORY_ADJUST,
    Permissions.BILLS_VIEW,
    Permissions.REPORTS_VIEW, Permissions.REPORTS_EXPORT,
  ],
  ACCOUNTANT: [
    Permissions.DASHBOARD_VIEW,
    Permissions.SALES_VIEW,
    Permissions.PURCHASES_VIEW,
    Permissions.RETURNS_VIEW,
    Permissions.RECEIPTS_VIEW, Permissions.RECEIPTS_CREATE, Permissions.RECEIPTS_POST, Permissions.RECEIPTS_DELETE,
    Permissions.CASH_VIEW, Permissions.CASH_CREATE, Permissions.CASH_POST, Permissions.CASH_DELETE,
    Permissions.FINANCE_VIEW, Permissions.FINANCE_CREATE, Permissions.FINANCE_POST, Permissions.FINANCE_DELETE,
    Permissions.AGING_VIEW,
    Permissions.INVENTORY_VIEW,
    Permissions.BILLS_VIEW,
    Permissions.REPORTS_VIEW, Permissions.REPORTS_EXPORT,
  ],
  SALES: [
    Permissions.DASHBOARD_VIEW,
    Permissions.SALES_VIEW, Permissions.SALES_CREATE,
    Permissions.RETURNS_VIEW, Permissions.RETURNS_CREATE,
    Permissions.RECEIPTS_VIEW, Permissions.RECEIPTS_CREATE,
    Permissions.AGING_VIEW,
    Permissions.INVENTORY_VIEW,
    Permissions.BILLS_VIEW,
    Permissions.REPORTS_VIEW,
  ],
  PURCHASE: [
    Permissions.DASHBOARD_VIEW,
    Permissions.PURCHASES_VIEW, Permissions.PURCHASES_CREATE,
    Permissions.RETURNS_VIEW, Permissions.RETURNS_CREATE,
    Permissions.CASH_VIEW,
    Permissions.INVENTORY_VIEW,
    Permissions.BILLS_VIEW,
    Permissions.REPORTS_VIEW,
  ],
  VIEWER: [
    Permissions.DASHBOARD_VIEW,
    Permissions.SALES_VIEW,
    Permissions.PURCHASES_VIEW,
    Permissions.RETURNS_VIEW,
    Permissions.RECEIPTS_VIEW,
    Permissions.CASH_VIEW,
    Permissions.FINANCE_VIEW,
    Permissions.AGING_VIEW,
    Permissions.INVENTORY_VIEW,
    Permissions.BILLS_VIEW,
    Permissions.REPORTS_VIEW,
  ],
};

/* ─── Role Creation Payload ───────────────────────────────── */

export interface CreateRolePayload {
  tenantId: string;
  roleName: string;
  description?: string;
  permissions: Permission[];
}
