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

// Seed warehouse
const r = await pool.query(`INSERT INTO warehouses (id, tenant_id, name, code, is_active, created_at, updated_at) VALUES ('wh-main-001', 'tenant-demo-wholesale-001', 'Main Warehouse', 'WH-001', true, NOW(), NOW()) ON CONFLICT DO NOTHING RETURNING id`);
console.log('Inserted warehouse:', r.rows);

// Seed another for distribution-002
const r2 = await pool.query(`INSERT INTO warehouses (id, tenant_id, name, code, is_active, created_at, updated_at) VALUES ('wh-dist-001', 'tenant-demo-distribution-002', 'Distribution Warehouse', 'WH-D01', true, NOW(), NOW()) ON CONFLICT DO NOTHING RETURNING id`);
console.log('Inserted dist warehouse:', r2.rows);

const check = await pool.query('SELECT id, name, tenant_id FROM warehouses ORDER BY tenant_id');
console.log('All warehouses:', check.rows);

await pool.end();
