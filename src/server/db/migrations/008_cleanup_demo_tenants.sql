-- Migration 008: Remove demo tenants
-- Targets: demo-distribution, demo-wholesale
-- Preserves: system-000, apex-trading
-- Idempotent: safe to re-run

-- Delete child data in FK order, then the tenant itself.

-- Sessions
DELETE FROM sessions WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- user_brand_access (has CASCADE but explicit is safer)
DELETE FROM user_brand_access WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- ledger_entries
DELETE FROM ledger_entries WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- voucher_lines
DELETE FROM voucher_lines WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- vouchers
DELETE FROM vouchers WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- stock_movements
DELETE FROM stock_movements WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- stock_levels
DELETE FROM stock_levels WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- warehouse_locations
DELETE FROM warehouse_locations WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- warehouses
DELETE FROM warehouses WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- customers
DELETE FROM customers WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- suppliers
DELETE FROM suppliers WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- products
DELETE FROM products WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- accounts
DELETE FROM accounts WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- tenant_settings
DELETE FROM tenant_settings WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- user_credentials
DELETE FROM user_credentials WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- users
DELETE FROM users WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale')
);

-- tenants (the actual deletion)
DELETE FROM tenants WHERE slug IN ('demo-distribution', 'demo-wholesale');
