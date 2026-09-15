-- 013_sale_line_overrides.sql
-- Adds per-line product override fields to voucher_lines for sale bill editing.
-- These columns store the item-master values at time of sale, allowing per-line overrides.
-- All columns are nullable — existing rows stay NULL (correct: created before this feature).

ALTER TABLE voucher_lines
  ADD COLUMN rate                    DECIMAL(15,4),
  ADD COLUMN purchase_rate           DECIMAL(15,4),
  ADD COLUMN retail_price            DECIMAL(15,4),
  ADD COLUMN margin_percent          DECIMAL(7,4),
  ADD COLUMN trade_discount_percent  DECIMAL(7,4),
  ADD COLUMN trade_offer_percent     DECIMAL(7,4),
  ADD COLUMN special_discount_percent DECIMAL(7,4),
  ADD COLUMN min_quantity            INTEGER,
  ADD COLUMN hs_code                 VARCHAR(32),
  ADD COLUMN gst_type                VARCHAR(16),
  ADD COLUMN fed_percent             DECIMAL(7,4),
  ADD COLUMN further_tax_percent     DECIMAL(7,4),
  ADD COLUMN advance_tax_percent     DECIMAL(7,4);
