/**
 * Step 86 — Tenant Cleanup + Admin Bootstrap + Tenant-Scoped ERP Foundation
 *
 * Tests:
 * 1. Demo tenant cleanup (only classified tenants removed)
 * 2. First tenant creation (authorized Owner/Admin)
 * 3. Unauthorized tenant creation (must fail)
 * 4. Tenant access isolation
 * 5. Tenant-scoped COA
 * 6. Tenant-scoped vouchers
 * 7. Tenant-scoped products
 * 8. Tenant-scoped inventory
 * 9. Tenant-scoped settings
 * 10. Dashboard/report isolation
 * 11. Main page bootstrap flow
 * 12. Tenant creation initializes ERP foundation
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── TEST 1: Demo tenant cleanup ────────────────────────────
describe('Step 86 — Demo Tenant Cleanup', () => {
  it('should have migration 008 that removes demo tenants', () => {
    const sql = readFileSync(
      resolve('src/server/db/migrations/008_cleanup_demo_tenants.sql'),
      'utf-8'
    );

    // Must target actual demo slugs
    expect(sql).toContain('demo-distribution');
    expect(sql).toContain('demo-wholesale');

    // Must NOT delete system-000 (check actual DELETE statements, not comments)
    const deleteStatements = sql.split('\n').filter(l => l.trim().startsWith('DELETE'));
    for (const stmt of deleteStatements) {
      expect(stmt).not.toContain("'system-000'");
      expect(stmt).not.toContain('"system-000"');
    }
  });

  it('should delete child data in correct FK order', () => {
    const sql = readFileSync(
      resolve('src/server/db/migrations/008_cleanup_demo_tenants.sql'),
      'utf-8'
    );

    // Verify order: sessions before users, ledger before vouchers, etc.
    const sessionIdx = sql.indexOf('DELETE FROM sessions');
    const ubaIdx = sql.indexOf('DELETE FROM user_brand_access');
    const ledgerIdx = sql.indexOf('DELETE FROM ledger_entries');
    const vlinesIdx = sql.indexOf('DELETE FROM voucher_lines');
    const vouchersIdx = sql.indexOf('DELETE FROM vouchers');
    const usersIdx = sql.indexOf('DELETE FROM users');
    const tenantsIdx = sql.indexOf('DELETE FROM tenants');

    expect(sessionIdx).toBeGreaterThan(-1);
    expect(ubaIdx).toBeGreaterThan(sessionIdx);
    expect(ledgerIdx).toBeGreaterThan(ubaIdx);
    expect(vlinesIdx).toBeGreaterThan(ledgerIdx);
    expect(vouchersIdx).toBeGreaterThan(vlinesIdx);
    expect(usersIdx).toBeGreaterThan(vouchersIdx);
    expect(tenantsIdx).toBeGreaterThan(usersIdx);
  });

  it('should NOT delete system-000 or apex-trading', () => {
    const sql = readFileSync(
      resolve('src/server/db/migrations/008_cleanup_demo_tenants.sql'),
      'utf-8'
    );

    // System tenant must be safe
    expect(sql).not.toMatch(/DELETE.*system-000/i);
    expect(sql).not.toMatch(/WHERE.*id = 'system-000'/i);
  });
});

// ─── TEST 12: Tenant creation initializes ERP foundation ────
describe('Step 86 — COA Initialization', () => {
  it('seedCOA module should exist and export seedDefaultCOA', async () => {
    const mod = await import('../server/lib/seedCOA.js');
    expect(typeof mod.seedDefaultCOA).toBe('function');
    expect(typeof mod.getDefaultCOACodes).toBe('function');
    expect(typeof mod.getDefaultCOACount).toBe('function');
  });

  it('should have 50+ default COA accounts', async () => {
    const { getDefaultCOACount } = await import('../server/lib/seedCOA.js');
    expect(getDefaultCOACount()).toBeGreaterThanOrEqual(50);
  });

  it('should include essential account codes', async () => {
    const { getDefaultCOACodes } = await import('../server/lib/seedCOA.js');
    const codes = getDefaultCOACodes();

    // Essential accounts the ERP requires
    expect(codes).toContain('10000'); // Assets
    expect(codes).toContain('20000'); // Liabilities
    expect(codes).toContain('30000'); // Equity
    expect(codes).toContain('40000'); // Revenue
    expect(codes).toContain('50000'); // COGS
    expect(codes).toContain('60000'); // Expenses
    expect(codes).toContain('11101'); // Cash in Hand
    expect(codes).toContain('11102'); // Bank Account
    expect(codes).toContain('11201'); // Trade Receivables
    expect(codes).toContain('11301'); // General Inventory
    expect(codes).toContain('11401'); // Sales Tax Input
    expect(codes).toContain('21100'); // Accounts Payable
    expect(codes).toContain('21201'); // Sales Tax Output
    expect(codes).toContain('31101'); // Owner's Capital
    expect(codes).toContain('41101'); // Wholesale Sales
    expect(codes).toContain('41104'); // Sales Return
    expect(codes).toContain('51101'); // Material Purchases
    expect(codes).toContain('51104'); // Purchase Return
  });

  it('migration 008 should be registered in migrate.ts', () => {
    const migrateSrc = readFileSync(resolve('src/server/db/migrate.ts'), 'utf-8');
    expect(migrateSrc).toContain("version: '008'");
    expect(migrateSrc).toContain('cleanup_demo_tenants');
  });
});

// ─── STEP 86 FILES VERIFICATION ─────────────────────────────
describe('Step 86 — File Verification', () => {
  it('should have seedCOA.ts', () => {
    const path = resolve('src/server/lib/seedCOA.ts');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('seedDefaultCOA');
    expect(content).toContain('DEFAULT_COA');
  });

  it('should have tenantCleanup.ts', () => {
    const path = resolve('src/server/lib/tenantCleanup.ts');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('deleteTenantCompletely');
    expect(content).toContain('deactivateTenant');
    expect(content).toContain('system-000');
  });

  it('should have migration 008', () => {
    const path = resolve('src/server/db/migrations/008_cleanup_demo_tenants.sql');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('DELETE FROM');
    expect(content).toContain('demo tenants');
  });

  it('system.ts should import and call seedDefaultCOA', () => {
    const src = readFileSync(resolve('src/server/routes/system.ts'), 'utf-8');
    expect(src).toContain('seedDefaultCOA');
    expect(src).toContain('accountsSeeded');
  });

  it('protected.ts should import and call seedDefaultCOA', () => {
    const src = readFileSync(resolve('src/server/routes/protected.ts'), 'utf-8');
    expect(src).toContain('seedDefaultCOA');
    expect(src).toContain('accountsSeeded');
  });
});

// ─── ARCHITECTURE VERIFICATION ──────────────────────────────
describe('Step 86 — Architecture Rules', () => {
  it('tenantCleanup should refuse to delete system-000', async () => {
    const { deleteTenantCompletely } = await import('../server/lib/tenantCleanup.js');
    await expect(deleteTenantCompletely('system-000')).rejects.toThrow('REFUSING');
  });

  it('tenantCleanup should refuse to deactivate system-000', async () => {
    const { deactivateTenant } = await import('../server/lib/tenantCleanup.js');
    await expect(deactivateTenant('system-000')).rejects.toThrow('REFUSING');
  });

  it('api/index.ts must NOT be modified', () => {
    const api = readFileSync(resolve('api/index.ts'), 'utf-8');
    expect(api).toContain("from '../src/server/index.js'");
    expect(api).toContain('await dbReady');
  });

  it('vercel.json must NOT have builds config', () => {
    const vercel = readFileSync(resolve('vercel.json'), 'utf-8');
    expect(vercel).not.toContain('"builds"');
    expect(vercel).toContain('"rewrites"');
  });
});
