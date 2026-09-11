-- Step 77: Add further_tax_percent column to products table
-- Idempotent: safe to run multiple times

ALTER TABLE products ADD COLUMN IF NOT EXISTS further_tax_percent DECIMAL(5,2) DEFAULT 0;
