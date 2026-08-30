-- Distribution Software ERP — Database Schema
-- Version: 001_initial
-- Date: 2026-08-30
--
-- RULE: Every tenant-owned table has tenant_id with index.
-- RULE: Foreign keys enforce data integrity.
-- RULE: cost_rate / COGS formula is UNKNOWN — do not add columns for it.
-- RULE: Do not modify accounting sign conventions.

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS
-- ============================================================

CREATE TABLE tenants (
  id VARCHAR(128) PRIMARY KEY,
  slug VARCHAR(128) UNIQUE NOT NULL,
  brand_name VARCHAR(256) NOT NULL,
  logo_url VARCHAR(512),
  primary_color VARCHAR(32) DEFAULT '#3b82f6',
  accent_color VARCHAR(32) DEFAULT '#1e40af',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  username VARCHAR(256) NOT NULL,
  display_name VARCHAR(256) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'PURCHASE', 'VIEWER')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, username)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_username ON users(tenant_id, username);

-- ============================================================
-- USER CREDENTIALS (isolated boundary)
-- ============================================================

CREATE TABLE user_credentials (
  user_id VARCHAR(128) PRIMARY KEY REFERENCES users(id),
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  password_hash VARCHAR(256) NOT NULL,
  algo VARCHAR(32) DEFAULT 'bcrypt',
  salt VARCHAR(256),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_credentials_tenant ON user_credentials(tenant_id);

-- ============================================================
-- SESSIONS
-- ============================================================

CREATE TABLE sessions (
  id VARCHAR(128) PRIMARY KEY,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id),
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================
-- TENANT SETTINGS
-- ============================================================

CREATE TABLE tenant_settings (
  tenant_id VARCHAR(128) PRIMARY KEY REFERENCES tenants(id),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHART OF ACCOUNTS
-- ============================================================

CREATE TABLE accounts (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  account_code VARCHAR(32) NOT NULL,
  account_name VARCHAR(256) NOT NULL,
  parent_id VARCHAR(128),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  account_type VARCHAR(32) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE')),
  normal_balance VARCHAR(8) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
  is_posting BOOLEAN DEFAULT false,
  is_summary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  control_category VARCHAR(32),
  legacy_main_head_no INTEGER,
  account_effect VARCHAR(64),
  address TEXT,
  owner_name VARCHAR(256),
  phone VARCHAR(64),
  stn VARCHAR(64),
  ntn VARCHAR(64),
  cnic VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, account_code)
);

CREATE INDEX idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX idx_accounts_code ON accounts(tenant_id, account_code);
CREATE INDEX idx_accounts_parent ON accounts(tenant_id, parent_id);
CREATE INDEX idx_accounts_type ON accounts(tenant_id, account_type);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  account_head_id VARCHAR(128) REFERENCES accounts(id),
  name VARCHAR(256) NOT NULL,
  address TEXT,
  owner_name VARCHAR(256),
  phone VARCHAR(64),
  stn VARCHAR(64),
  ntn VARCHAR(64),
  cnic VARCHAR(64),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_account_head ON customers(tenant_id, account_head_id);
CREATE INDEX idx_customers_name ON customers(tenant_id, name);

-- ============================================================
-- SUPPLIERS
-- ============================================================

CREATE TABLE suppliers (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  name VARCHAR(256) NOT NULL,
  contact_person VARCHAR(256),
  phone VARCHAR(64),
  email VARCHAR(256),
  address TEXT,
  city VARCHAR(128),
  account_head_id VARCHAR(128) REFERENCES accounts(id),
  tax_registration_number VARCHAR(128),
  payment_terms VARCHAR(32),
  credit_limit DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX idx_suppliers_account_head ON suppliers(tenant_id, account_head_id);
CREATE INDEX idx_suppliers_name ON suppliers(tenant_id, name);

-- ============================================================
-- PRODUCTS
-- ============================================================

CREATE TABLE products (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  sku VARCHAR(64) NOT NULL,
  name VARCHAR(256) NOT NULL,
  category VARCHAR(128),
  unit VARCHAR(32) DEFAULT 'PCS',
  pcs_per_carton INTEGER DEFAULT 1,
  sale_rate DECIMAL(15,4) DEFAULT 0,
  purchase_rate DECIMAL(15,4) DEFAULT 0,
  retail_price DECIMAL(15,4) DEFAULT 0,
  trade_discount DECIMAL(5,2) DEFAULT 0,
  trade_offer TEXT,
  min_quantity DECIMAL(15,4) DEFAULT 0,
  hs_code VARCHAR(64),
  gst_type VARCHAR(16) DEFAULT 'VAT',
  gst_percent DECIMAL(5,2) DEFAULT 0,
  fed_percent DECIMAL(5,2) DEFAULT 0,
  advance_tax_sale_percent DECIMAL(5,2) DEFAULT 0,
  advance_tax_purchase_percent DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);

CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_sku ON products(tenant_id, sku);

-- ============================================================
-- WAREHOUSES
-- ============================================================

CREATE TABLE warehouses (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  name VARCHAR(256) NOT NULL,
  code VARCHAR(32) NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX idx_warehouses_tenant_id ON warehouses(tenant_id);

-- ============================================================
-- WAREHOUSE LOCATIONS
-- ============================================================

CREATE TABLE warehouse_locations (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  warehouse_id VARCHAR(128) NOT NULL REFERENCES warehouses(id),
  name VARCHAR(256) NOT NULL,
  code VARCHAR(32) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, code)
);

CREATE INDEX idx_locations_tenant ON warehouse_locations(tenant_id);
CREATE INDEX idx_locations_warehouse ON warehouse_locations(warehouse_id);

-- ============================================================
-- VOUCHERS
-- ============================================================

CREATE TABLE vouchers (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  voucher_number INTEGER NOT NULL,
  voucher_type VARCHAR(8) NOT NULL CHECK (voucher_type IN ('JV', 'CV', 'CP', 'CR', 'PV', 'SV', 'SRV', 'PRV', 'CPV', 'CRV', 'BPV', 'BRV')),
  status VARCHAR(8) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED')),
  date DATE NOT NULL,
  narration TEXT,
  created_by VARCHAR(256) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, voucher_number)
);

CREATE INDEX idx_vouchers_tenant_id ON vouchers(tenant_id);
CREATE INDEX idx_vouchers_type ON vouchers(tenant_id, voucher_type);
CREATE INDEX idx_vouchers_status ON vouchers(tenant_id, status);
CREATE INDEX idx_vouchers_date ON vouchers(tenant_id, date);
CREATE INDEX idx_vouchers_created_by ON vouchers(tenant_id, created_by);

-- ============================================================
-- VOUCHER LINES
-- ============================================================

CREATE TABLE voucher_lines (
  id VARCHAR(128) PRIMARY KEY,
  voucher_id VARCHAR(128) NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  account_id VARCHAR(128) NOT NULL REFERENCES accounts(id),
  description TEXT,
  debit DECIMAL(15,4) DEFAULT 0,
  credit DECIMAL(15,4) DEFAULT 0,
  line_order INTEGER NOT NULL,
  contra_account_id VARCHAR(128),
  quantity DECIMAL(15,4),
  product_id VARCHAR(128),
  branch VARCHAR(64),
  st_inv_no VARCHAR(64),
  st_rate DECIMAL(5,2),
  st_amount DECIMAL(15,4),
  amt_excl_std DECIMAL(15,4)
);

CREATE INDEX idx_voucher_lines_voucher ON voucher_lines(voucher_id);
CREATE INDEX idx_voucher_lines_tenant ON voucher_lines(tenant_id);
CREATE INDEX idx_voucher_lines_account ON voucher_lines(tenant_id, account_id);
CREATE INDEX idx_voucher_lines_product ON voucher_lines(tenant_id, product_id);

-- ============================================================
-- LEDGER ENTRIES
-- ============================================================

CREATE TABLE ledger_entries (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  voucher_id VARCHAR(128) NOT NULL REFERENCES vouchers(id),
  voucher_line_id VARCHAR(128) NOT NULL REFERENCES voucher_lines(id),
  account_id VARCHAR(128) NOT NULL,
  debit DECIMAL(15,4) DEFAULT 0,
  credit DECIMAL(15,4) DEFAULT 0,
  entry_date DATE NOT NULL,
  voucher_type VARCHAR(8) NOT NULL,
  voucher_number INTEGER NOT NULL,
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_tenant_id ON ledger_entries(tenant_id);
CREATE INDEX idx_ledger_voucher ON ledger_entries(tenant_id, voucher_id);
CREATE INDEX idx_ledger_account ON ledger_entries(tenant_id, account_id);
CREATE INDEX idx_ledger_date ON ledger_entries(tenant_id, entry_date);

-- ============================================================
-- STOCK LEVELS
-- ============================================================

CREATE TABLE stock_levels (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  product_id VARCHAR(128) NOT NULL REFERENCES products(id),
  warehouse_id VARCHAR(128) NOT NULL REFERENCES warehouses(id),
  quantity_on_hand DECIMAL(15,4) DEFAULT 0,
  quantity_reserved DECIMAL(15,4) DEFAULT 0,
  reorder_level DECIMAL(15,4) DEFAULT 0,
  minimum_stock DECIMAL(15,4) DEFAULT 0,
  maximum_stock DECIMAL(15,4) DEFAULT 0,
  unit_cost DECIMAL(15,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, product_id, warehouse_id)
);

CREATE INDEX idx_stock_levels_tenant ON stock_levels(tenant_id);
CREATE INDEX idx_stock_levels_product ON stock_levels(tenant_id, product_id);
CREATE INDEX idx_stock_levels_warehouse ON stock_levels(tenant_id, warehouse_id);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================

CREATE TABLE stock_movements (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  product_id VARCHAR(128) NOT NULL REFERENCES products(id),
  warehouse_id VARCHAR(128) NOT NULL REFERENCES warehouses(id),
  movement_type VARCHAR(16) NOT NULL CHECK (movement_type IN ('GRN', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'RETURN')),
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
  quantity DECIMAL(15,4) NOT NULL,
  unit_cost DECIMAL(15,4) DEFAULT 0,
  reference_id VARCHAR(128),
  reference_type VARCHAR(32),
  narration TEXT,
  created_by VARCHAR(256) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_tenant ON stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(tenant_id, product_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(tenant_id, warehouse_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(tenant_id, movement_type);
CREATE INDEX idx_stock_movements_reference ON stock_movements(tenant_id, reference_id);

-- ============================================================
-- SEED DATA: Demo Tenants
-- ============================================================

INSERT INTO tenants (id, slug, brand_name, primary_color, accent_color, is_active) VALUES
  ('tenant-demo-wholesale-001', 'demo-wholesale', 'Demo Wholesale', '#3b82f6', '#1e40af', true),
  ('tenant-demo-distribution-002', 'demo-distribution', 'Demo Distribution', '#10b981', '#047857', true),
  ('tenant-apex-trading-003', 'apex-trading', 'Apex Trading', '#8b5cf6', '#6d28d9', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DATA: Demo Users (passwords will be hashed at runtime)
-- ============================================================

INSERT INTO users (id, tenant_id, username, display_name, role, is_active) VALUES
  ('user-admin-001', 'tenant-demo-wholesale-001', 'admin', 'Administrator', 'ADMIN', true),
  ('user-admin-002', 'tenant-demo-distribution-002', 'admin', 'Administrator', 'ADMIN', true),
  ('user-admin-003', 'tenant-apex-trading-003', 'admin', 'Administrator', 'ADMIN', true),
  ('user-manager-001', 'tenant-demo-wholesale-001', 'manager', 'Sales Manager', 'MANAGER', true),
  ('user-clerk-001', 'tenant-demo-wholesale-001', 'clerk', 'Sales Clerk', 'SALES', true),
  ('user-inactive-001', 'tenant-demo-wholesale-001', 'former', 'Former Employee', 'VIEWER', false)
ON CONFLICT (id) DO NOTHING;
