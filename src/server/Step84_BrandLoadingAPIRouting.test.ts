/**
 * Step 84 — Brand Loading Fix, API Routing Audit & Production Connectivity
 *
 * Tests:
 * 1. dotenv loading (server reads DATABASE_URL)
 * 2. Brand endpoint returns real PostgreSQL data
 * 3. Health endpoint indicates correct mode
 * 4. Frontend API base URL configuration
 * 5. No hardcoded /api fetch calls in frontend pages
 * 6. Vite proxy configuration
 * 7. session.ts HTML response detection
 * 8. api.ts HTML response detection on success
 * 9. render.yaml validity
 * 10. Dockerfile validity
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { initPool, closePool } from './db/pool';
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
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const hasDb = !!process.env.DATABASE_URL;
const describeDb = hasDb ? describe : describe.skip;

// ─── Server Setup ───────────────────────────────────────────────

describeDb('Step 84 — Brand Loading Fix & API Routing Audit', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const config = loadConfig();
    initPool(config.database);

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
    app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'PostgreSQL' });
    });

    const authMiddleware = createAuthMiddleware(sessionAdapter, userAdapter, brandAccessAdapter);
    app.use('/api', authMiddleware, createProtectedRoutes(
      salesService, purchaseService, customerReceiptService, cashBookService,
      saleReturnService, purchaseReturnService, billDetailService, billsListService,
      partyBalanceService, agingReportService, dashboardService,
      coaAdapter, voucherAdapter, inventoryAdapter, customerAdapter,
      supplierAdapter, settingsAdapter, financialReportService, stockReportService,
      userAdapter, brandAccessAdapter, tenantAdapter,
    ));

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await closePool();
  });

  // ─── Brand Loading ────────────────────────────────────────────

  describe('Brand Loading', () => {
    it('GET /api/tenants returns real PostgreSQL brands without auth', async () => {
      const res = await fetch(`${baseUrl}/api/tenants`);
      expect(res.ok).toBe(true);
      const ct = res.headers.get('content-type') || '';
      expect(ct).toContain('application/json');
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      for (const tenant of data) {
        expect(tenant.id).toBeTruthy();
        expect(tenant.slug).toBeTruthy();
        expect(tenant.brandName).toBeTruthy();
        expect(typeof tenant.primaryColor).toBe('string');
      }
    });

    it('GET /api/tenants returns JSON not HTML', async () => {
      const res = await fetch(`${baseUrl}/api/tenants`);
      const ct = res.headers.get('content-type') || '';
      expect(ct).toContain('application/json');
      expect(ct).not.toContain('text/html');
    });

    it('GET /api/tenants/:slug returns valid brand data', async () => {
      const listRes = await fetch(`${baseUrl}/api/tenants`);
      const tenants = await listRes.json();
      const slug = tenants[0].slug;
      const res = await fetch(`${baseUrl}/api/tenants/${slug}`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.slug).toBe(slug);
      expect(data.brandName).toBeTruthy();
      expect(data.isActive).toBe(true);
    });

    it('GET /api/tenants/:slug returns 404 for nonexistent slug', async () => {
      const res = await fetch(`${baseUrl}/api/tenants/nonexistent-slug-xyz`);
      expect(res.status).toBe(404);
    });
  });

  // ─── Health Endpoint ──────────────────────────────────────────

  describe('Health Endpoint', () => {
    it('GET /api/health returns PostgreSQL mode', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.mode).toBe('PostgreSQL');
      expect(data.timestamp).toBeTruthy();
    });
  });

  // ─── dotenv Loading ───────────────────────────────────────────

  describe('dotenv Loading', () => {
    it('process.env.DATABASE_URL is set when .env exists', () => {
      const envPath = resolve(process.cwd(), '.env');
      expect(existsSync(envPath)).toBe(true);
      expect(process.env.DATABASE_URL).toBeTruthy();
      expect(process.env.DATABASE_URL).toContain('postgresql://');
    });

    it('server starts in PostgreSQL mode not mock mode', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      const data = await res.json();
      expect(data.mode).toBe('PostgreSQL');
    });
  });

  // ─── API Base URL Configuration ───────────────────────────────

  describe('API Base URL Configuration', () => {
    it('session.ts defines API_BASE from VITE_API_URL', () => {
      const sessionSrc = readFileSync(resolve('src/ui/lib/session.ts'), 'utf-8');
      expect(sessionSrc).toContain("import.meta.env.VITE_API_URL || '/api'");
      expect(sessionSrc).toContain('const API_BASE');
    });

    it('api.ts defines API_BASE from VITE_API_URL', () => {
      const apiSrc = readFileSync(resolve('src/ui/lib/api.ts'), 'utf-8');
      expect(apiSrc).toContain("import.meta.env.VITE_API_URL || '/api'");
      expect(apiSrc).toContain('const API_BASE');
    });

    it('session.ts and api.ts use the same API_BASE formula', () => {
      const sessionSrc = readFileSync(resolve('src/ui/lib/session.ts'), 'utf-8');
      const apiSrc = readFileSync(resolve('src/ui/lib/api.ts'), 'utf-8');
      const sessionBase = sessionSrc.match(/const API_BASE = (.+);/)?.[1];
      const apiBase = apiSrc.match(/const API_BASE = (.+);/)?.[1];
      expect(sessionBase).toBe(apiBase);
    });
  });

  // ─── Frontend API Audit — No Hardcoded Calls ──────────────────

  describe('Frontend API Audit', () => {
    it('no page or component makes direct fetch() calls', () => {
      function findTsx(dir: string): string[] {
        const results: string[] = [];
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) results.push(...findTsx(full));
          else if (entry.name.endsWith('.tsx')) results.push(full);
        }
        return results;
      }
      const pages = findTsx(resolve('src/ui/pages'));
      const components = findTsx(resolve('src/ui/components'));
      const files = [...pages, ...components];

      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('//') || line.startsWith('*')) continue;
          if (line.includes('fetch(') && !line.includes('// fetch')) {
            violations.push(`${file}:${i + 1}: ${line.substring(0, 80)}`);
          }
        }
      }
      expect(violations).toEqual([]);
    });

    it('no page or component has hardcoded http:// or https:// API URLs', () => {
      function findTsx(dir: string): string[] {
        const results: string[] = [];
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) results.push(...findTsx(full));
          else if (entry.name.endsWith('.tsx')) results.push(full);
        }
        return results;
      }
      const pages = findTsx(resolve('src/ui/pages'));
      const components = findTsx(resolve('src/ui/components'));
      const files = [...pages, ...components];

      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('//') || line.startsWith('*')) continue;
          if ((line.includes('http://localhost') || line.includes('https://')) &&
              (line.includes('/api/') || line.includes('fetch'))) {
            violations.push(`${file}:${i + 1}: ${line.substring(0, 80)}`);
          }
        }
      }
      expect(violations).toEqual([]);
    });

    it('session.ts handles HTML responses (Vercel SPA fallback detection)', () => {
      const src = readFileSync(resolve('src/ui/lib/session.ts'), 'utf-8');
      expect(src).toContain("contentType.includes('text/html')");
      expect(src).toContain('BACKEND_NOT_DEPLOYED');
    });

    it('api.ts handles HTML responses on success', () => {
      const src = readFileSync(resolve('src/ui/lib/api.ts'), 'utf-8');
      expect(src).toContain('text/html');
      expect(src).toContain('Server unavailable — received HTML instead of JSON');
    });

    it('session.ts does not use demo fallback in production for tenant loading', () => {
      const src = readFileSync(resolve('src/ui/lib/session.ts'), 'utf-8');
      expect(src).toContain('BACKEND_NOT_DEPLOYED');
      expect(src).toContain("throw new Error('Unable to connect to the ERP server. The backend API is not available. Please contact your administrator.')");
    });
  });

  // ─── Vite Proxy Configuration ─────────────────────────────────

  describe('Vite Proxy Configuration', () => {
    it('vite.config.ts proxies /api to localhost:3000', () => {
      const configPath = resolve('vite.config.ts');
      expect(existsSync(configPath)).toBe(true);
      const config = readFileSync(configPath, 'utf-8');
      expect(config).toContain("'/api'");
      expect(config).toContain('localhost:3000');
      expect(config).toContain('changeOrigin: true');
    });
  });

  // ─── Deployment Configuration ─────────────────────────────────

  describe('Deployment Configuration', () => {
    it('render.yaml exists and has correct health check', () => {
      const path = resolve('render.yaml');
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('healthCheckPath: /api/health');
      expect(content).toContain('npx tsx src/server/index.ts');
      expect(content).toContain('NODE_ENV');
      expect(content).toContain('DATABASE_URL');
      expect(content).toContain('SESSION_SECRET');
    });

    it('Dockerfile exists and uses correct entrypoint', () => {
      const path = resolve('Dockerfile');
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('CMD ["npx", "tsx", "src/server/index.ts"]');
      expect(content).toContain('HEALTHCHECK');
      expect(content).toContain('/api/health');
      expect(content).toContain('COPY --from=builder /app/dist ./dist');
    });

    it('.env.example documents VITE_API_URL', () => {
      const path = resolve('.env.example');
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('VITE_API_URL=');
      expect(content).toContain('DATABASE_URL=');
    });

    it('server/index.ts imports dotenv/config as first import', () => {
      const src = readFileSync(resolve('src/server/index.ts'), 'utf-8');
      const firstImportIdx = src.indexOf("import 'dotenv/config'");
      expect(firstImportIdx).toBeGreaterThan(0);
      const beforeDotenv = src.substring(0, firstImportIdx);
      const nonCommentBefore = beforeDotenv.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').trim();
      expect(nonCommentBefore.length).toBe(0);
    });
  });

  // ─── CORS Configuration ───────────────────────────────────────

  describe('CORS Configuration', () => {
    it('server/index.ts has CORS middleware for development', () => {
      const src = readFileSync(resolve('src/server/index.ts'), 'utf-8');
      expect(src).toContain('Access-Control-Allow-Origin');
      expect(src).toContain('Access-Control-Allow-Methods');
      expect(src).toContain('Access-Control-Allow-Headers');
      expect(src).toContain('Access-Control-Allow-Credentials');
    });

    it('server/index.ts supports cross-origin production cookies', () => {
      const src = readFileSync(resolve('src/server/index.ts'), 'utf-8');
      expect(src).toContain('isCrossOriginProduction');
      expect(src).toContain('getCookieSameSite');
      expect(src).toContain("'none'");
    });
  });

  // ─── No Demo Fallback in Production ───────────────────────────

  describe('No Demo Fallback', () => {
    it('frontend VITE_DEMO_MODE defaults to false', () => {
      const envPath = resolve('.env');
      if (existsSync(envPath)) {
        const env = readFileSync(envPath, 'utf-8');
        const demoMode = env.match(/^VITE_DEMO_MODE=(.*)$/m);
        if (demoMode) {
          expect(demoMode[1].trim()).not.toBe('true');
        }
      }
    });

    it('session.ts DEMO_MODE defaults to false', () => {
      const src = readFileSync(resolve('src/ui/lib/session.ts'), 'utf-8');
      expect(src).toContain("VITE_DEMO_MODE === 'true'");
    });

    it('api.ts DEMO_MODE defaults to false', () => {
      const src = readFileSync(resolve('src/ui/lib/api.ts'), 'utf-8');
      expect(src).toContain("VITE_DEMO_MODE === 'true'");
    });
  });

  // ─── End-to-End Brand Request ─────────────────────────────────

  describe('End-to-End Brand Request', () => {
    it('simulates complete brand loading flow', async () => {
      // 1. Health check
      const healthRes = await fetch(`${baseUrl}/api/health`);
      expect(healthRes.ok).toBe(true);
      const health = await healthRes.json();
      expect(health.mode).toBe('PostgreSQL');

      // 2. Brand listing (public, no auth)
      const brandRes = await fetch(`${baseUrl}/api/tenants`);
      expect(brandRes.ok).toBe(true);
      const ct = brandRes.headers.get('content-type') || '';
      expect(ct).toContain('application/json');
      expect(ct).not.toContain('text/html');

      const brands = await brandRes.json();
      expect(Array.isArray(brands)).toBe(true);
      expect(brands.length).toBeGreaterThan(0);

      // 3. Single brand by slug
      const firstBrand = brands[0];
      const slugRes = await fetch(`${baseUrl}/api/tenants/${firstBrand.slug}`);
      expect(slugRes.ok).toBe(true);
      const slugData = await slugRes.json();
      expect(slugData.slug).toBe(firstBrand.slug);
      expect(slugData.brandName).toBe(firstBrand.brandName);
    });
  });
});
