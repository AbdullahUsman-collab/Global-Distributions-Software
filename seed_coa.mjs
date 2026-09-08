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
const accounts = [
  { id: 'coa-11101', code: '11101', name: 'Cash', type: 'ASSET', normalBalance: 'DEBIT' },
  { id: 'coa-11102', code: '11102', name: 'Bank', type: 'ASSET', normalBalance: 'DEBIT' },
  { id: 'coa-11201', code: '11201', name: 'Accounts Receivable', type: 'ASSET', normalBalance: 'DEBIT' },
  { id: 'coa-11301', code: '11301', name: 'Inventory', type: 'ASSET', normalBalance: 'DEBIT' },
  { id: 'coa-11401', code: '11401', name: 'GST Input', type: 'ASSET', normalBalance: 'DEBIT' },
  { id: 'coa-21100', code: '21100', name: 'Accounts Payable', type: 'LIABILITY', normalBalance: 'CREDIT' },
  { id: 'coa-21201', code: '21201', name: 'Sales Tax Output', type: 'LIABILITY', normalBalance: 'CREDIT' },
  { id: 'coa-21202', code: '21202', name: 'Withholding Tax Payable', type: 'LIABILITY', normalBalance: 'CREDIT' },
  { id: 'coa-21203', code: '21203', name: 'FED Payable', type: 'LIABILITY', normalBalance: 'CREDIT' },
  { id: 'coa-31101', code: '31101', name: 'Capital', type: 'EQUITY', normalBalance: 'CREDIT' },
  { id: 'coa-41101', code: '41101', name: 'Sales Revenue', type: 'REVENUE', normalBalance: 'CREDIT' },
  { id: 'coa-41104', code: '41104', name: 'Sales Return', type: 'REVENUE', normalBalance: 'DEBIT' },
  { id: 'coa-51101', code: '51101', name: 'Purchase Cost', type: 'COGS', normalBalance: 'DEBIT' },
  { id: 'coa-51104', code: '51104', name: 'Purchase Return', type: 'COGS', normalBalance: 'CREDIT' },
  { id: 'coa-61101', code: '61101', name: 'Rent Expense', type: 'EXPENSE', normalBalance: 'DEBIT' },
  { id: 'coa-61102', code: '61102', name: 'Utilities Expense', type: 'EXPENSE', normalBalance: 'DEBIT' },
];

for (const a of accounts) {
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, account_code, account_name, account_type, normal_balance, is_posting, is_active, level, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, $6, true, true, 4, NOW(), NOW()) 
     ON CONFLICT (tenant_id, account_code) DO NOTHING`,
    [a.id, tenantId, a.code, a.name, a.type, a.normalBalance]
  );
  console.log(`Seeded: ${a.code} - ${a.name}`);
}

const check = await pool.query('SELECT account_code, account_name FROM accounts WHERE tenant_id = $1 ORDER BY account_code', [tenantId]);
console.log(`\nTotal accounts in COA: ${check.rows.length}`);
await pool.end();
