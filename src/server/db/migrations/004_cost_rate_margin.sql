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

-- Add cost_rate column (stores the calculated Cost_rate)
ALTER TABLE products ADD COLUMN cost_rate DECIMAL(15,6) DEFAULT 0;

-- Add margin column (stores the margin percentage, e.g., 0.072 for 7.2%)
ALTER TABLE products ADD COLUMN margin DECIMAL(8,6) DEFAULT 0;

-- Backfill cost_rate from existing data where possible
-- For existing products, calculate cost_rate using the formula
-- Cost_rate = Retail_Price - Purchase_Rate × Margin
-- Since we don't know the legacy margin, set to purchaseRate as conservative default
UPDATE products SET cost_rate = purchase_rate WHERE cost_rate = 0 AND purchase_rate > 0;
