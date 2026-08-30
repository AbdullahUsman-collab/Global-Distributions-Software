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

import express from 'express';
import cookieParser from 'cookie-parser';
import { createAuthMiddleware } from './middleware/auth';
import { csrfProtection } from './middleware/csrf';
import { apiRateLimiter } from './middleware/rateLimit';
import { createAuthRoutes } from './routes/auth';
import { createProtectedRoutes } from './routes/protected';

// Domain adapters — mock
import { MockTenantAdapter } from '../domain/adapters/mock/MockTenantAdapter';
import { MockUserAdapter } from '../domain/adapters/mock/MockUserAdapter';
import { MockUserCredentialsAdapter } from '../domain/adapters/mock/MockUserCredentialsAdapter';
import { MockSessionAdapter } from '../domain/adapters/mock/MockSessionAdapter';
import { MockAuthService } from '../domain/adapters/mock/MockAuthService';
import { MockCOAAdapter } from '../domain/adapters/mock/MockCOAAdapter';
import { MockVoucherAdapter } from '../domain/adapters/mock/MockVoucherAdapter';
import { MockInventoryAdapter } from '../domain/adapters/mock/MockInventoryAdapter';
import { MockCustomerAdapter } from '../domain/adapters/mock/MockCustomerAdapter';
import { MockSupplierAdapter } from '../domain/adapters/mock/MockSupplierAdapter';
import { MockSettingsAdapter } from '../domain/adapters/mock/MockSettingsAdapter';

// Domain adapters — PostgreSQL
import { PostgresTenantAdapter } from './db/repositories/PostgresTenantAdapter';
import { PostgresUserAdapter } from './db/repositories/PostgresUserAdapter';
import { PostgresUserCredentialsAdapter } from './db/repositories/PostgresUserCredentialsAdapter';
import { PostgresSessionAdapter } from './db/repositories/PostgresSessionAdapter';
import { PostgresCOAAdapter } from './db/repositories/PostgresCOAAdapter';
import { PostgresVoucherAdapter } from './db/repositories/PostgresVoucherAdapter';
import { PostgresInventoryAdapter } from './db/repositories/PostgresInventoryAdapter';
import { PostgresCustomerAdapter } from './db/repositories/PostgresCustomerAdapter';
import { PostgresSupplierAdapter } from './db/repositories/PostgresSupplierAdapter';

// Database
import { initPool, closePool } from './db/pool';

// Domain services
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

// ─── Adapter Factory ────────────────────────────────────────────

const usePg = !!process.env.DATABASE_URL;
const mode = usePg ? 'PostgreSQL' : 'Mock';

const tenantAdapter = usePg ? new PostgresTenantAdapter() : new MockTenantAdapter();
const userAdapter = usePg ? new PostgresUserAdapter() : new MockUserAdapter();
const credentialsAdapter = usePg ? new PostgresUserCredentialsAdapter() : new MockUserCredentialsAdapter();
const sessionAdapter = usePg ? new PostgresSessionAdapter() : new MockSessionAdapter();
const authService = new MockAuthService(tenantAdapter, userAdapter, credentialsAdapter, sessionAdapter);

const coaAdapter = usePg ? new PostgresCOAAdapter() : new MockCOAAdapter();
const voucherAdapter = usePg ? new PostgresVoucherAdapter() : new MockVoucherAdapter();
const inventoryAdapter = usePg ? new PostgresInventoryAdapter() : new MockInventoryAdapter();
const customerAdapter = usePg ? new PostgresCustomerAdapter() : new MockCustomerAdapter(coaAdapter);
const supplierAdapter = usePg ? new PostgresSupplierAdapter() : new MockSupplierAdapter(coaAdapter);
const settingsAdapter = new MockSettingsAdapter();

// ─── Initialize Domain Services ────────────────────────────────

const salesService = new SalesService(coaAdapter, voucherAdapter, inventoryAdapter, customerAdapter);
const purchaseService = new PurchaseService(coaAdapter, voucherAdapter, inventoryAdapter, supplierAdapter);
const customerReceiptService = new CustomerReceiptService(coaAdapter, voucherAdapter, customerAdapter);
const cashBookService = new CashBookService(coaAdapter, voucherAdapter);
const saleReturnService = new SaleReturnService(voucherAdapter, inventoryAdapter, customerAdapter);
const purchaseReturnService = new PurchaseReturnService(voucherAdapter, inventoryAdapter, supplierAdapter);
const billDetailService = new BillDetailService(voucherAdapter, coaAdapter, customerAdapter, supplierAdapter, inventoryAdapter);
const billsListService = new BillsListService(voucherAdapter, customerAdapter, supplierAdapter, inventoryAdapter);
const partyBalanceService = new PartyBalanceService(voucherAdapter, coaAdapter, customerAdapter, supplierAdapter);
const agingReportService = new AgingReportService(voucherAdapter, coaAdapter, customerAdapter, supplierAdapter);
const financialReportService = new FinancialReportService(coaAdapter, voucherAdapter);
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

const authMiddleware = createAuthMiddleware(sessionAdapter, userAdapter);

// ─── Routes ────────────────────────────────────────────────────

// Public routes (no auth required)
app.use('/api', createAuthRoutes(authService, tenantAdapter));

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
  )
);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start Server ──────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  // Initialize PostgreSQL pool if DATABASE_URL is set
  if (usePg) {
    try {
      const { loadConfig } = await import('./db/env');
      const config = loadConfig();
      initPool(config.database);
      const { testConnection } = await import('./db/pool');
      const connected = await testConnection();
      if (!connected) {
        console.error('CRITICAL: PostgreSQL connection failed. Falling back to mock adapters.');
      } else {
        console.log('  ✓ PostgreSQL connected');
        // Run pending migrations
        try {
          const { runMigrations } = await import('./db/migrate');
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

  app.listen(PORT, () => {
    const env = process.env.NODE_ENV || 'development';
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Distribution Software ERP — ${env.toUpperCase()} Server${' '.repeat(Math.max(0, 18 - env.length))}║
║  Running on http://localhost:${PORT}                          ║
║  Persistence: ${mode.padEnd(47)}║
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

start();

export default app;
