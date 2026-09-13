-- Migration 009: Add missing legacy main head to apex-trading COA
--
-- Legacy ERP Main Heads extraction (2026-09-13):
-- 10 of 10 legacy main heads cross-referenced against seedCOA.ts.
-- 9 already mapped via legacyMainHeadNo field.
-- 1 missing: code 1000 "INTERNATIONAL CONSUMER PRODUCTS" (Balance Sheet).
--
-- This migration adds the missing account to apex-trading ONLY.
-- Uses ON CONFLICT DO NOTHING for idempotency.
-- Does NOT modify seedCOA.ts (applies to single tenant only).
--
-- Tenant: tenant-apex-trading-003

-- Verify apex-trading tenant exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = 'tenant-apex-trading-003') THEN
    RAISE EXCEPTION 'Tenant tenant-apex-trading-003 not found';
  END IF;
END $$;

-- Add missing legacy main head: INTERNATIONAL CONSUMER PRODUCTS
-- Level 2 under Assets (10000), Balance Sheet effect
INSERT INTO accounts (
  id, tenant_id, account_code, account_name, parent_id, level,
  account_type, normal_balance, is_posting, is_summary, is_active,
  control_category, legacy_main_head_no, account_effect
) VALUES (
  'acct-tenant-apex-trading-003-1000',
  'tenant-apex-trading-003',
  '1000',
  'INTERNATIONAL CONSUMER PRODUCTS',
  'acct-tenant-apex-trading-003-10000',  -- parent: Assets (10000)
  2,
  'ASSET',
  'DEBIT',
  false,   -- is_summary (level 2, not posting)
  true,    -- is_summary
  true,    -- is_active
  NULL,    -- control_category (group head, not posting)
  1000,    -- legacy_main_head_no
  'Balance Sheet'
)
ON CONFLICT (tenant_id, account_code) DO NOTHING;

-- Verify insertion
SELECT account_code, account_name, level, account_type, legacy_main_head_no
FROM accounts
WHERE tenant_id = 'tenant-apex-trading-003'
  AND account_code = '1000';
