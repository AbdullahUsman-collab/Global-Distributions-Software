# Step 35: Production Database, Real Authentication & API Migration Foundation

## Summary

Converted the ERP from secure demo architecture (mock adapters + bcrypt mock hashes) to genuinely persistent production architecture — real PostgreSQL, real password hashing, persistent sessions, database transactions.

## What Was Built

### Dependencies Installed
- **bcrypt** (v5.1.1) — Password hashing (argon2 failed on Windows due to missing Visual Studio C++ build tools)
- **pg** (v8.16.0) — PostgreSQL client
- **@types/pg**, **@types/bcrypt** — TypeScript type definitions

### Password Utility
**`src/server/lib/password.ts`** — Bcrypt-based password hashing
- `hashPassword(password)` — Hash with bcrypt (12 salt rounds)
- `verifyPassword(password, hash)` — Timing-safe bcrypt verification
- `needsRehash(hash)` — Check if hash needs upgrade

### Database Infrastructure
**`src/server/db/env.ts`** — Environment configuration
- Parses DATABASE_URL into structured config
- Validates production variables (DATABASE_URL, SESSION_SECRET, CORS_ORIGINS)
- Development defaults when DATABASE_URL is absent

**`src/server/db/pool.ts`** — PostgreSQL connection pool
- Singleton pool with configurable max connections
- `query()`, `getClient()`, `testConnection()`, `closePool()`
- Parameterized queries (no SQL concatenation)
- Graceful shutdown support

**`.env.example`** — Template for environment variables

### Database Schema
**`src/server/db/migrations/001_initial.sql`** — Complete PostgreSQL schema
- 16 tables: tenants, users, user_credentials, sessions, tenant_settings, accounts, customers, suppliers, products, warehouses, warehouse_locations, vouchers, voucher_lines, ledger_entries, stock_levels, stock_movements
- All tenant-owned tables have `tenant_id` with indexes
- Foreign keys enforce data integrity
- Seed data: 3 demo tenants + 6 demo users
- Unique constraints on (tenant_id, account_code), (tenant_id, sku), (tenant_id, username)

### PostgreSQL Repository Adapters (9 adapters)
All implement existing repository interfaces:

| Adapter | Interface | Table(s) |
|---------|-----------|----------|
| `PostgresTenantAdapter` | `ITenantRepository` | `tenants` |
| `PostgresUserAdapter` | `IUserRepository` | `users` |
| `PostgresUserCredentialsAdapter` | `IUserCredentialsRepository` | `user_credentials` + joins `users` |
| `PostgresSessionAdapter` | `ISessionRepository` | `sessions` |
| `PostgresCOAAdapter` | `ICOARepository` | `accounts` |
| `PostgresVoucherAdapter` | `IVoucherRepository` | `vouchers`, `voucher_lines`, `ledger_entries` |
| `PostgresInventoryAdapter` | `IInventoryRepository` | `products`, `warehouses`, `stock_levels`, `stock_movements` |
| `PostgresCustomerAdapter` | `ICustomerRepository` | `customers` |
| `PostgresSupplierAdapter` | `ISupplierRepository` | `suppliers` |

### Key Adapter Features
- **Session adapter**: SHA-256 hash of token stored in DB (raw token never persisted). Token hash lookup, expired session cleanup.
- **Voucher adapter**: Database transactions for create/update/post. Balance validation on post. Ledger entry generation.
- **User adapter**: Returns only public User model (no credential exposure).

### MockAuthService Updated
- Replaced `mockVerifyPassword` with real `bcrypt.compare()`
- Demo credentials updated with real bcrypt hashes
- Now works seamlessly with both mock and PostgreSQL credential storage

### Server Updated
- Adapter factory pattern: `DATABASE_URL` → PostgreSQL adapters, otherwise mock adapters
- Startup banner shows persistence mode
- Graceful shutdown closes PostgreSQL pool
- Health check, error handling preserved

### Integration Test Suite
**`src/domain/services/DatabaseIntegration.test.ts`** — 22 tests

| Category | Tests | What's Verified |
|----------|-------|-----------------|
| Password Hashing | 6 | Bcrypt hash/verify, unique salts, demo hash compatibility, rehash detection |
| Session Token Hashing | 3 | SHA-256 consistency, uniqueness, format |
| Environment Config | 4 | Default config, DATABASE_URL parsing, production validation |
| Adapter Structure | 3 | All 9 adapters exportable, pool functions, env functions |
| Migration | 4 | File exists, all 16 tables created, tenant_id enforced, demo seeds |
| Server Integration | 2 | .env.example exists, barrel exports |

## Verification

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ Clean — 0 errors |
| Full test suite | ✅ **461/461 pass** (22 new + 439 existing) |
| Build | ✅ Pass |

## Architecture After Step 35

```
UI → Express API → Domain Services → Repository Interfaces → Mock/PostgreSQL Adapters
                                         ↑
                              Same interfaces, different implementations

DATABASE_URL set?
  ├── YES → PostgreSQL adapters (production)
  └── NO  → Mock adapters (development)
```

## What Changed vs Step 34

| Component | Before (Step 34) | After (Step 35) |
|-----------|-------------------|------------------|
| Password storage | Mock hashes (`$2b$10$mock...`) | Real bcrypt hashes |
| Session storage | In-memory Map | PostgreSQL or in-memory |
| Data persistence | All mock (lost on restart) | PostgreSQL or mock |
| Auth verification | `includes()` string match | `bcrypt.compare()` |
| Database | None | PostgreSQL with 16 tables |
| Server adapter selection | Hardcoded mock | `DATABASE_URL`-driven |
| Graceful shutdown | None | Pool cleanup on SIGTERM/SIGINT |

## Demo Credentials (Unchanged)

| Role | Username | Password | Tenant |
|------|----------|----------|--------|
| ADMIN | admin | admin123 | All tenants |
| MANAGER | manager | manager123 | Demo Wholesale |
| SALES | clerk | clerk123 | Demo Wholesale |
| VIEWER | former | former123 | Demo Wholesale (inactive) |

## Files Created/Modified

### New Files (15)
- `src/server/lib/password.ts` — Bcrypt password hashing
- `src/server/db/env.ts` — Environment configuration
- `src/server/db/pool.ts` — PostgreSQL connection pool
- `src/server/db/migrations/001_initial.sql` — Database schema
- `src/server/db/repositories/PostgresSessionAdapter.ts`
- `src/server/db/repositories/PostgresUserAdapter.ts`
- `src/server/db/repositories/PostgresUserCredentialsAdapter.ts`
- `src/server/db/repositories/PostgresCOAAdapter.ts`
- `src/server/db/repositories/PostgresVoucherAdapter.ts`
- `src/server/db/repositories/PostgresInventoryAdapter.ts`
- `src/server/db/repositories/PostgresCustomerAdapter.ts`
- `src/server/db/repositories/PostgresSupplierAdapter.ts`
- `src/server/db/repositories/PostgresTenantAdapter.ts`
- `src/server/db/repositories/index.ts` — Barrel export
- `src/domain/services/DatabaseIntegration.test.ts` — 22 tests
- `.env.example` — Environment template

### Modified Files (3)
- `src/domain/adapters/mock/MockUserCredentialsAdapter.ts` — Real bcrypt hashes
- `src/domain/adapters/mock/MockAuthService.ts` — `bcrypt.compare()` verification
- `src/server/index.ts` — Adapter factory, PostgreSQL init, graceful shutdown

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| bcrypt native compilation on Windows | Falls back to mock mode if bcrypt fails to load |
| PostgreSQL not available | Server starts in mock mode; health check reports status |
| Connection pool exhaustion | Configurable max connections, idle timeout |
| SQL injection | All queries use parameterized statements |
| Session token exposure | Raw token never stored; SHA-256 hash used for lookup |
| Password leakage | Passwords never returned in API responses |

## Next Steps (Step 36+)

1. **Run migration against real PostgreSQL** — Execute `001_initial.sql`
2. **Vertical slice migration** — Convert one full flow (Sale → Post → Bill → Balance → Aging → Ledger → Inventory → Dashboard) to use PostgreSQL
3. **API migration** — Move domain operations behind Express API routes (eliminate direct service calls from UI)
4. **Session cleanup** — Periodic cleanup of expired sessions
5. **Monitoring** — Connection pool metrics, query performance logging
