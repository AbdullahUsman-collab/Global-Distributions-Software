-- Migration 003: Create user_brand_access table
-- Date: 2026-09-06
-- Purpose: Establish multi-brand user ↔ brand authorization infrastructure
-- Source: Step 46B audit, approved Option B architecture
-- RULE: This migration is for FUTURE manual execution only.
-- RULE: Do NOT execute against a live database.
-- RULE: users.tenant_id and users.role remain — this is an additive layer.

CREATE TABLE user_brand_access (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'PURCHASE', 'VIEWER')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_uba_user ON user_brand_access(user_id);
CREATE INDEX idx_uba_tenant ON user_brand_access(tenant_id);
CREATE INDEX idx_uba_user_tenant ON user_brand_access(user_id, tenant_id);
CREATE INDEX idx_uba_active ON user_brand_access(user_id, is_active);

-- ============================================================
-- SEED DATA: Populate from existing users.tenant_id + users.role
-- ============================================================

INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active, created_at, updated_at)
SELECT
  'uba-' || id,
  id,
  tenant_id,
  role,
  is_active,
  created_at,
  updated_at
FROM users
WHERE tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;
