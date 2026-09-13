/**
 * Production Development Server
 * Express-based backend with server-side authentication, RBAC, and tenant isolation.
 *
 * SECURITY FEATURES:
 * - HTTP-only cookie sessions (no localStorage exposure)
 * - Cryptographically secure session tokens
 * - Server-side RBAC authorization on all mutations
 * - Tenant isolation enforced server-side
 * - CSRF protection for state-changing requests
 * - Rate limiting on login and mutations
 * - Input validation on all endpoints
 * - Generic error messages (no credential enumeration)
 *
 * ADAPTER MODE:
 * - If DATABASE_URL is set: uses PostgreSQL adapters (production)
 * - If DATABASE_URL is not set: uses mock adapters (development)
 */

// Load .env BEFORE any other imports so process.env is populated
import 'dotenv/config';

import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { createAuthMiddleware } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { createAuthRoutes, createTenantRoutes } from './routes/auth.js';
import { createProtectedRoutes } from './routes/protected.js';
import { createSystemRoutes } from './routes/system.js';

// Domain adapters — mock
import { MockTenantAdapter } from '../domain/adapters/mock/MockTenantAdapter.js';
import { MockUserAdapter } from '../domain/adapters/mock/MockUserAdapter.js';
import { MockUserCredentialsAdapter } from '../domain/adapters/mock/MockUserCredentialsAdapter.js';
import { MockSessionAdapter } from '../domain/adapters/mock/MockSessionAdapter.js';
import { MockAuthService } from '../domain/adapters/mock/MockAuthService.js';
import { MockCOAAdapter } from '../domain/adapters/mock/MockCOAAdapter.js';
import { MockVoucherAdapter } from '../domain/adapters/mock/MockVoucherAdapter.js';
import { MockInventoryAdapter } from '../domain/adapters/mock/MockInventoryAdapter.js';
import { MockCustomerAdapter } from '../domain/adapters/mock/MockCustomerAdapter.js';
import { MockSupplierAdapter } from '../domain/adapters/mock/MockSupplierAdapter.js';
import { MockSettingsAdapter } from '../domain/adapters/mock/MockSettingsAdapter.js';
import { MockUserBrandAccessAdapter } from '../domain/adapters/mock/MockUserBrandAccessAdapter.js';

// Domain adapters — PostgreSQL
import { PostgresTenantAdapter } from './db/repositories/PostgresTenantAdapter.js';
import { PostgresUserAdapter } from './db/repositories/PostgresUserAdapter.js';
import { PostgresUserCredentialsAdapter } from './db/repositories/PostgresUserCredentialsAdapter.js';
import { PostgresSessionAdapter } from './db/repositories/PostgresSessionAdapter.js';
import { PostgresCOAAdapter } from './db/repositories/PostgresCOAAdapter.js';
import { PostgresVoucherAdapter } from './db/repositories/PostgresVoucherAdapter.js';
import { PostgresInventoryAdapter } from './db/repositories/PostgresInventoryAdapter.js';
import { PostgresCustomerAdapter } from './db/repositories/PostgresCustomerAdapter.js';
import { PostgresSupplierAdapter } from './db/repositories/PostgresSupplierAdapter.js';
import { PostgresSettingsAdapter } from './db/repositories/PostgresSettingsAdapter.js';
import { PostgresUserBrandAccessAdapter } from './db/repositories/PostgresUserBrandAccessAdapter.js';

// Database
import { initPool, closePool } from './db/pool.js';

// Domain services
import { SalesService } from '../domain/services/SalesService.js';
import { PurchaseService } from '../domain/services/PurchaseService.js';
import { CustomerReceiptService } from '../domain/services/CustomerReceiptService.js';
import { CashBookService } from '../domain/services/CashBookService.js';
import { SaleReturnService } from '../domain/services/SaleReturnService.js';
import { PurchaseReturnService } from '../domain/services/PurchaseReturnService.js';
import { BillDetailService } from '../domain/services/BillDetailService.js';
import { BillsListService } from '../domain/services/BillsListService.js';
import { PartyBalanceService } from '../domain/services/PartyBalanceService.js';
import { AgingReportService } from '../domain/services/AgingReportService.js';
import { DashboardService } from '../domain/services/DashboardService.js';
import { FinancialReportService } from '../domain/services/FinancialReportService.js';
import { StockReportService } from '../domain/services/StockReportService.js';

// ─── Adapter Factory ────────────────────────────────────────────

const usePg = !!process.env.DATABASE_URL;
const mode = usePg ? 'PostgreSQL' : 'Mock';

const tenantAdapter = usePg ? new PostgresTenantAdapter() : new MockTenantAdapter();
const userAdapter = usePg ? new PostgresUserAdapter() : new MockUserAdapter();
const credentialsAdapter = usePg ? new PostgresUserCredentialsAdapter() : new MockUserCredentialsAdapter();
const sessionAdapter = usePg ? new PostgresSessionAdapter() : new MockSessionAdapter();
const brandAccessAdapter = usePg ? new PostgresUserBrandAccessAdapter() : new MockUserBrandAccessAdapter();
const authService = new MockAuthService(tenantAdapter, userAdapter, credentialsAdapter, sessionAdapter, brandAccessAdapter, usePg);

const coaAdapter = usePg ? new PostgresCOAAdapter() : new MockCOAAdapter();
const voucherAdapter = usePg ? new PostgresVoucherAdapter() : new MockVoucherAdapter();
const inventoryAdapter = usePg ? new PostgresInventoryAdapter() : new MockInventoryAdapter();
const customerAdapter = usePg ? new PostgresCustomerAdapter() : new MockCustomerAdapter(coaAdapter);
const supplierAdapter = usePg ? new PostgresSupplierAdapter() : new MockSupplierAdapter(coaAdapter);
const settingsAdapter = usePg ? new PostgresSettingsAdapter() : new MockSettingsAdapter();

// ─── Initialize Domain Services ────────────────────────────────

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

// ─── CORS Configuration ────────────────────────────────────────

function getCorsOrigins(): string[] {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    // Production: explicit allowed origins
    const origins = process.env.ALLOWED_ORIGINS;
    if (!origins) {
      console.error('CRITICAL: ALLOWED_ORIGINS not set in production');
      return [];
    }
    return origins.split(',').map(o => o.trim());
  }
  // Development: allow localhost
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
}

/**
 * Detect cross-origin production deployment.
 * When frontend and backend are on different domains,
 * cookies must use SameSite=None; Secure.
 */
function isCrossOriginProduction(): boolean {
  return process.env.NODE_ENV === 'production' && !!process.env.ALLOWED_ORIGINS;
}

/**
 * Get cookie SameSite setting based on deployment mode.
 */
function getCookieSameSite(): 'strict' | 'lax' | 'none' {
  if (isCrossOriginProduction()) return 'none';
  if (process.env.NODE_ENV === 'production') return 'strict';
  return 'lax';
}

// ─── Express App ───────────────────────────────────────────────

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Cookie parsing
app.use(cookieParser(process.env.COOKIE_SECRET || 'dev-only-cookie-secret'));

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getCorsOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    // Development: allow any localhost origin
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:5173');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

// Rate limiting on all API routes
app.use('/api', apiRateLimiter);

// CSRF protection for state-changing requests
app.use('/api', csrfProtection);

// ─── Auth Middleware (applied to protected routes) ─────────────

const authMiddleware = createAuthMiddleware(sessionAdapter, userAdapter, brandAccessAdapter);

// ─── Routes ────────────────────────────────────────────────────

// Public routes (no auth required)
app.use('/api/auth', createAuthRoutes(authService, tenantAdapter));
app.use('/api', createTenantRoutes(tenantAdapter));

// System bootstrap routes (public, but restricted by logic)
app.use('/api/system', createSystemRoutes(
  tenantAdapter,
  userAdapter,
  credentialsAdapter,
  brandAccessAdapter,
  sessionAdapter
));

// Health check (no auth required — registered before protected routes)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode });
});

// Protected routes (auth + RBAC required)
app.use('/api',
  authMiddleware,
    createProtectedRoutes(
      salesService,
      purchaseService,
      customerReceiptService,
      cashBookService,
      saleReturnService,
      purchaseReturnService,
      billDetailService,
      billsListService,
      partyBalanceService,
      agingReportService,
      dashboardService,
      coaAdapter,
      voucherAdapter,
      inventoryAdapter,
      customerAdapter,
      supplierAdapter,
      settingsAdapter,
      financialReportService,
      stockReportService,
      userAdapter,
      brandAccessAdapter,
      tenantAdapter,
    )
);

// ─── SPA Fallback ──────────────────────────────────────────────
// Serves the SPA for all non-API routes (supports client-side routing,
// page refresh, and direct URL navigation).
const distPath = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');
const hasDist = fs.existsSync(indexPath);

// For non-API GET requests, serve the SPA index.html
// This enables client-side routing (React Router) to handle the path
app.get(/^(?!\/api\/).*/, (req, res) => {
  if (hasDist) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'SPA not built. Run "npm run build" first.' });
  }
});

// ─── Start Server ──────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000', 10);

async function initDatabase() {
  if (usePg) {
    try {
      const { loadConfig } = await import('./db/env.js');
      const config = loadConfig();
      initPool(config.database);
      const { testConnection } = await import('./db/pool.js');
      const connected = await testConnection();
      if (!connected) {
        console.error('CRITICAL: PostgreSQL connection failed. Falling back to mock adapters.');
      } else {
        console.log('  ✓ PostgreSQL connected');
        try {
          const { runMigrations } = await import('./db/migrate.js');
          const applied = await runMigrations();
          if (applied.length > 0) {
            console.log(`  ✓ Applied ${applied.length} migration(s)`);
          }
        } catch (err) {
          console.error('  ✗ Migration failed:', err);
        }
      }
    } catch (err) {
      console.error('CRITICAL: PostgreSQL initialization failed:', err);
    }
  }
}

async function start() {
  await initDatabase();

  app.listen(PORT, () => {
    const env = process.env.NODE_ENV || 'development';
    const modeLabel = usePg ? 'PostgreSQL' : 'DEMO MODE (In-Memory)';
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Distribution Software ERP — ${env.toUpperCase()} Server${' '.repeat(Math.max(0, 18 - env.length))}║
║  Running on http://localhost:${PORT}                          ║
║  Persistence: ${modeLabel.padEnd(47)}║${!usePg ? '\n║  ⚠  DEMO MODE — Using in-memory mock data               ║' : ''}
║                                                              ║
║  Security Features:                                          ║
║  ✓ HTTP-only cookie sessions                                 ║
║  ✓ Server-side RBAC authorization                           ║
║  ✓ Tenant isolation enforced server-side                     ║
║  ✓ CSRF protection                                           ║
║  ✓ Rate limiting (login: 10/15min, API: 100/15min)          ║
║  ✓ Input validation                                          ║
║  ✓ Secure session tokens (crypto.randomBytes)                ║
║  ✓ Real password hashing (bcrypt)                            ║
║                                                              ║
║  Endpoints:                                                  ║
║  - GET  /api/health          Health check                    ║
║  - GET  /api/tenants         List tenants (public)           ║
║  - POST /api/auth/login      Login (rate-limited)            ║
║  - GET  /api/auth/me         Current user (auth required)    ║
║  - POST /api/auth/logout     Logout                          ║
║  - POST /api/sales           Create sale (sales.create)      ║
║  - POST /api/sales/:id/post  Post sale (sales.post)          ║
║  - DELETE /api/sales/:id     Delete sale (sales.delete)      ║
║  - POST /api/purchases       Create purchase                 ║
║  - POST /api/purchases/:id/post  Post purchase               ║
║  - DELETE /api/purchases/:id     Delete purchase             ║
║  - POST /api/customer-receipts  Create receipt               ║
║  - POST /api/cash-book       Create cash voucher             ║
║  - GET  /api/bills           List bills                      ║
║  - GET  /api/bills/:id       Bill detail                     ║
║  - GET  /api/brands          List brands (admin)             ║
║  - POST /api/brands          Create brand (admin)            ║
║  - PUT  /api/brands/:id      Update brand (admin)            ║
║  - GET  /api/users           List users (admin)              ║
║  - POST /api/users           Create user (admin)             ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (usePg) await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  if (usePg) await closePool();
  process.exit(0);
});

// Initialize database (both Vercel serverless and local)
// This promise resolves when the database pool is ready (or immediately if no DATABASE_URL).
export const dbReady: Promise<void> = initDatabase();

// Only start the HTTP server when running directly (not as a Vercel serverless function).
if (!process.env.VERCEL) {
  start();
}

export default app;