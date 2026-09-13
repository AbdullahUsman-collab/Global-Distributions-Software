"use strict";
/**
 * Role-Based Access Control (RBAC) Domain Types
 * Defines roles, permissions, and access control structures.
 *
 * Permission format: "module:action"
 * Module names match ERP modules (sales, purchases, finance, etc.)
 * Actions: view, create, post, delete, export, manage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_ROLES = exports.Permissions = void 0;
/* ─── ERP Permission Constants ────────────────────────────── */
exports.Permissions = {
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
};
/* ─── System Role Definitions ─────────────────────────────── */
exports.SYSTEM_ROLES = {
    ADMIN: [
        exports.Permissions.DASHBOARD_VIEW,
        exports.Permissions.SALES_VIEW, exports.Permissions.SALES_CREATE, exports.Permissions.SALES_POST, exports.Permissions.SALES_DELETE,
        exports.Permissions.PURCHASES_VIEW, exports.Permissions.PURCHASES_CREATE, exports.Permissions.PURCHASES_POST, exports.Permissions.PURCHASES_DELETE,
        exports.Permissions.RETURNS_VIEW, exports.Permissions.RETURNS_CREATE, exports.Permissions.RETURNS_POST, exports.Permissions.RETURNS_DELETE,
        exports.Permissions.RECEIPTS_VIEW, exports.Permissions.RECEIPTS_CREATE, exports.Permissions.RECEIPTS_POST, exports.Permissions.RECEIPTS_DELETE,
        exports.Permissions.CASH_VIEW, exports.Permissions.CASH_CREATE, exports.Permissions.CASH_POST, exports.Permissions.CASH_DELETE,
        exports.Permissions.FINANCE_VIEW, exports.Permissions.FINANCE_CREATE, exports.Permissions.FINANCE_POST, exports.Permissions.FINANCE_DELETE,
        exports.Permissions.AGING_VIEW,
        exports.Permissions.INVENTORY_VIEW, exports.Permissions.INVENTORY_ADJUST,
        exports.Permissions.BILLS_VIEW,
        exports.Permissions.REPORTS_VIEW, exports.Permissions.REPORTS_EXPORT,
        exports.Permissions.USERS_MANAGE, exports.Permissions.ROLES_MANAGE, exports.Permissions.TENANT_MANAGE,
    ],
    MANAGER: [
        exports.Permissions.DASHBOARD_VIEW,
        exports.Permissions.SALES_VIEW, exports.Permissions.SALES_CREATE, exports.Permissions.SALES_POST, exports.Permissions.SALES_DELETE,
        exports.Permissions.PURCHASES_VIEW, exports.Permissions.PURCHASES_CREATE, exports.Permissions.PURCHASES_POST, exports.Permissions.PURCHASES_DELETE,
        exports.Permissions.RETURNS_VIEW, exports.Permissions.RETURNS_CREATE, exports.Permissions.RETURNS_POST, exports.Permissions.RETURNS_DELETE,
        exports.Permissions.RECEIPTS_VIEW, exports.Permissions.RECEIPTS_CREATE, exports.Permissions.RECEIPTS_POST, exports.Permissions.RECEIPTS_DELETE,
        exports.Permissions.CASH_VIEW, exports.Permissions.CASH_CREATE, exports.Permissions.CASH_POST, exports.Permissions.CASH_DELETE,
        exports.Permissions.FINANCE_VIEW, exports.Permissions.FINANCE_CREATE, exports.Permissions.FINANCE_POST, exports.Permissions.FINANCE_DELETE,
        exports.Permissions.AGING_VIEW,
        exports.Permissions.INVENTORY_VIEW, exports.Permissions.INVENTORY_ADJUST,
        exports.Permissions.BILLS_VIEW,
        exports.Permissions.REPORTS_VIEW, exports.Permissions.REPORTS_EXPORT,
    ],
    ACCOUNTANT: [
        exports.Permissions.DASHBOARD_VIEW,
        exports.Permissions.SALES_VIEW,
        exports.Permissions.PURCHASES_VIEW,
        exports.Permissions.RETURNS_VIEW,
        exports.Permissions.RECEIPTS_VIEW, exports.Permissions.RECEIPTS_CREATE, exports.Permissions.RECEIPTS_POST, exports.Permissions.RECEIPTS_DELETE,
        exports.Permissions.CASH_VIEW, exports.Permissions.CASH_CREATE, exports.Permissions.CASH_POST, exports.Permissions.CASH_DELETE,
        exports.Permissions.FINANCE_VIEW, exports.Permissions.FINANCE_CREATE, exports.Permissions.FINANCE_POST, exports.Permissions.FINANCE_DELETE,
        exports.Permissions.AGING_VIEW,
        exports.Permissions.INVENTORY_VIEW,
        exports.Permissions.BILLS_VIEW,
        exports.Permissions.REPORTS_VIEW, exports.Permissions.REPORTS_EXPORT,
    ],
    SALES: [
        exports.Permissions.DASHBOARD_VIEW,
        exports.Permissions.SALES_VIEW, exports.Permissions.SALES_CREATE,
        exports.Permissions.RETURNS_VIEW, exports.Permissions.RETURNS_CREATE,
        exports.Permissions.RECEIPTS_VIEW, exports.Permissions.RECEIPTS_CREATE,
        exports.Permissions.AGING_VIEW,
        exports.Permissions.INVENTORY_VIEW,
        exports.Permissions.BILLS_VIEW,
        exports.Permissions.REPORTS_VIEW,
    ],
    PURCHASE: [
        exports.Permissions.DASHBOARD_VIEW,
        exports.Permissions.PURCHASES_VIEW, exports.Permissions.PURCHASES_CREATE,
        exports.Permissions.RETURNS_VIEW, exports.Permissions.RETURNS_CREATE,
        exports.Permissions.CASH_VIEW,
        exports.Permissions.INVENTORY_VIEW,
        exports.Permissions.BILLS_VIEW,
        exports.Permissions.REPORTS_VIEW,
    ],
    VIEWER: [
        exports.Permissions.DASHBOARD_VIEW,
        exports.Permissions.SALES_VIEW,
        exports.Permissions.PURCHASES_VIEW,
        exports.Permissions.RETURNS_VIEW,
        exports.Permissions.RECEIPTS_VIEW,
        exports.Permissions.CASH_VIEW,
        exports.Permissions.FINANCE_VIEW,
        exports.Permissions.AGING_VIEW,
        exports.Permissions.INVENTORY_VIEW,
        exports.Permissions.BILLS_VIEW,
        exports.Permissions.REPORTS_VIEW,
    ],
};
