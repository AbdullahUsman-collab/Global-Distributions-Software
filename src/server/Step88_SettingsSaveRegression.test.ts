/**
 * Step 88 — Settings Save Regression Test
 *
 * ROOT CAUSE (production 500 on PUT /api/settings):
 * The handler used a bare `pool.query(...)` for the tenants.brand_name sync,
 * but `pool` was never defined in that scope (only `getPool` is imported).
 * ReferenceError at request time → 500 on every save.
 * Missed because `npm run typecheck` filters out src/server ("findstr /V src/server").
 *
 * Tests (against real PostgreSQL — same DATABASE_URL as production data):
 * 1. PUT /api/settings returns 200 and persists tenant_settings
 * 2. tenants.brand_name is synced from profile.businessName (the Step-88 feature)
 * 3. The exact bug class is guarded: handler source must not reference bare `pool`
 * 4. GET /api/settings returns saved data
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { initPool, closePool, getPool } from './db/pool';
import { loadConfig } from './db/env';
import { createAuthMiddleware } from './middleware/auth';
import { createAuthRoutes, createTenantRoutes } from './routes/auth';
import { createProtectedRoutes } from './routes/protected';
import { PostgresTenantAdapter } from './db/repositories/PostgresTenantAdapter';
import { PostgresUserAdapter } from './db/repositories/PostgresUserAdapter';
import { PostgresUserCredentialsAdapter } from './db/repositories/PostgresUserCredentialsAdapter';
import { PostgresSessionAdapter } from './db/repositories/PostgresSessionAdapter';
import { PostgresUserBrandAccessAdapter } from './db/repositories/PostgresUserBrandAccessAdapter';
import { PostgresCOAAdapter } from './db/repositories/PostgresCOAAdapter';
import { PostgresVoucherAdapter } from './db/repositories/PostgresVoucherAdapter';
import { PostgresInventoryAdapter } from './db/repositories/PostgresInventoryAdapter';
import { PostgresCustomerAdapter } from './db/repositories/PostgresCustomerAdapter';
import { PostgresSupplierAdapter } from './db/repositories/PostgresSupplierAdapter';
import { PostgresSettingsAdapter } from './db/repositories/PostgresSettingsAdapter';
import { MockAuthService } from '../domain/adapters/mock/MockAuthService';
import { registerTestPassword } from '../domain/adapters/mock/MockUserCredentialsAdapter';
import { SalesService } from '../domain/services/SalesService';
import { PurchaseService } from '../domain/services/PurchaseService';
import { CustomerReceiptService } from '../domain/services/CustomerReceiptService';
import { CashBookService } from '../domain/services/CashBookService';
import { SaleReturnService } from '../domain/services/SaleReturnService';
import { PurchaseReturnService } from '../domain/services/PurchaseReturnService';
import { BillDetailService } from '../domain/services/BillDetailService';
import { BillsListService } from '../domain/services/BillsListService';
import { PartyBalanceService } from '../domain/services/PartyBalanceService';
import { AgingReportService } from '../domain/services/AgingReportService';
import { DashboardService } from '../domain/services/DashboardService';
import { FinancialReportService } from '../domain/services/FinancialReportService';
import { StockReportService } from '../domain/services/StockReportService';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const hasDb = !!process.env.DATABASE_URL;
const describeDb = hasDb ? describe : describe.skip;

// ─── Static guard: no bare `pool` references in route handlers ───

describe('Step 88 — settings handler source guard', () => {
  it("PUT /settings handler uses getPool() and never a bare `pool` reference", () => {
    const src = readFileSync(resolve('src/server/routes/protected.ts'), 'utf-8');
    const start = src.indexOf("router.put('/settings'");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('router.', start + 10); // next route boundary
    const handler = src.substring(start, end > start ? end : undefined);

    // The brand sync query must go through getPool()
    expect(handler).toContain('getPool().query');

    // The exact bug signature: `pool.query(...)` where `pool` was never declared
    // (elsewhere in the file `const pool = getPool()` locals are legal — hence scoped guard)
    const barePoolLines = handler
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) =>
        /\bpool\s*\./.test(line) &&
        !line.includes('getPool()') &&
        !/\b(const|let|var)\s+pool\s*=/.test(line) &&
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('*')
      );
    expect(barePoolLines).toEqual([]);
  });
});

// ─── Live end-to-end settings flow ─────────────────────────────

describeDb('Step 88 — PUT /api/settings end-to-end (PostgreSQL)', () => {
  let server: http.Server;
  let baseUrl: string;
  let cookie = '';
  let testTenantId: string;

  beforeAll(async () => {
    const config = loadConfig();
    initPool(config.database);

    // Isolated throwaway tenant so the test never mutates real brands
    const suffix = Math.random().toString(36).slice(2, 10);
    testTenantId = `test-step88-${suffix}`;
    await getPool().query(
      `INSERT INTO tenants (id, slug, brand_name, logo_url, primary_color, accent_color, is_active)
       VALUES ($1, $2, $3, '', '#3b82f6', '#1e40af', false)
       ON CONFLICT (id) DO NOTHING`,
      [testTenantId, testTenantId, 'Step88 Brand Before']
    );
    await getPool().query(
      `INSERT INTO users (id, tenant_id, username, display_name, role, is_active)
       VALUES ($1, $2, $3, $4, 'ADMIN', false)
       ON CONFLICT (id) DO NOTHING`,
      [`user-step88-${suffix}`, testTenantId, `admin-step88-${suffix}`, 'Step88 Admin']
    );
    await getPool().query(
      `INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active)
       VALUES ($1, $2, $3, 'ADMIN', false)
       ON CONFLICT (user_id, tenant_id) DO NOTHING`,
      [`uba-step88-${suffix}`, `user-step88-${suffix}`, testTenantId]
    );
    await getPool().query(
      `INSERT INTO user_credentials (user_id, tenant_id, password_hash, algo)
       VALUES ($1, $2, $3, 'mock')
       ON CONFLICT (user_id) DO NOTHING`,
      [`user-step88-${suffix}`, testTenantId, 'mock-mode-placeholder']
    );

    const tenantAdapter = new PostgresTenantAdapter();
    const userAdapter = new PostgresUserAdapter();
    const credentialsAdapter = new PostgresUserCredentialsAdapter();
    const sessionAdapter = new PostgresSessionAdapter();
    const brandAccessAdapter = new PostgresUserBrandAccessAdapter();
    const coaAdapter = new PostgresCOAAdapter();
    const voucherAdapter = new PostgresVoucherAdapter();
    const inventoryAdapter = new PostgresInventoryAdapter();
    const customerAdapter = new PostgresCustomerAdapter();
    const supplierAdapter = new PostgresSupplierAdapter();
    const settingsAdapter = new PostgresSettingsAdapter();

    const authService = new MockAuthService(tenantAdapter, userAdapter, credentialsAdapter, sessionAdapter, brandAccessAdapter);
    const salesService = new SalesService(coaAdapter, voucherAdapter, inventoryAdapter, customerAdapter);
    const purchaseService = new PurchaseService(coaAdapter, voucherAdapter, inventoryAdapter, supplierAdapter);
    const customerReceiptService = new CustomerReceiptService(coaAdapter, voucherAdapter, customerAdapter);
    const cashBookService = new CashBookService(coaAdapter, voucherAdapter);
    const saleReturnService = new SaleReturnService(voucherAdapter, inventoryAdapter, customerAdapter);
    const purchaseReturnService = new PurchaseReturnService(voucherAdapter, inventoryAdapter, supplierAdapter);
    const billDetailService = new BillDetailService(voucherAdapter, coaAdapter, customerAdapter, supplierAdapter, inventoryAdapter);
    const billsListService = new BillsListService(voucherAdapter, customerAdapter, supplierAdapter, inventoryAdapter, coaAdapter);
    const partyBalanceService = new PartyBalanceService(voucherAdapter, coaAdapter, customerAdapter, supplierAdapter);
    const agingReportService = new AgingReportService(voucherAdapter, coaAdapter, customerAdapter, supplierAdapter);
    const financialReportService = new FinancialReportService(coaAdapter, voucherAdapter);
    const stockReportService = new StockReportService(inventoryAdapter);
    const dashboardService = new DashboardService(voucherAdapter, inventoryAdapter, coaAdapter, customerAdapter, supplierAdapter, cashBookService, financialReportService);

    const app = express();
    app.use(express.json());
    app.use(cookieParser('test-secret'));
    app.use('/api/auth', createAuthRoutes(authService, tenantAdapter));
    app.use('/api', createTenantRoutes(tenantAdapter));
    const authMiddleware = createAuthMiddleware(sessionAdapter, userAdapter, brandAccessAdapter);
    app.use('/api', authMiddleware, createProtectedRoutes(
      salesService, purchaseService, customerReceiptService, cashBookService,
      saleReturnService, purchaseReturnService, billDetailService, billsListService,
      partyBalanceService, agingReportService, dashboardService,
      coaAdapter, voucherAdapter, inventoryAdapter, customerAdapter,
      supplierAdapter, settingsAdapter, financialReportService, stockReportService,
      userAdapter, brandAccessAdapter, tenantAdapter,
    ));

    await new Promise<void>((res) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        res();
      });
    });

    // Activate and register a plaintext test password (mock auth mode compares
    // against the in-memory DEMO_PLAIN_PASSWORDS store — same as other test suites).
    registerTestPassword(`user-step88-${suffix}`, 'step88-pass');
    await getPool().query(`UPDATE users SET is_active = true WHERE id = $1`, [`user-step88-${suffix}`]);
    await getPool().query(`UPDATE tenants SET is_active = true WHERE id = $1`, [testTenantId]);
    await getPool().query(`UPDATE user_brand_access SET is_active = true WHERE tenant_id = $1`, [testTenantId]);

    // Login and capture session cookie
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `admin-step88-${suffix}`,
        password: 'step88-pass',
        tenantId: testTenantId,
      }),
    });
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers.get('set-cookie') || '';
    cookie = setCookie.split(';')[0];
    expect(cookie).toContain('=');
  });

  afterAll(async () => {
    // Cleanup throwaway rows
    try {
      await getPool().query(`DELETE FROM user_credentials WHERE tenant_id = $1`, [testTenantId]);
      await getPool().query(`DELETE FROM user_brand_access WHERE tenant_id = $1`, [testTenantId]);
      await getPool().query(`DELETE FROM sessions WHERE tenant_id = $1`, [testTenantId]);
      await getPool().query(`DELETE FROM tenant_settings WHERE tenant_id = $1`, [testTenantId]);
      await getPool().query(`DELETE FROM users WHERE tenant_id = $1`, [testTenantId]);
      await getPool().query(`DELETE FROM tenants WHERE id = $1`, [testTenantId]);
    } catch {
      // best effort
    }
    if (server) await new Promise<void>((res) => server.close(() => res()));
    await closePool();
  });

  it('PUT /api/settings returns 200 (was 500 due to bare pool ReferenceError)', async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        profile: {
          businessName: 'Step88 Brand After',
          tradeName: 'Step88 Trade',
          ntn: '', stn: '', email: '', phone: '', address: '', baseCurrency: 'PKR',
        },
        taxAccounts: {},
        financial: { fiscalYearStartMonth: 7, decimalPrecision: 2, voucherNumberingPrefix: '' },
      }),
    });
    expect(res.status).toBe(200);
  });

  it('tenants.brand_name is synced from profile.businessName (main-page feature)', async () => {
    const r = await getPool().query(`SELECT brand_name FROM tenants WHERE id = $1`, [testTenantId]);
    expect(r.rows[0].brand_name).toBe('Step88 Brand After');
  });

  it('GET /api/settings returns the saved profile', async () => {
    const res = await fetch(`${baseUrl}/api/settings`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile?.businessName).toBe('Step88 Brand After');
  });
});
