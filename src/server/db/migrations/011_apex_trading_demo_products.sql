-- Migration 011: Import demo products from legacy ERP
-- Extracted from http://38.92.47.89:8026/Items.aspx (Administrator / MC1234)
-- 142 items across 9 categories: Powder, Lotion, Gift Box, Shampoo, Pouch, Soap, OIL, Wipes, NEW SKUs
--
-- LEGACY DATA NOTES:
--   - Sale_Rate and Purchase_Rate are IDENTICAL in legacy (wholesale = cost, no markup captured)
--   - Cost_rate = Retail_Price * 1.055 (includes 18% GST in the rate)
--   - Trade_Disc, Trade_Offer, Min_Qty are all 0 in legacy
--   - HS_Code is empty/blank for all items
--   - FED, Further_Tax, Advance_Tax are all 0
--   - Item_MainHeadNo maps to category (1=Powder, 50=Lotion, etc.)
--   - Units column is always '1' in legacy (not meaningful); defaulting to 'PCS'
--
-- Tenant: apex-trading (tenant-apex-trading-003)
-- SKUs: Legacy Item_No values (sequential per category, globally unique)

BEGIN;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-201',
  'tenant-apex-trading-003',
  '201',
  'BABY SOAP PINK 80 GM',
  'Soap',
  'PCS',
  144,
  154.08,
  154.08,
  169.49,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  158.3946,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-202',
  'tenant-apex-trading-003',
  '202',
  'BABY SOAP WHITE 80 GM',
  'Soap',
  'PCS',
  144,
  154.08,
  154.08,
  169.49,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  158.3946,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-203',
  'tenant-apex-trading-003',
  '203',
  'BABY SOAP BLUE 100 GM',
  'Soap',
  'PCS',
  144,
  184.9,
  184.9,
  203.39,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  190.0772,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-204',
  'tenant-apex-trading-003',
  '204',
  'BABY SOAP GREEN 100 GM',
  'Soap',
  'PCS',
  144,
  184.9,
  184.9,
  203.39,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  190.0772,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-205',
  'tenant-apex-trading-003',
  '205',
  'BABY SOAP PURPLE 100 GM',
  'Soap',
  'PCS',
  144,
  184.9,
  184.9,
  203.39,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  190.0772,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-206',
  'tenant-apex-trading-003',
  '206',
  'BABY SOAP WHITE 100 GM',
  'Soap',
  'PCS',
  144,
  184.9,
  184.9,
  203.39,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  190.0772,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-207',
  'tenant-apex-trading-003',
  '207',
  'MC SOAP MOISTURIZING LOTION PINK NEW',
  'Soap',
  'PCS',
  144,
  173.34,
  173.34,
  190.68,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  178.1946,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-208',
  'tenant-apex-trading-003',
  '208',
  'MC SOAP N&amp;M WHITE 90 GM NEW',
  'Soap',
  'PCS',
  144,
  173.34,
  173.34,
  190.68,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  178.1946,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-51',
  'tenant-apex-trading-003',
  '51',
  'Baby Lotion Pink 60 ml',
  'Lotion',
  'PCS',
  96,
  250.39,
  250.39,
  275.42,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  257.3993,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-52',
  'tenant-apex-trading-003',
  '52',
  'BABY LOTION FRENCH BARRIES 60 ML',
  'Lotion',
  'PCS',
  96,
  250.39,
  250.39,
  275.42,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  257.3993,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-53',
  'tenant-apex-trading-003',
  '53',
  'Go Rash Lotion 215ml',
  'Lotion',
  'PCS',
  48,
  481.51,
  481.51,
  529.66,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  494.9921,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-54',
  'tenant-apex-trading-003',
  '54',
  'Baby Lotion Pink 115 ML',
  'Lotion',
  'PCS',
  72,
  346.69,
  346.69,
  381.36,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  356.3975,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-55',
  'tenant-apex-trading-003',
  '55',
  'FRENCH LOTION 115 ML',
  'Lotion',
  'PCS',
  72,
  346.69,
  346.69,
  381.36,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  356.3975,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-56',
  'tenant-apex-trading-003',
  '56',
  'Baby Lotion Pink 215 ML',
  'Lotion',
  'PCS',
  48,
  462.25,
  462.25,
  508.47,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  475.1921,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-57',
  'tenant-apex-trading-003',
  '57',
  'FRENCH LOTION 215 ML',
  'Lotion',
  'PCS',
  48,
  462.25,
  462.25,
  508.47,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  475.1921,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-58',
  'tenant-apex-trading-003',
  '58',
  'BABY LOTION 300 ML',
  'Lotion',
  'PCS',
  36,
  539.29,
  539.29,
  593.22,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  554.3903,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-59',
  'tenant-apex-trading-003',
  '59',
  'FRENCH LOTION 300 ML',
  'Lotion',
  'PCS',
  36,
  539.29,
  539.29,
  593.22,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  554.3903,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-60',
  'tenant-apex-trading-003',
  '60',
  'GO RASH CREAM 30 GM',
  'Lotion',
  'PCS',
  144,
  169.49,
  169.49,
  186.44,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  174.2359,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-61',
  'tenant-apex-trading-003',
  '61',
  'MC GO RASH CREAM 60 GM',
  'Lotion',
  'PCS',
  96,
  216.62,
  250.39,
  275.42,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  257.3993,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-62',
  'tenant-apex-trading-003',
  '62',
  'SUN BLOCK 75 GM',
  'Lotion',
  'PCS',
  96,
  250.39,
  423.73,
  275.42,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  421.0337,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-63',
  'tenant-apex-trading-003',
  '63',
  'Mosquit Repellent Lotion 115ml',
  'Lotion',
  'PCS',
  72,
  231.12,
  231.12,
  254.24,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  226.3589,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-64',
  'tenant-apex-trading-003',
  '64',
  'Baby Jelly 100gm',
  'Lotion',
  'PCS',
  96,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-65',
  'tenant-apex-trading-003',
  '65',
  'MC LOTION PINK 100 ML NEW',
  'Lotion',
  'PCS',
  72,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-66',
  'tenant-apex-trading-003',
  '66',
  'MC LOTION PINK 200 ML NEW',
  'Lotion',
  'PCS',
  48,
  546.75,
  546.75,
  593.22,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  560.5821,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-67',
  'tenant-apex-trading-003',
  '67',
  'MC LOTION PINK 300 ML NEW',
  'Lotion',
  'PCS',
  36,
  663.91,
  663.91,
  720.34,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  680.7065,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-68',
  'tenant-apex-trading-003',
  '68',
  'MC LOTION FRENCH 200 ML NEW',
  'Lotion',
  'PCS',
  48,
  546.75,
  546.75,
  593.22,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  560.5821,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-69',
  'tenant-apex-trading-003',
  '69',
  'BABY LOTION PINK 60 ML NEW',
  'Lotion',
  'PCS',
  96,
  272.12,
  272.12,
  296.61,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  279.2494,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-70',
  'tenant-apex-trading-003',
  '70',
  'BABY LOTION FRENCH 100 ML NEW',
  'Lotion',
  'PCS',
  72,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-71',
  'tenant-apex-trading-003',
  '71',
  'MC LOTION FRENCH 60 ML NEW',
  'Lotion',
  'PCS',
  96,
  272.12,
  272.12,
  296.61,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  279.2494,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-72',
  'tenant-apex-trading-003',
  '72',
  'GO RASH CREAM 65 GM NEW',
  'Lotion',
  'PCS',
  96,
  288.91,
  288.91,
  317.8,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  296.9993,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-73',
  'tenant-apex-trading-003',
  '73',
  'MC LOTION FRENCH 300 ML NEW',
  'Lotion',
  'PCS',
  36,
  663.91,
  663.91,
  720.34,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  680.7065,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-74',
  'tenant-apex-trading-003',
  '74',
  'Mosquit Repellent Lotion 115ml NEW',
  'Lotion',
  'PCS',
  72,
  269.65,
  269.65,
  296.61,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  264.0952,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-75',
  'tenant-apex-trading-003',
  '75',
  'MC GO RASH CREAM 30 GM NEW',
  'Lotion',
  'PCS',
  144,
  192.6,
  192.6,
  211.86,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  197.9928,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-301',
  'tenant-apex-trading-003',
  '301',
  'MC SANITARY PADS-(L) 8 PC',
  'Wipes',
  'PCS',
  48,
  192.6,
  192.6,
  211.86,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  188.6324,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-302',
  'tenant-apex-trading-003',
  '302',
  'MC SANITARY PADS V.PACK-(L) 16 PC',
  'Wipes',
  'PCS',
  48,
  331.28,
  331.28,
  364.41,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  324.4556,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-303',
  'tenant-apex-trading-003',
  '303',
  'MC SANITARY PADS-(EL) 7 PC',
  'Wipes',
  'PCS',
  48,
  192.6,
  192.6,
  211.86,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  188.6324,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-304',
  'tenant-apex-trading-003',
  '304',
  'MC SANITARY PADS V.PACK-(EL) 14 PC',
  'Wipes',
  'PCS',
  48,
  331.28,
  331.28,
  364.41,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  324.4556,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-305',
  'tenant-apex-trading-003',
  '305',
  'BABY WIPES PINK 80 PC',
  'Wipes',
  'PCS',
  24,
  261.94,
  261.94,
  288.14,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  256.544,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-306',
  'tenant-apex-trading-003',
  '306',
  'M.C BABY WIPES WHITE CAP 80PC',
  'Wipes',
  'PCS',
  24,
  261.94,
  261.94,
  288.14,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  256.544,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-307',
  'tenant-apex-trading-003',
  '307',
  'BABY WIPES PURPLE 70 PC',
  'Wipes',
  'PCS',
  24,
  261.94,
  261.94,
  288.14,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  256.544,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-308',
  'tenant-apex-trading-003',
  '308',
  'GO RASH WIPES',
  'Wipes',
  'PCS',
  24,
  200.31,
  200.31,
  220.34,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  196.1835,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-309',
  'tenant-apex-trading-003',
  '309',
  'MOSQUITO REPELLENT WIPES',
  'Wipes',
  'PCS',
  144,
  115.56,
  115.56,
  127.12,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  113.1795,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-310',
  'tenant-apex-trading-003',
  '310',
  'MC WIPES N&M (PINK) NEW',
  'Wipes',
  'PCS',
  24,
  290.33,
  290.33,
  313.56,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  284.3492,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-311',
  'tenant-apex-trading-003',
  '311',
  'MC WIPES SHEA BUTTER (PURPLE) NEW',
  'Wipes',
  'PCS',
  24,
  290.33,
  290.33,
  313.56,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  284.3492,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-312',
  'tenant-apex-trading-003',
  '312',
  'MC WIPES TEA TREE OIL (WHITE) NEW',
  'Wipes',
  'PCS',
  24,
  290.33,
  290.33,
  313.56,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  284.3492,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-251',
  'tenant-apex-trading-003',
  '251',
  'SANITIZER 55 ML',
  'OIL',
  'PCS',
  144,
  231.12,
  231.12,
  254.24,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  226.359,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-252',
  'tenant-apex-trading-003',
  '252',
  'BABY OIL 125 ML (520 Retail)',
  'OIL',
  'PCS',
  96,
  400.62,
  400.62,
  406.78,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  392.3672,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-253',
  'tenant-apex-trading-003',
  '253',
  'BABY OIL 65ML (370 Retail)',
  'OIL',
  'PCS',
  96,
  285.05,
  285.05,
  313.56,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  279.178,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-254',
  'tenant-apex-trading-003',
  '254',
  'BABY OIL 200ML',
  'OIL',
  'PCS',
  36,
  554.7,
  554.7,
  610.17,
  0, 0, 0,
  '0',
  'VAT',
  18,
  0,
  0, 0, 0,
  543.2732,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-255',
  'tenant-apex-trading-003',
  '255',
  'BABY OIL 300ML',
  'OIL',
  'PCS',
  24,
  708.78,
  708.78,
  779.66,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  694.1791,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-256',
  'tenant-apex-trading-003',
  '256',
  'HAND SANITIZER 250 ML',
  'OIL',
  'PCS',
  24,
  570.11,
  570.11,
  627.12,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  558.3658,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-257',
  'tenant-apex-trading-003',
  '257',
  'MC DISINFECTANT SPRAY 200 ML',
  'OIL',
  'PCS',
  48,
  254.24,
  254.24,
  279.66,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  249.0026,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-258',
  'tenant-apex-trading-003',
  '258',
  'MC OIL 75 ML NEW',
  'OIL',
  'PCS',
  96,
  310.99,
  310.99,
  338.98,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  319.1381,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-259',
  'tenant-apex-trading-003',
  '259',
  'BABY OIL 110 ML NEW',
  'OIL',
  'PCS',
  96,
  423.73,
  423.73,
  466.1,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  435.5939,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-260',
  'tenant-apex-trading-003',
  '260',
  'BABY OIL 300 ML NEW',
  'OIL',
  'PCS',
  24,
  718.58,
  718.58,
  779.66,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  703.7772,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-191',
  'tenant-apex-trading-003',
  '191',
  'GIFT SET BEN 10',
  'Pouch',
  'PCS',
  12,
  766.75,
  766.75,
  805.08,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  552.5752,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-192',
  'tenant-apex-trading-003',
  '192',
  'GIFT SET NEW BORN',
  'Pouch',
  'PCS',
  12,
  766.75,
  766.75,
  805.08,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  781.3168,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-193',
  'tenant-apex-trading-003',
  '193',
  'MC GIFT POUCH-(L)',
  'Pouch',
  'PCS',
  24,
  1029.06,
  1029.06,
  1080.51,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  712.7377,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-194',
  'tenant-apex-trading-003',
  '194',
  'MC GIFT POUCH-(M)',
  'Pouch',
  'PCS',
  24,
  742.53,
  742.53,
  779.66,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  356.3975,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-151',
  'tenant-apex-trading-003',
  '151',
  'BABY SHAMPO 60 ML',
  'Shampoo',
  'PCS',
  96,
  200.31,
  200.31,
  220.34,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  205.9185,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-152',
  'tenant-apex-trading-003',
  '152',
  'BABY SHAMPO 60 ML APPLE',
  'Shampoo',
  'PCS',
  96,
  200.31,
  200.31,
  220.34,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  205.9185,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-153',
  'tenant-apex-trading-003',
  '153',
  'BABY SHAMPO TEARFREE 60 ML',
  'Shampoo',
  'PCS',
  96,
  200.31,
  200.31,
  220.34,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  205.9185,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-154',
  'tenant-apex-trading-003',
  '154',
  'BABY SHAMPO 60ML GRAPES',
  'Shampoo',
  'PCS',
  96,
  200.31,
  200.31,
  220.34,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  205.9185,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-155',
  'tenant-apex-trading-003',
  '155',
  'Mc Baby Shampoo Yellow 110 ML',
  'Shampoo',
  'PCS',
  96,
  285.05,
  285.05,
  313.56,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  293.0323,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-156',
  'tenant-apex-trading-003',
  '156',
  'Mc Shampo grapes 110 ml',
  'Shampoo',
  'PCS',
  96,
  285.05,
  285.05,
  313.56,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  293.0323,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-157',
  'tenant-apex-trading-003',
  '157',
  'BABY SHAMPO TEARFREE 110 ML',
  'Shampoo',
  'PCS',
  96,
  285.05,
  285.05,
  313.56,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  293.0323,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-158',
  'tenant-apex-trading-003',
  '158',
  'Mc Baby Shampo Apple 110 ML',
  'Shampoo',
  'PCS',
  96,
  285.05,
  285.05,
  313.56,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  293.0323,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-159',
  'tenant-apex-trading-003',
  '159',
  'BABY SHAMPO YELLOW 200 ML',
  'Shampoo',
  'PCS',
  36,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-160',
  'tenant-apex-trading-003',
  '160',
  'MC BABY SHAMPO 200 ML APPLE',
  'Shampoo',
  'PCS',
  36,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-161',
  'tenant-apex-trading-003',
  '161',
  'BABY SHAMPO GRAPE 200 ML',
  'Shampoo',
  'PCS',
  36,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-162',
  'tenant-apex-trading-003',
  '162',
  'BABY SHAMPO TEARFREE 200 ML',
  'Shampoo',
  'PCS',
  36,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-163',
  'tenant-apex-trading-003',
  '163',
  'BABY SHAMPO YELLOW 300 ML',
  'Shampoo',
  'PCS',
  24,
  523.88,
  523.88,
  576.27,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  538.549,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-164',
  'tenant-apex-trading-003',
  '164',
  'M.C GRAPE SHAMPOO 300 ML',
  'Shampoo',
  'PCS',
  24,
  523.88,
  523.88,
  576.27,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  538.549,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-165',
  'tenant-apex-trading-003',
  '165',
  'M.C APPLE SHAMPOO 300 ML',
  'Shampoo',
  'PCS',
  24,
  523.88,
  523.88,
  576.27,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  538.549,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-166',
  'tenant-apex-trading-003',
  '166',
  'BABY SHAMPO TEARFREE 300 ML',
  'Shampoo',
  'PCS',
  24,
  523.88,
  523.88,
  576.27,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  538.549,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-167',
  'tenant-apex-trading-003',
  '167',
  'MC BABY COLOGNE GREEN 100ML',
  'Shampoo',
  'PCS',
  96,
  462.25,
  462.25,
  508.47,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  475.1921,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-168',
  'tenant-apex-trading-003',
  '168',
  'MC BABY COLOGNE PINK 100ML',
  'Shampoo',
  'PCS',
  96,
  462.25,
  462.25,
  508.47,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  475.1921,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-169',
  'tenant-apex-trading-003',
  '169',
  'BABY DUCK SHAMPO 150 ML',
  'Shampoo',
  'PCS',
  36,
  308.17,
  308.17,
  338.98,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  316.7975,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-170',
  'tenant-apex-trading-003',
  '170',
  'MC BATH SHOWER-GREEN STRAWBERRY',
  'Shampoo',
  'PCS',
  24,
  1155.62,
  1155.62,
  1271.19,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  1187.9788,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-171',
  'tenant-apex-trading-003',
  '171',
  'MC BATH SHOWER-ORANGE APPLE',
  'Shampoo',
  'PCS',
  24,
  1155.62,
  1155.62,
  1271.19,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  1187.9788,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-172',
  'tenant-apex-trading-003',
  '172',
  'MC BATH SHOWER-PURPLE YUMMY',
  'Shampoo',
  'PCS',
  24,
  1155.62,
  1155.62,
  1271.19,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  1187.9788,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-173',
  'tenant-apex-trading-003',
  '173',
  'MC BATH SHOWER-RED MILK COCONUT',
  'Shampoo',
  'PCS',
  24,
  1155.62,
  1155.62,
  1271.19,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  1187.9788,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-174',
  'tenant-apex-trading-003',
  '174',
  'BATH AND SHOWER UNICORN 215 ML',
  'Shampoo',
  'PCS',
  48,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-175',
  'tenant-apex-trading-003',
  '175',
  'BATH AND SHOWER LION 215 ML',
  'Shampoo',
  'PCS',
  48,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-176',
  'tenant-apex-trading-003',
  '176',
  'BATH AND SHOWER ZOO ZOO 215 ML',
  'Shampoo',
  'PCS',
  48,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-177',
  'tenant-apex-trading-003',
  '177',
  'BATH AND SHOWER MIMI 215 ML',
  'Shampoo',
  'PCS',
  48,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-178',
  'tenant-apex-trading-003',
  '178',
  'BABY SHAMPOO 70 ML YELLOW NEW',
  'Shampoo',
  'PCS',
  96,
  246.53,
  246.53,
  271.19,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  253.4341,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-179',
  'tenant-apex-trading-003',
  '179',
  'MC DUCK SHAMPOO 150 ML NEW',
  'Shampoo',
  'PCS',
  36,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-180',
  'tenant-apex-trading-003',
  '180',
  'MC SHAMPOO YELLOW 105 ML NEW',
  'Shampoo',
  'PCS',
  96,
  346.69,
  346.69,
  381.36,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  356.3975,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-181',
  'tenant-apex-trading-003',
  '181',
  'MC SHAMPOO YELLOW 300 ML NEW',
  'Shampoo',
  'PCS',
  24,
  695.15,
  695.15,
  754.24,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  712.7377,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-182',
  'tenant-apex-trading-003',
  '182',
  'MC SHAMPOO YELLOW 200 ML NEW',
  'Shampoo',
  'PCS',
  36,
  538.94,
  538.94,
  584.75,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  552.5752,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-183',
  'tenant-apex-trading-003',
  '183',
  'MC SHAMPOO GRAPE 70 ML NEW',
  'Shampoo',
  'PCS',
  96,
  246.53,
  246.53,
  271.19,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  253.4341,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-184',
  'tenant-apex-trading-003',
  '184',
  'MC SHAMPOO GRAPE 200 ML NEW',
  'Shampoo',
  'PCS',
  36,
  538.94,
  538.94,
  584.75,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  552.5752,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-185',
  'tenant-apex-trading-003',
  '185',
  'MC SHAMPOO TEAR FREE 105 ML NEW',
  'Shampoo',
  'PCS',
  96,
  346.69,
  346.69,
  381.36,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  356.3975,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-186',
  'tenant-apex-trading-003',
  '186',
  'MC SHAMPOO APPLE 70 ML NEW',
  'Shampoo',
  'PCS',
  96,
  246.53,
  246.53,
  271.19,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  253.4341,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-187',
  'tenant-apex-trading-003',
  '187',
  'MC SHAMPOO APPLE 300 ML NEW',
  'Shampoo',
  'PCS',
  24,
  695.15,
  695.15,
  754.24,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  712.7377,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-188',
  'tenant-apex-trading-003',
  '188',
  'MC SHAMPOO GRAPE 300 ML NEW',
  'Shampoo',
  'PCS',
  24,
  695.15,
  695.15,
  754.24,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  712.7377,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-189',
  'tenant-apex-trading-003',
  '189',
  'MC SHAMPOO APPLE 200 ML NEW',
  'Shampoo',
  'PCS',
  36,
  538.94,
  538.94,
  584.75,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  552.5752,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-190',
  'tenant-apex-trading-003',
  '190',
  'MC SHAMPOO GRAPE 105 ML NEW',
  'Shampoo',
  'PCS',
  96,
  346.69,
  346.69,
  381.36,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  356.3975,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-2',
  'tenant-apex-trading-003',
  '2',
  'Baby Powder (Pink ) 90 GM',
  'Powder',
  'PCS',
  96,
  184.9,
  184.9,
  203.39,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  190.0772,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-3',
  'tenant-apex-trading-003',
  '3',
  'Baby Powder (Pink ) 130 GM',
  'Powder',
  'PCS',
  96,
  231.12,
  231.12,
  254.24,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  237.5928,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-4',
  'tenant-apex-trading-003',
  '4',
  'GO RASH POWDER 250 GM',
  'Powder',
  'PCS',
  48,
  365.95,
  365.95,
  402.54,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  376.1957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-5',
  'tenant-apex-trading-003',
  '5',
  'GO RASH POWDER 150 GM',
  'Powder',
  'PCS',
  72,
  277.35,
  277.35,
  305.08,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  285.1149,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-6',
  'tenant-apex-trading-003',
  '6',
  'FRENCH POWDER 90 GM',
  'Powder',
  'PCS',
  96,
  184.9,
  184.9,
  203.39,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  190.0772,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-7',
  'tenant-apex-trading-003',
  '7',
  'FRENCH POWDER 130 GM',
  'Powder',
  'PCS',
  96,
  231.12,
  231.12,
  254.24,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  237.5928,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-8',
  'tenant-apex-trading-003',
  '8',
  'Baby Powder (Pink ) 215 GM',
  'Powder',
  'PCS',
  48,
  288.91,
  288.91,
  317.8,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  296.9993,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-9',
  'tenant-apex-trading-003',
  '9',
  'FRENCH POWDER 215 GM',
  'Powder',
  'PCS',
  48,
  288.91,
  288.91,
  317.8,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  296.9993,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-10',
  'tenant-apex-trading-003',
  '10',
  'Baby Powder (Pink ) 385 GM',
  'Powder',
  'PCS',
  24,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-11',
  'tenant-apex-trading-003',
  '11',
  'FRENCH POWDER 385 GM',
  'Powder',
  'PCS',
  24,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9956,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-12',
  'tenant-apex-trading-003',
  '12',
  'Prickly Heat Powder 150 GM',
  'Powder',
  'PCS',
  72,
  277.35,
  277.35,
  305.08,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  285.1149,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-13',
  'tenant-apex-trading-003',
  '13',
  'Prickly Heat Powder 250 GM',
  'Powder',
  'PCS',
  48,
  365.95,
  365.95,
  402.54,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  376.1957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-15',
  'tenant-apex-trading-003',
  '15',
  'GO RASH 150 GM NEW',
  'Powder',
  'PCS',
  72,
  308.17,
  308.17,
  338.98,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  316.7975,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-16',
  'tenant-apex-trading-003',
  '16',
  'MC GO RASH 250 GM NEW',
  'Powder',
  'PCS',
  48,
  423.73,
  423.73,
  466.1,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  435.5939,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-17',
  'tenant-apex-trading-003',
  '17',
  'MC POWDER PINK 215 GM NEW',
  'Powder',
  'PCS',
  48,
  351.48,
  351.48,
  381.36,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  360.3732,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-18',
  'tenant-apex-trading-003',
  '18',
  'MC POWDER 130 GM PINK NEW',
  'Powder',
  'PCS',
  96,
  269.65,
  269.65,
  296.61,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  277.1993,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-19',
  'tenant-apex-trading-003',
  '19',
  'MC POWDER 90 GM PINK NEW',
  'Powder',
  'PCS',
  96,
  208.01,
  208.01,
  228.81,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  213.8341,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-20',
  'tenant-apex-trading-003',
  '20',
  'MC POWDER N&M 385GM PINK NEW',
  'Powder',
  'PCS',
  24,
  488.17,
  488.17,
  529.66,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  500.5199,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-101',
  'tenant-apex-trading-003',
  '101',
  'GIFT SET SUN SHINE',
  'Gift Box',
  'PCS',
  6,
  1952.667,
  1952.667,
  2118.61,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  2002.0633,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-102',
  'tenant-apex-trading-003',
  '102',
  'GIFT SET ZOO ZOO',
  'Gift Box',
  'PCS',
  12,
  645.68,
  645.68,
  677.97,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  657.9492,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-103',
  'tenant-apex-trading-003',
  '103',
  'GIFT SET ALLADIN',
  'Gift Box',
  'PCS',
  12,
  807.1,
  807.1,
  847.46,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  822.4358,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-104',
  'tenant-apex-trading-003',
  '104',
  'GIFT SET LION',
  'Gift Box',
  'PCS',
  12,
  1170.3,
  1170.3,
  1228.81,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  1192.535,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-105',
  'tenant-apex-trading-003',
  '105',
  'GIFT SET BABY GIRL',
  'Gift Box',
  'PCS',
  12,
  726.38,
  726.38,
  762.71,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  740.1832,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-106',
  'tenant-apex-trading-003',
  '106',
  'GIFT SET FUNNY STORY',
  'Gift Box',
  'PCS',
  12,
  564.96,
  564.96,
  593.22,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  575.6964,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-107',
  'tenant-apex-trading-003',
  '107',
  'GIFT SET UNICORN',
  'Gift Box',
  'PCS',
  12,
  1029.06,
  1029.0601,
  1080.51,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  1048.6117,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-108',
  'tenant-apex-trading-003',
  '108',
  'MARINE GIFT BOX',
  'Gift Box',
  'PCS',
  6,
  1952.667,
  1952.67,
  2118.61,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  2002.0658,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-401',
  'tenant-apex-trading-003',
  '401',
  'MC SHAMPOO TEARFREE 200 ML NEW',
  'NEW SKUs',
  'PCS',
  36,
  538.94,
  538.94,
  584.75,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  552.5752,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-402',
  'tenant-apex-trading-003',
  '402',
  'MC SHAMPOO TEARFREE 70 ML',
  'NEW SKUs',
  'PCS',
  96,
  246.53,
  246.53,
  271.19,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  253.4341,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-403',
  'tenant-apex-trading-003',
  '403',
  'MC SHAMPOO TEAR FREE 300 ML NEW',
  'NEW SKUs',
  'PCS',
  24,
  695.15,
  695.15,
  754.24,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  712.7377,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-404',
  'tenant-apex-trading-003',
  '404',
  'MC SHAMPOO APPLE 105 ML NEW',
  'NEW SKUs',
  'PCS',
  96,
  346.69,
  346.69,
  381.36,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  356.3975,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-405',
  'tenant-apex-trading-003',
  '405',
  'BABY OIL 200 ML NEW',
  'NEW SKUs',
  'PCS',
  36,
  585.8,
  585.8,
  635.59,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  573.7325,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-406',
  'tenant-apex-trading-003',
  '406',
  'BATH SHOWER UNICORN 215 ML NEW',
  'NEW SKUs',
  'PCS',
  48,
  423.72,
  423.73,
  466.1,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  435.5939,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-407',
  'tenant-apex-trading-003',
  '407',
  'MC FRENCH POWDER 385 GM NEW',
  'NEW SKUs',
  'PCS',
  24,
  488.17,
  488.17,
  529.66,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  500.5199,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-408',
  'tenant-apex-trading-003',
  '408',
  'MC DISINFECTANT WIPES SACHET',
  'NEW SKUs',
  'PCS',
  144,
  115.55,
  115.55,
  127.12,
  0, 0, 0,
  '',
  'VAT',
  18,
  0,
  0, 0, 0,
  113.1697,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-409',
  'tenant-apex-trading-003',
  '409',
  'MC SUNBLOCK 75 GM NEW',
  'NEW SKUs',
  'PCS',
  96,
  277.35,
  277.35,
  305.08,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  285.1149,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-410',
  'tenant-apex-trading-003',
  '410',
  'MC SUNBLOCK SPF-50 NEW',
  'NEW SKUs',
  'PCS',
  72,
  385.21,
  385.21,
  423.73,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  395.9957,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-411',
  'tenant-apex-trading-003',
  '411',
  'MC PRICKLY HEAT 150 GM NEW',
  'NEW SKUs',
  'PCS',
  72,
  308.17,
  308.17,
  369.18,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  322.2335,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-412',
  'tenant-apex-trading-003',
  '412',
  'MC PRICKLY HEAT 250 GM NEW',
  'NEW SKUs',
  'PCS',
  48,
  423.73,
  423.73,
  507.63,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  443.0693,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-413',
  'tenant-apex-trading-003',
  '413',
  'MC BATH SHOWER ZOZO NEW',
  'NEW SKUs',
  'PCS',
  48,
  531.59,
  531.59,
  584.75,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  546.4747,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-414',
  'tenant-apex-trading-003',
  '414',
  'MC BATH SHOWER LION NEW',
  'NEW SKUs',
  'PCS',
  48,
  531.59,
  531.59,
  584.75,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  546.4747,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-415',
  'tenant-apex-trading-003',
  '415',
  'MC BATH SHOWER MIMI NEW',
  'NEW SKUs',
  'PCS',
  48,
  531.59,
  531.59,
  584.75,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  546.4747,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-416',
  'tenant-apex-trading-003',
  '416',
  'MC POWDER FRENCH 215 GM NEW',
  'NEW SKUs',
  'PCS',
  48,
  351.48,
  351.48,
  381.36,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  360.3732,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, trade_offer, min_quantity, hs_code, gst_type, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, further_tax_percent, cost_rate, margin, is_active)
VALUES (
  'item-417',
  'tenant-apex-trading-003',
  '417',
  'MC POWDER FRENCH 130 GM NEW',
  'NEW SKUs',
  'PCS',
  96,
  269.65,
  269.65,
  296.61,
  0, 0, 0,
  '',
  '3RD',
  18,
  0,
  0, 0, 0,
  277.1993,
  0,
  true
)
ON CONFLICT (tenant_id, sku) DO NOTHING;

COMMIT;

-- Verify: should return 142 rows for apex-trading
SELECT count(*) AS product_count FROM products WHERE tenant_id = 'tenant-apex-trading-003';
