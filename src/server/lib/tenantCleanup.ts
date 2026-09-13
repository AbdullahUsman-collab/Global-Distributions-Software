/**
 * Safe Tenant Deletion Utility
 *
 * Deletes a tenant and ALL its child data in correct FK order.
 * Uses manual deletion (no CASCADE on tenants table).
 *
 * RULE: Only call for confirmed demo/test tenants.
 * RULE: system-000 must NEVER be deleted.
 * RULE: Deletion is irreversible.
 */

import { query } from '../db/pool.js';

/**
 * Delete a tenant and all its child data.
 * Deletion order respects FK dependencies.
 * Returns counts of deleted rows per table.
 */
export async function deleteTenantCompletely(tenantId: string): Promise<Record<string, number>> {
  if (tenantId === 'system-000') {
    throw new Error('REFUSING to delete system-000 tenant. This is infrastructure.');
  }

  const counts: Record<string, number> = {};

  // Step 1: Sessions (references users, tenants)
  const sessions = await query('DELETE FROM sessions WHERE tenant_id = $1', [tenantId]);
  counts.sessions = sessions.rowCount ?? 0;

  // Step 2: user_brand_access (CASCADE on both user_id and tenant_id)
  const uba = await query('DELETE FROM user_brand_access WHERE tenant_id = $1', [tenantId]);
  counts.user_brand_access = uba.rowCount ?? 0;

  // Step 3: ledger_entries (references voucher_lines, vouchers)
  const ledger = await query('DELETE FROM ledger_entries WHERE tenant_id = $1', [tenantId]);
  counts.ledger_entries = ledger.rowCount ?? 0;

  // Step 4: voucher_lines (CASCADE on voucher_id, references accounts)
  const vlines = await query('DELETE FROM voucher_lines WHERE tenant_id = $1', [tenantId]);
  counts.voucher_lines = vlines.rowCount ?? 0;

  // Step 5: vouchers (references tenants)
  const vouchers = await query('DELETE FROM vouchers WHERE tenant_id = $1', [tenantId]);
  counts.vouchers = vouchers.rowCount ?? 0;

  // Step 6: stock_movements (references products, warehouses)
  const movements = await query('DELETE FROM stock_movements WHERE tenant_id = $1', [tenantId]);
  counts.stock_movements = movements.rowCount ?? 0;

  // Step 7: stock_levels (references products, warehouses)
  const levels = await query('DELETE FROM stock_levels WHERE tenant_id = $1', [tenantId]);
  counts.stock_levels = levels.rowCount ?? 0;

  // Step 8: warehouse_locations (references warehouses)
  const locations = await query('DELETE FROM warehouse_locations WHERE tenant_id = $1', [tenantId]);
  counts.warehouse_locations = locations.rowCount ?? 0;

  // Step 9: warehouses (references tenants)
  const warehouses = await query('DELETE FROM warehouses WHERE tenant_id = $1', [tenantId]);
  counts.warehouses = warehouses.rowCount ?? 0;

  // Step 10: customers (references accounts)
  const customers = await query('DELETE FROM customers WHERE tenant_id = $1', [tenantId]);
  counts.customers = customers.rowCount ?? 0;

  // Step 11: suppliers (references accounts)
  const suppliers = await query('DELETE FROM suppliers WHERE tenant_id = $1', [tenantId]);
  counts.suppliers = suppliers.rowCount ?? 0;

  // Step 12: products (references tenants)
  const products = await query('DELETE FROM products WHERE tenant_id = $1', [tenantId]);
  counts.products = products.rowCount ?? 0;

  // Step 13: accounts (references tenants)
  const accounts = await query('DELETE FROM accounts WHERE tenant_id = $1', [tenantId]);
  counts.accounts = accounts.rowCount ?? 0;

  // Step 14: tenant_settings (PK is FK to tenants)
  const settings = await query('DELETE FROM tenant_settings WHERE tenant_id = $1', [tenantId]);
  counts.tenant_settings = settings.rowCount ?? 0;

  // Step 15: user_credentials (references users, tenants)
  const creds = await query('DELETE FROM user_credentials WHERE tenant_id = $1', [tenantId]);
  counts.user_credentials = creds.rowCount ?? 0;

  // Step 16: users (references tenants)
  const users = await query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
  counts.users = users.rowCount ?? 0;

  // Step 17: the tenant itself
  const tenants = await query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  counts.tenants = tenants.rowCount ?? 0;

  return counts;
}

/**
 * Deactivate a tenant (soft delete).
 * Sets is_active = false and deactivates all user_brand_access.
 */
export async function deactivateTenant(tenantId: string): Promise<void> {
  if (tenantId === 'system-000') {
    throw new Error('REFUSING to deactivate system-000 tenant.');
  }

  await query('UPDATE tenants SET is_active = false, updated_at = NOW() WHERE id = $1', [tenantId]);
  await query('UPDATE user_brand_access SET is_active = false, updated_at = NOW() WHERE tenant_id = $1', [tenantId]);
}
