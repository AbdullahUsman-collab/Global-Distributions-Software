-- Migration 008: Remove clearly demo/test tenants
-- Safe: only targets tenants with test/demo/lifecycle slugs
-- Preserves: system-000, apex-trading, demo-distribution, demo-wholesale
-- Idempotent: uses DELETE ... WHERE with slugs, safe to re-run

-- Delete child data in FK order, then the tenant itself.
-- Sessions
DELETE FROM sessions WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- user_brand_access (has CASCADE but explicit is safer)
DELETE FROM user_brand_access WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- ledger_entries
DELETE FROM ledger_entries WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- voucher_lines
DELETE FROM voucher_lines WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- vouchers
DELETE FROM vouchers WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- stock_movements
DELETE FROM stock_movements WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- stock_levels
DELETE FROM stock_levels WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- warehouse_locations
DELETE FROM warehouse_locations WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- warehouses
DELETE FROM warehouses WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- customers
DELETE FROM customers WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- suppliers
DELETE FROM suppliers WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- products
DELETE FROM products WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- accounts
DELETE FROM accounts WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- tenant_settings
DELETE FROM tenant_settings WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- user_credentials
DELETE FROM user_credentials WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- users
DELETE FROM users WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug IN (
    'test123', 'test-brand-step83', 'test-brand-step85'
  ) OR slug LIKE 'test-dup-%'
     OR slug LIKE 'lifecycle-test-%'
     OR slug LIKE 'test-brand-step85-%'
);

-- tenants (the actual deletion)
DELETE FROM tenants WHERE slug IN (
  'test123', 'test-brand-step83', 'test-brand-step85'
) OR slug LIKE 'test-dup-%'
   OR slug LIKE 'lifecycle-test-%'
   OR slug LIKE 'test-brand-step85-%';
