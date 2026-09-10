-- Migration 004: Add cost_rate and margin columns to products table
-- Source: audit/65_LEGACY_COST_RATE_FORMULA_VERIFICATION.md
--
-- OWNER-CONFIRMED COST_RATE FORMULA:
--   Cost_rate = Retail_Price - Purchase_Rate × Margin
--
-- Legacy verification (18 items, all verified):
--   Purchase_Rate=184.90, Retail_Price=203.39, Margin=0.072
--   Cost_rate = 203.39 - 184.90 × 0.072 = 190.0772 ✓
--
-- This migration adds:
--   cost_rate: The calculated cost rate used for COGS and inventory valuation
--   margin: The margin percentage used to calculate cost_rate

-- Idempotent: add cost_rate column only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_rate') THEN
    ALTER TABLE products ADD COLUMN cost_rate DECIMAL(15,6) DEFAULT 0;
  END IF;
END $$;

-- Idempotent: add margin column only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'margin') THEN
    ALTER TABLE products ADD COLUMN margin DECIMAL(8,6) DEFAULT 0;
  END IF;
END $$;

-- Backfill cost_rate from existing data where possible
-- For existing products, set cost_rate = purchaseRate as conservative default
UPDATE products SET cost_rate = purchase_rate WHERE cost_rate = 0 AND purchase_rate > 0;
