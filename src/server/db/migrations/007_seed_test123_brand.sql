-- Migration 007: Seed Default Bootstrap Brand "test123"
-- Date: 2026-09-13
-- Purpose: Ensure a real bootstrap brand exists for initial setup
-- RULE: Idempotent — uses ON CONFLICT DO NOTHING

-- ============================================================
-- DEFAULT BOOTSTRAP BRAND
-- Created during initial system setup or via migration
-- ============================================================

INSERT INTO tenants (id, slug, brand_name, logo_url, primary_color, accent_color, is_active)
VALUES (
  'tenant-test123-001',
  'test123',
  'test123',
  '',
  '#3b82f6',
  '#1e40af',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ADMIN USER FOR test123 BRAND
-- Default admin user for the bootstrap brand
-- ============================================================

INSERT INTO users (id, tenant_id, username, display_name, role, is_active)
VALUES (
  'user-admin-test123-001',
  'tenant-test123-001',
  'admin',
  'Brand Administrator',
  'ADMIN',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ADMIN CREDENTIALS
-- Password hash for 'admin123'
-- ============================================================

INSERT INTO user_credentials (user_id, tenant_id, password_hash, algo)
VALUES (
  'user-admin-test123-001',
  'tenant-test123-001',
  '$2b$12$LJ3m4ys3Lk0TSwMCPNEPluAINoB6YR4.uSG3.yIxDt6TFb2.Vz4ze',
  'bcrypt'
) ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- ADMIN BRAND ACCESS
-- Admin user has access to the test123 brand
-- ============================================================

INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active)
VALUES (
  'uba-admin-test123-001',
  'user-admin-test123-001',
  'tenant-test123-001',
  'ADMIN',
  true
) ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ============================================================
-- SYSTEM ADMIN BRAND ACCESS
-- System admin also has access to the test123 brand
-- ============================================================

INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active)
VALUES (
  'uba-sysadmin-test123-001',
  'user-system-admin-000',
  'tenant-test123-001',
  'ADMIN',
  true
) ON CONFLICT (user_id, tenant_id) DO NOTHING;
