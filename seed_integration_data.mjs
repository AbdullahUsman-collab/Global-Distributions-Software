/**
 * Seed integration test data into PostgreSQL database.
 * Creates customers, products, warehouses, and stock levels
 * needed for live integration tests.
 */

import pg from 'pg';

const url = new URL(process.env.DATABASE_URL);
const pool = new pg.Pool({
  host: url.hostname,
  port: parseInt(url.port || '5432'),
  database: url.pathname.slice(1),
  user: url.username,
  password: url.password,
  ssl: { rejectUnauthorized: false },
});

const tenantId = 'tenant-demo-wholesale-001';

async function main() {
  // Create warehouse
  const warehouseId = 'warehouse-001';
  await pool.query(
    `INSERT INTO warehouses (id, tenant_id, name, code, address, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
     ON CONFLICT (tenant_id, code) DO NOTHING`,
    [warehouseId, tenantId, 'Main Warehouse', 'wh-main-001', '123 Main St, Karachi']
  );
  console.log('Seeded: warehouse-001');

  // Create warehouse location (deterministic)
  const locationId = 'loc-int-001';
  await pool.query(
    `INSERT INTO warehouse_locations (id, tenant_id, warehouse_id, name, code, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
     ON CONFLICT (warehouse_id, code) DO NOTHING`,
    [locationId, tenantId, warehouseId, 'Main Floor', 'main-floor']
  );

  // Create customer
  const customerId = 'customer-001';
  await pool.query(
    `INSERT INTO customers (id, tenant_id, account_head_id, name, address, owner_name, phone, stn, ntn, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [customerId, tenantId, 'coa-11201', 'Ahmed Traders', '456 Market Rd, Lahore', 'Ahmed Ali', '03001234567', 'STN-001', 'NTN-001']
  );
  console.log('Seeded: customer-001');

  // Create product (deterministic ID)
  const productId = 'prod-int-001';
  await pool.query(
    `INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton, sale_rate, purchase_rate, retail_price, trade_discount, gst_percent, fed_percent, advance_tax_sale_percent, advance_tax_purchase_percent, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, NOW(), NOW())
     ON CONFLICT (tenant_id, sku) DO NOTHING`,
    [productId, tenantId, 'SKU-001', 'Test Product 5kg', 'Grocery', 'KG', 1, 100.00, 80.00, 120.00, 0, 17, 0, 0, 0]
  );
  console.log('Seeded: product', productId);

  // Create stock level (deterministic)
  const stockId = 'stock-int-001';
  await pool.query(
    `INSERT INTO stock_levels (id, tenant_id, product_id, warehouse_id, quantity_on_hand, unit_cost, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (tenant_id, product_id, warehouse_id) DO UPDATE SET quantity_on_hand = $5, unit_cost = $6, updated_at = NOW()`,
    [stockId, tenantId, productId, warehouseId, 100, 80.00]
  );
  console.log('Seeded: stock level for product', productId);

  // Create supplier
  const supplierId = 'supplier-001';
  await pool.query(
    `INSERT INTO suppliers (id, tenant_id, name, contact_person, phone, email, address, account_head_id, tax_registration_number, payment_terms, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [supplierId, tenantId, 'Lucky Suppliers', 'Ali Khan', '03009876543', 'ali@lucky.com', '789 Supply St, Faisalabad', 'coa-21100', 'TAX-001', 'Net 30']
  );
  console.log('Seeded: supplier-001');

  console.log('\nAll integration test data seeded successfully.');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
