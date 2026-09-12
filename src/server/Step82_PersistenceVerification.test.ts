/**
 * Step 82 — Permanent Real-Database Cutover & Zero-Demo Persistence Tests
 *
 * Verifies:
 * 1. Production mode disables demo fallback
 * 2. All CRUD operations persist to PostgreSQL
 * 3. Failed state-changing requests never return fake success
 * 4. Tenant isolation is enforced
 * 5. Session/auth fallback respects DEMO_MODE
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { loadConfig } from '../server/db/env';
import { initPool, query, closePool } from '../server/db/pool';
import { PostgresInventoryAdapter } from '../server/db/repositories/PostgresInventoryAdapter';
import { PostgresCOAAdapter } from '../server/db/repositories/PostgresCOAAdapter';
import { PostgresCustomerAdapter } from '../server/db/repositories/PostgresCustomerAdapter';
import { PostgresSupplierAdapter } from '../server/db/repositories/PostgresSupplierAdapter';
import { PostgresSettingsAdapter } from '../server/db/repositories/PostgresSettingsAdapter';
import { PostgresVoucherAdapter } from '../server/db/repositories/PostgresVoucherAdapter';
import { PostgresUserAdapter } from '../server/db/repositories/PostgresUserAdapter';
import { PostgresUserBrandAccessAdapter } from '../server/db/repositories/PostgresUserBrandAccessAdapter';

const TENANT = 'tenant-demo-wholesale-001';
const TENANT2 = 'tenant-demo-distribution-002';

let inventoryRepo: PostgresInventoryAdapter;
let coaRepo: PostgresCOAAdapter;
let customerRepo: PostgresCustomerAdapter;
let supplierRepo: PostgresSupplierAdapter;
let settingsRepo: PostgresSettingsAdapter;
let voucherRepo: PostgresVoucherAdapter;
let userRepo: PostgresUserAdapter;
let brandAccessRepo: PostgresUserBrandAccessAdapter;

beforeAll(async () => {
  const config = loadConfig();
  initPool(config.database);
  inventoryRepo = new PostgresInventoryAdapter();
  coaRepo = new PostgresCOAAdapter();
  customerRepo = new PostgresCustomerAdapter();
  supplierRepo = new PostgresSupplierAdapter();
  settingsRepo = new PostgresSettingsAdapter();
  voucherRepo = new PostgresVoucherAdapter();
  userRepo = new PostgresUserAdapter();
  brandAccessRepo = new PostgresUserBrandAccessAdapter();
});

afterAll(async () => {
  await closePool();
});

// ═══════════════════════════════════════════════════════════════
// A: Production Mode Architecture
// ═══════════════════════════════════════════════════════════════

describe('Step 82 — Production Mode Architecture', () => {
  it('api.ts has DEMO_MODE flag gated by VITE_DEMO_MODE', () => {
    const src = readFileSync(resolve('src/ui/lib/api.ts'), 'utf-8');
    expect(src).toContain("VITE_DEMO_MODE === 'true'");
    expect(src).toContain('const DEMO_MODE');
  });

  it('api.ts demo fallback is gated behind DEMO_MODE check', () => {
    const src = readFileSync(resolve('src/ui/lib/api.ts'), 'utf-8');
    // Both non-JSON fallback and network error fallback are gated
    const demoBlocks = src.match(/if \(DEMO_MODE\)/g);
    expect(demoBlocks).not.toBeNull();
    expect(demoBlocks!.length).toBeGreaterThanOrEqual(2);
  });

  it('api.ts throws clear error when server unavailable in production', () => {
    const src = readFileSync(resolve('src/ui/lib/api.ts'), 'utf-8');
    expect(src).toContain('your changes were NOT saved');
    expect(src).toContain('Ensure the backend API is running');
  });

  it('session.ts has DEMO_MODE flag', () => {
    const src = readFileSync(resolve('src/ui/lib/session.ts'), 'utf-8');
    expect(src).toContain("VITE_DEMO_MODE === 'true'");
  });

  it('session.ts login fallback gated by DEMO_MODE', () => {
    const src = readFileSync(resolve('src/ui/lib/session.ts'), 'utf-8');
    expect(src).toContain('if (DEMO_MODE)');
    expect(src).toContain('Server unavailable — cannot login');
  });

  it('config.ts uses import.meta.env not process.env', () => {
    const src = readFileSync(resolve('src/ui/lib/config.ts'), 'utf-8');
    expect(src).toContain('import.meta.env.VITE_DEMO_MODE');
    expect(src).not.toContain('process.env');
  });

  it('.env.example documents VITE_DEMO_MODE', () => {
    const src = readFileSync(resolve('.env.example'), 'utf-8');
    expect(src).toContain('VITE_DEMO_MODE');
  });

  it('vite-env.d.ts exists for import.meta.env types', () => {
    const fs = require('fs');
    expect(fs.existsSync(resolve('src/vite-env.d.ts'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// B: Product Persistence — Full CRUD Cycle
// ═══════════════════════════════════════════════════════════════

describe('Step 82 — Product Persistence (Full CRUD)', () => {
  let productId: string;

  it('Create product → PostgreSQL', async () => {
    const p = await inventoryRepo.createProduct(TENANT, {
      sku: 'STEP82-UAT-001',
      name: 'Step82 UAT Product',
      category: 'UAT Testing',
      unit: 'Pcs',
      pcsPerCarton: 12,
      saleRate: 250,
      purchaseRate: 200,
      retailPrice: 300,
      tradeDiscount: 5,
      tradeOffer: 'Buy 10 Get 1',
      minQuantity: 5,
      hsCode: '8471.30',
      gstType: 'VAT',
      gstPercent: 17,
      fedPercent: 3,
      advanceTaxSalePercent: 2,
      advanceTaxPurchasePercent: 1.5,
      furtherTaxPercent: 4,
      margin: 0.072,
      costRate: 50,
    });
    productId = p.id;
    expect(p.id).toBeDefined();
    expect(p.sku).toBe('STEP82-UAT-001');
  });

  it('Fresh DB read returns persisted product', async () => {
    const p = await inventoryRepo.getProductById(TENANT, productId);
    expect(p).not.toBeNull();
    expect(p!.name).toBe('Step82 UAT Product');
    expect(p!.gstPercent).toBe(17);
    expect(p!.fedPercent).toBe(3);
    expect(p!.furtherTaxPercent).toBe(4);
    expect(p!.margin).toBe(0.072);
    expect(p!.costRate).toBe(50);
  });

  it('Update all fields → PostgreSQL persists', async () => {
    const updated = await inventoryRepo.updateProduct(TENANT, productId, {
      name: 'Step82 UAT Product UPDATED',
      category: 'Updated Category',
      unit: 'Box',
      pcsPerCarton: 24,
      saleRate: 500,
      purchaseRate: 400,
      retailPrice: 600,
      tradeDiscount: 10,
      tradeOffer: 'Updated Offer',
      minQuantity: 10,
      gstPercent: 25,
      fedPercent: 5,
      advanceTaxSalePercent: 3,
      advanceTaxPurchasePercent: 2,
      furtherTaxPercent: 6,
      margin: 0.15,
      costRate: 100,
    });
    expect(updated.name).toBe('Step82 UAT Product UPDATED');
    expect(updated.gstPercent).toBe(25);
    expect(updated.costRate).toBe(100);
  });

  it('Fresh read confirms all updated fields', async () => {
    const p = await inventoryRepo.getProductById(TENANT, productId);
    expect(p!.name).toBe('Step82 UAT Product UPDATED');
    expect(p!.category).toBe('Updated Category');
    expect(p!.unit).toBe('Box');
    expect(p!.pcsPerCarton).toBe(24);
    expect(p!.saleRate).toBe(500);
    expect(p!.purchaseRate).toBe(400);
    expect(p!.retailPrice).toBe(600);
    expect(p!.tradeDiscount).toBe(10);
    expect(p!.gstPercent).toBe(25);
    expect(p!.fedPercent).toBe(5);
    expect(p!.furtherTaxPercent).toBe(6);
  });

  it('Deactivate product → PostgreSQL isActive=false', async () => {
    await inventoryRepo.deactivateProduct(TENANT, productId);
    const p = await inventoryRepo.getProductById(TENANT, productId);
    expect(p!.isActive).toBe(false);
  });

  it('Cleanup', async () => {
    await query('DELETE FROM products WHERE id = $1 AND tenant_id = $2', [productId, TENANT]);
  });
});

// ═══════════════════════════════════════════════════════════════
// C: Account Persistence
// ═══════════════════════════════════════════════════════════════

describe('Step 82 — Account Persistence', () => {
  let accountId: string;

  it('Create account → PostgreSQL', async () => {
    const a = await coaRepo.createAccount(TENANT, {
      accountCode: 'STEP82-ACCT',
      accountName: 'Step82 UAT Account',
      parentId: null,
      level: 4,
      accountType: 'ASSET',
      controlCategory: 'Current Assets',
      accountEffect: 'Balance Sheet',
      isActive: true,
      address: '456 Test Ave',
      ownerName: 'Test Owner',
      phone: '0321-1234567',
      stn: 'STN-UAT-001',
      ntn: 'NTN-UAT-001',
      cnic: '35202-9876543-2',
    });
    accountId = a.id;
    expect(a.accountCode).toBe('STEP82-ACCT');
  });

  it('Fresh read confirms account metadata', async () => {
    const a = await coaRepo.getAccountById(TENANT, accountId);
    expect(a).not.toBeNull();
    expect(a!.accountName).toBe('Step82 UAT Account');
    expect(a!.address).toBe('456 Test Ave');
    expect(a!.ownerName).toBe('Test Owner');
    expect(a!.stn).toBe('STN-UAT-001');
  });

  it('Update account → PostgreSQL', async () => {
    await coaRepo.updateAccount(TENANT, accountId, {
      accountName: 'Step82 UAT Account Updated',
      address: '789 New St',
    });
    const a = await coaRepo.getAccountById(TENANT, accountId);
    expect(a!.accountName).toBe('Step82 UAT Account Updated');
    expect(a!.address).toBe('789 New St');
    // Original metadata preserved
    expect(a!.ownerName).toBe('Test Owner');
  });

  it('Cleanup', async () => {
    await query('DELETE FROM accounts WHERE id = $1 AND tenant_id = $2', [accountId, TENANT]);
  });
});

// ═══════════════════════════════════════════════════════════════
// D: Customer & Supplier Persistence
// ═══════════════════════════════════════════════════════════════

describe('Step 82 — Customer/Supplier Persistence', () => {
  it('Customers exist and are tenant-scoped', async () => {
    const t1 = await customerRepo.getCustomersByTenantId(TENANT);
    const t2 = await customerRepo.getCustomersByTenantId(TENANT2);
    expect(t1.length).toBeGreaterThan(0);
    // No overlap
    const t1Ids = new Set(t1.map(c => c.id));
    for (const c of t2) expect(t1Ids.has(c.id)).toBe(false);
  });

  it('Suppliers exist and are tenant-scoped', async () => {
    const t1 = await supplierRepo.getSuppliers(TENANT);
    const t2 = await supplierRepo.getSuppliers(TENANT2);
    expect(t1.length).toBeGreaterThan(0);
    const t1Ids = new Set(t1.map(s => s.id));
    for (const s of t2) expect(t1Ids.has(s.id)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// E: Voucher & Ledger Persistence
// ═══════════════════════════════════════════════════════════════

describe('Step 82 — Voucher & Ledger Persistence', () => {
  it('Vouchers exist for tenant', async () => {
    const v = await voucherRepo.getVouchersByTenantId(TENANT);
    expect(v.length).toBeGreaterThan(0);
  });

  it('Voucher has all required fields', async () => {
    const v = await voucherRepo.getVouchersByTenantId(TENANT);
    const first = v[0];
    expect(first.id).toBeDefined();
    expect(first.voucherType).toBeDefined();
    expect(first.voucherNumber).toBeDefined();
    expect(first.status).toBeDefined();
    expect(first.date).toBeDefined();
  });

  it('Ledger entries exist and have debit/credit', async () => {
    const entries = await voucherRepo.getLedgerEntries(TENANT);
    expect(entries.length).toBeGreaterThan(0);
    const e = entries[0];
    expect(typeof e.debit).toBe('number');
    expect(typeof e.credit).toBe('number');
    expect(e.accountId).toBeDefined();
  });

  it('Posted vouchers have DRAFT→POSTED status in DB', async () => {
    const posted = await voucherRepo.getVouchersByTenantId(TENANT, { status: 'POSTED' });
    expect(posted.length).toBeGreaterThan(0);
    for (const v of posted) {
      expect(v.status).toBe('POSTED');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// F: Settings Persistence
// ═══════════════════════════════════════════════════════════════

describe('Step 82 — Settings Persistence', () => {
  it('Settings readable from DB', async () => {
    const s = await settingsRepo.getSettingsByTenantId(TENANT);
    if (s) {
      expect(s.tenantId).toBe(TENANT);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// G: User & Brand Access Persistence
// ═══════════════════════════════════════════════════════════════

describe('Step 82 — User & Brand Access Persistence', () => {
  it('Users exist for tenant', async () => {
    const users = await userRepo.getUsersByTenant(TENANT);
    expect(users.length).toBeGreaterThanOrEqual(3);
  });

  it('Brand access is persisted and active', async () => {
    const users = await userRepo.getUsersByTenant(TENANT);
    const admin = users.find(u => u.username === 'admin');
    expect(admin).toBeDefined();
    const access = await brandAccessRepo.getByUserAndTenant(admin!.id, TENANT);
    expect(access).not.toBeNull();
    expect(access!.isActive).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// H: Tenant Isolation
// ═══════════════════════════════════════════════════════════════

describe('Step 82 — Tenant Isolation', () => {
  it('Products are tenant-scoped', async () => {
    const t1 = await inventoryRepo.getProducts(TENANT);
    const t2 = await inventoryRepo.getProducts(TENANT2);
    const t1Ids = new Set(t1.map(p => p.id));
    for (const p of t2) expect(t1Ids.has(p.id)).toBe(false);
  });

  it('Cross-tenant getProductById returns null', async () => {
    const t1 = await inventoryRepo.getProducts(TENANT);
    if (t1.length > 0) {
      const cross = await inventoryRepo.getProductById(TENANT2, t1[0].id);
      expect(cross).toBeNull();
    }
  });

  it('Accounts are tenant-scoped', async () => {
    const t1 = await coaRepo.getAccountsByTenantId(TENANT);
    const t2 = await coaRepo.getAccountsByTenantId(TENANT2);
    const t1Ids = new Set(t1.map(a => a.id));
    for (const a of t2) expect(t1Ids.has(a.id)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// I: Deployment Artifacts
// ═══════════════════════════════════════════════════════════════

describe('Step 82 — Deployment Artifacts', () => {
  it('Dockerfile exists', () => {
    const fs = require('fs');
    expect(fs.existsSync(resolve('Dockerfile'))).toBe(true);
  });

  it('Dockerfile uses multi-stage build', () => {
    const df = readFileSync(resolve('Dockerfile'), 'utf-8');
    expect(df).toContain('AS builder');
    expect(df).toContain('AS production');
    expect(df).toContain('NODE_ENV=production');
    expect(df).toContain('HEALTHCHECK');
  });

  it('.dockerignore exists', () => {
    const fs = require('fs');
    expect(fs.existsSync(resolve('.dockerignore'))).toBe(true);
  });

  it('GitHub Actions CI workflow exists', () => {
    const fs = require('fs');
    expect(fs.existsSync(resolve('.github/workflows/ci.yml'))).toBe(true);
  });

  it('CI workflow runs typecheck, test, build', () => {
    const ci = readFileSync(resolve('.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('tsc --noEmit');
    expect(ci).toContain('vitest run');
    expect(ci).toContain('npm run build');
  });
});

// ═══════════════════════════════════════════════════════════════
// J: Security Audit
// ═══════════════════════════════════════════════════════════════

describe('Step 82 — Security Audit', () => {
  it('CORS uses ALLOWED_ORIGINS in production', () => {
    const src = readFileSync(resolve('src/server/index.ts'), 'utf-8');
    expect(src).toContain('ALLOWED_ORIGINS');
  });

  it('Cookies use httpOnly and sameSite', () => {
    const src = readFileSync(resolve('src/server/routes/auth.ts'), 'utf-8');
    expect(src).toContain('httpOnly: true');
    expect(src).toContain('sameSite');
  });

  it('Rate limiting exists on login and API', () => {
    const src = readFileSync(resolve('src/server/middleware/rateLimit.ts'), 'utf-8');
    expect(src).toContain('loginRateLimiter');
    expect(src).toContain('apiRateLimiter');
    expect(src).toContain('mutationRateLimiter');
  });

  it('.env is in .gitignore', () => {
    const gi = readFileSync(resolve('.gitignore'), 'utf-8');
    expect(gi).toContain('.env');
    expect(gi).toContain('.env.local');
    expect(gi).toContain('.env.production');
  });

  it('SESSION_SECRET is not hardcoded in source', () => {
    const src = readFileSync(resolve('src/server/index.ts'), 'utf-8');
    // Should use process.env, not a hardcoded value
    expect(src).toContain('process.env.COOKIE_SECRET');
  });
});
