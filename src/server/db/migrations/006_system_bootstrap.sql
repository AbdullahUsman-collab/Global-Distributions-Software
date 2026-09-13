-- Migration 006: System Bootstrap Infrastructure
-- Date: 2026-09-13
-- Purpose: Enable zero-brand bootstrap for initial system setup
-- RULE: System tenant is NOT a brand - it's a system administration context
-- RULE: Bootstrap login only works when zero non-system brands exist

-- ============================================================
-- SYSTEM TENANT
-- Special tenant for system administration (not a brand)
-- ============================================================

INSERT INTO tenants (id, slug, brand_name, logo_url, primary_color, accent_color, is_active)
VALUES (
  'system-000',
  'system',
  'System Administration',
  '',
  '#6366f1',
  '#4f46e5',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SYSTEM ADMIN USER
-- Initial admin user for bootstrap (no brand association)
-- ============================================================

INSERT INTO users (id, tenant_id, username, display_name, role, is_active)
VALUES (
  'user-system-admin-000',
  'system-000',
  'sysadmin',
  'System Administrator',
  'ADMIN',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SYSTEM ADMIN CREDENTIALS
-- Password will be set during first bootstrap login
-- Using a placeholder hash that will be replaced
-- ============================================================

-- Password hash for 'changeme123' (will be updated during bootstrap)
INSERT INTO user_credentials (user_id, tenant_id, password_hash, algo)
VALUES (
  'user-system-admin-000',
  'system-000',
  '$2b$12$LJ3m4ys3Lk0TSwMCPNEPluAINoB6YR4.uSG3.yIxDt6TFb2.Vz4ze',
  'bcrypt'
) ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- SYSTEM ADMIN BRAND ACCESS
-- System admin has access to system tenant
-- ============================================================

INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active)
VALUES (
  'uba-system-admin-000',
  'user-system-admin-000',
  'system-000',
  'ADMIN',
  true
) ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ============================================================
-- SEED DATA CLEANUP
-- Remove demo tenants, users, and credentials for production
-- This ensures a clean slate for bootstrap
-- ============================================================

-- Note: Demo data cleanup is handled by the application logic
-- This migration only adds the system bootstrap infrastructure
