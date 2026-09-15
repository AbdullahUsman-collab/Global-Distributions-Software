-- Migration 012: Add OPENING stock movement type
-- Purpose: Enables opening stock entry via the stock_movements table.
-- OPENING is a batch-set operation: creates/sets stock_levels per product/warehouse.
-- Follows the same CREATE→POST pattern as GRN but is semantically distinct.

-- 1. Extend the CHECK constraint to allow 'OPENING'
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN ('GRN', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'OPENING'));

-- 2. Add an index for filtering opening movements specifically
CREATE INDEX IF NOT EXISTS idx_stock_movements_opening
  ON stock_movements(tenant_id, movement_type)
  WHERE movement_type = 'OPENING';
