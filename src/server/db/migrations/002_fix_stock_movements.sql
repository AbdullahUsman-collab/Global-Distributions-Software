-- Migration 002: Fix stock_movements dual-warehouse schema
-- Date: 2026-09-06
-- Purpose: Rename warehouse_id → from_warehouse_id, add to_warehouse_id
-- Source: Step 46A audit, Step 46B confirmation
-- RULE: This migration is for FUTURE manual execution only.
-- RULE: Do NOT execute against a live database.

-- Rename existing column
ALTER TABLE stock_movements RENAME COLUMN warehouse_id TO from_warehouse_id;

-- Add destination warehouse column (nullable — transfers use both, others use one)
ALTER TABLE stock_movements ADD COLUMN to_warehouse_id VARCHAR(128) REFERENCES warehouses(id);

-- Recreate indexes (drop old, create new)
DROP INDEX IF EXISTS idx_stock_movements_warehouse;
CREATE INDEX idx_stock_movements_from_warehouse ON stock_movements(tenant_id, from_warehouse_id);
CREATE INDEX idx_stock_movements_to_warehouse ON stock_movements(tenant_id, to_warehouse_id);
