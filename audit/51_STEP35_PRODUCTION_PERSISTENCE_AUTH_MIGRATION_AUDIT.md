# Step 35 — Pre-Implementation Audit: Production Persistence & Auth Migration

**Date:** 2026-08-30

---

## 1. Current Architecture

### Layer Stack
```
UI (React 19) → services.ts (DI container) → Domain Services → Repository Interfaces → Mock Adapters (in-memory)
Express Server → Domain Services → Repository Interfaces → Mock Adapters (in-memory)
```

### Data Flow
- **UI**: Calls `services.salesService.createSaleBill(...)` directly (in-browser)
- **Server**: Creates independent mock adapter instances, exposes via Express routes
- **Vite**: Proxies `/api` to `localhost:3000`

---

## 2. Repository Interface Inventory

| Interface | Methods | Tenant-Scoped? |
|---|---|---|
| `ITenantRepository` | getPublicTenants, getTenantBySlug, getTenantById, createTenant, updateTenant, deactivateTenant | No (tenant is the entity) |
| `IUserRepository` | findByUsername(tenantId, username), findById(id), isUserActive(id), getUsersByTenant(tenantId), createUser, updateUser, deactivateUser | Partially (findByUsername/getUsersByTenant scoped, findById not) |
| `IUserCredentialsRepository` | getCredentialsByUsername(tenantId, username), getCredentialsByUserId(userId), storeCredentials, updateCredentials, hasCredentials | Partially |
| `ISessionRepository` | createSession(tenantId, userId), getSession(sessionId), deleteSession, deleteAllUserSessions, cleanupExpiredSessions | No (sessionId is global key) |
| `ISettingsRepository` | getSettingsByTenantId, updateSettings | Yes |
| `ICOARepository` | getAccountsByTenantId, getAccountById(tenantId, id), getAccountByCode(tenantId, code), createAccount, updateAccount, deactivateAccount | Yes |
| `IVoucherRepository` | getVouchersByTenantId, getVoucherById(tenantId, id), getNextVoucherNumber, getVoucherLines, createVoucher, updateVoucher, deleteVoucher, postVoucher, getLedgerEntries, getLedgerForAccount | Yes |
| `IInventoryRepository` | getProducts, getProductById, createProduct, updateProduct, deactivateProduct, getWarehouses, getWarehouseLocations, getStockLevels, getStockLevelForProduct, getStockMovements, getStockMovementById, createStockMovement, postStockMovement, cancelStockMovement, getBatches, getSerials | Yes |
| `ICustomerRepository` | getCustomersByTenantId, getCustomerById(tenantId, id), getCustomerByAccountHeadId, createCustomer, updateCustomer, deactivateCustomer, searchCustomers | Yes |
| `ISupplierRepository` | getSuppliers, getById, getByAccountHeadId, create, update, deactivate, search | Yes (except getById/getByAccountHeadId which take tenantId as param) |

---

## 3. Mock Adapter Storage Patterns

| Adapter | Storage | Seed Data |
|---|---|---|
| MockTenantAdapter | Module-level `let tenants: Tenant[]` | 3 demo tenants |
| MockUserAdapter | Module-level `let users: User[]` | 6 users across 3 tenants |
| MockUserCredentialsAdapter | Module-level `let credentials: UserCredentials[]` | 6 entries with mock bcrypt hashes |
| MockSessionAdapter | Module-level `let sessions: Map<string, UserSession>` | Empty (created at login) |
| MockCOAAdapter | Per-tenant `Map<string, AccountHead[]>` | ~48 accounts per tenant (4-level hierarchy) |
| MockVoucherAdapter | Per-tenant Maps: headers, lines, ledger, counter | ~10 vouchers per tenant |
| MockInventoryAdapter | 7 per-tenant Maps: products, warehouses, locations, stockLevels, movements, batches, serials | ~8 products, 2 warehouses per tenant |
| MockCustomerAdapter | Per-tenant `Map<string, Customer[]>` | ~5 customers per tenant (auto-creates AR accounts) |
| MockSupplierAdapter | Per-tenant `Map<string, Supplier[]>` | ~5 suppliers per tenant (auto-creates AP accounts) |
| MockSettingsAdapter | Per-tenant `Map<string, TenantSettings>` | Default settings per tenant |

---

## 4. Auth/Session Inventory

### Password Verification
- `MockAuthService.mockVerifyPassword()`: `storedHash.toLowerCase().includes(password.toLowerCase())`
- **INSECURE** — development only
- MockUserCredentialsAdapter stores: `$2b$10$mockHashFor{Password}{TenantName}`

### Session Management
- `MockSessionAdapter`: In-memory `Map<string, UserSession>`
- Session ID: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
- **PREDICTABLE** — `Math.random()` not cryptographically secure
- TTL: 30 minutes, checked lazily on read

### Cookie Configuration
- Name: `erp_session`
- Settings: httpOnly, secure (prod), sameSite strict (prod), 30-min maxAge
- **Session token is now generated securely** via `crypto.randomBytes(32)` (Step 34)

---

## 5. Direct UI → Domain Service Calls

| UI Page | Direct Service Call | Server API Available? |
|---|---|---|
| Login.tsx | `apiLogin()` ✅ (migrated) | POST /api/auth/login |
| ProtectedRoute.tsx | `apiGetMe()` ✅ (migrated) | GET /api/auth/me |
| Header.tsx | `apiLogout()` ✅ (migrated) | POST /api/auth/logout |
| Sales.tsx | `services.salesService.*` ❌ | POST /api/sales, POST/DELETE |
| Purchases.tsx | `services.purchaseService.*` ❌ | POST /api/purchases, POST/DELETE |
| CustomerReceipts.tsx | `services.customerReceiptService.*` ❌ | POST /api/customer-receipts |
| CashBook.tsx | `services.cashBookService.*` ❌ | POST /api/cash-book |
| Bills.tsx | `services.billDetailService.*` ❌ | GET /api/bills, GET /api/bills/:id |
| Dashboard.tsx | `services.dashboardService.*` ❌ | Not yet |
| Finance.tsx | `services.financialReportService.*` ❌ | Not yet |
| Inventory.tsx | `services.inventoryRepository.*` ❌ | Not yet |
| AgingReport.tsx | `services.agingReportService.*` ❌ | Not yet |
| Settings.tsx | `services.settingsRepository.*` ❌ | Not yet |

---

## 6. Existing Server API Endpoints

| Endpoint | Auth | RBAC | Status |
|---|---|---|---|
| GET /api/tenants | None | None | ✅ Working |
| POST /api/auth/login | Rate-limited | None | ✅ Working |
| GET /api/auth/me | Cookie | None | ✅ Working |
| POST /api/auth/logout | Cookie | None | ✅ Working |
| POST /api/sales | Cookie | sales.create | ✅ Working |
| POST /api/sales/:id/post | Cookie | sales.post | ✅ Working |
| DELETE /api/sales/:id | Cookie | sales.delete | ✅ Working |
| POST /api/purchases | Cookie | purchases.create | ✅ Working |
| POST /api/purchases/:id/post | Cookie | purchases.post | ✅ Working |
| DELETE /api/purchases/:id | Cookie | purchases.delete | ✅ Working |
| POST /api/customer-receipts | Cookie | receipts.create | ✅ Working |
| POST /api/cash-book | Cookie | cash.create | ✅ Working |
| GET /api/bills | Cookie | bills.view | ✅ Working |
| GET /api/bills/:id | Cookie | bills.view | ✅ Working |
| GET /api/health | None | None | ✅ Working |

---

## 7. Proposed Migration Plan

### Phase 1: Password Hashing
- Install `argon2` (preferred) or `bcrypt`
- Create `src/server/lib/password.ts` with `hashPassword()` and `verifyPassword()`
- Update MockAuthService to use real password verification
- Generate deterministic hashes for demo users

### Phase 2: Database Foundation
- Install `pg` + `@types/pg`
- Create `src/server/db/pool.ts` — PostgreSQL connection pool
- Create `src/server/db/env.ts` — environment configuration
- Create `.env.example`
- Create migration system: `src/server/db/migrations/`

### Phase 3: Database Schema
- Tables: tenants, users, user_credentials, sessions, accounts, vouchers, voucher_lines, ledger_entries, products, warehouses, warehouse_locations, stock_levels, stock_movements, customers, suppliers, settings
- Every tenant-owned table gets `tenant_id` column with index
- Foreign keys for data integrity

### Phase 4: PostgreSQL Repositories
- Create `src/server/db/repositories/` directory
- Implement each repository interface behind PostgreSQL
- Keep mock adapters for unit tests
- Server can use either mock or PostgreSQL adapters based on config

### Phase 5: Session Persistence
- PostgreSQL session table with hashed token lookup
- Cookie contains opaque token; DB stores `sha256(token)` for lookup
- 30-minute TTL enforced server-side
- Logout = DELETE from sessions table

### Phase 6: Server Configuration
- If `DATABASE_URL` is set → use PostgreSQL adapters
- If not → fall back to mock adapters (development mode)
- This preserves backward compatibility during migration

### Phase 7: Vertical Slice Migration
- Migrate Sales workflow completely: create → post → bill detail → ledger → inventory → dashboard
- UI calls Express API instead of direct domain services

### Phase 8: Database Transactions
- All multi-write accounting operations wrapped in transactions
- Sale posting: voucher + lines + ledger + stock = atomic
- Rollback on any failure

---

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| argon2 native compilation fails on Windows | HIGH | Fall back to bcrypt |
| PostgreSQL not available in dev | MEDIUM | Mock adapter fallback |
| Existing tests break | HIGH | Mock adapters preserved, integration tests separate |
| Database connection pool exhaustion | MEDIUM | Configure pool limits, connection timeout |
| Migration schema errors | HIGH | Test against real PostgreSQL before committing |
| Session token hashing collision | LOW | SHA-256 has negligible collision probability |
| COGS formula unknown | BLOCKER | Document only, do not fabricate |

---

## 9. Compatibility Strategy

- **Mock adapters preserved**: All existing 439 unit tests continue using mocks
- **PostgreSQL adapters additive**: New implementations behind same interfaces
- **Server fallback**: If DATABASE_URL not set, server uses mock adapters (current behavior)
- **UI unchanged**: Domain service calls remain during this step (API migration in Step 36)
- **Accounting logic untouched**: No changes to SalesService, PurchaseService, etc.
