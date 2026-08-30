# Step 36 — PostgreSQL Vertical Slice: Complete Sales Workflow

## Summary
Implemented the complete PostgreSQL-backed Sales workflow as a vertical slice covering authentication, API routes, database adapters, security hardening, and integration tests. All 466 unit tests pass; integration tests are marked PENDING REAL DATABASE SETUP.

## What Was Done

### Phase 0 — Audit (audit/53)
Full repository audit identifying 10 critical issues across adapters, routes, and security. See audit/53 for details.

### Phase 1 — Migration Runner
- Created `src/server/db/migrate.ts` with `schema_migrations` tracking table
- Idempotent: tracks applied migrations, skips already-applied
- Integrated into server startup (runs before Express listen)

### Phase 2–4 — Adapter Fixes
- **PostgresVoucherAdapter**: `deleteVoucher` wrapped in BEGIN/COMMIT/ROLLBACK transaction
- **PostgresVoucherAdapter**: `getNextVoucherNumberTx` uses `FOR UPDATE` to prevent race conditions
- **PostgresInventoryAdapter**: `postStockMovement` now updates `stock_levels` with AVCO for GRN/RETURN, validates stock for ISSUE, handles TRANSFER/ADJUSTMENT in transactions
- **PostgresInventoryAdapter**: `cancelStockMovement` reverses stock effects for POSTED movements

### Phase 5 — API Routes
Added to `src/server/routes/protected.ts`:
- `POST /sale-returns` — create sale return
- `POST /sale-returns/:id/post` — post sale return
- `DELETE /sale-returns/:id` — delete sale return (DRAFT only)
- `GET /customer-balances` — outstanding balances
- `GET /supplier-balances` — supplier balances
- `GET /aging-report` — aging report with mode/date/party filters
- `GET /dashboard` — dashboard data with period filters
- `GET /ledger` — ledger entries with filters
- `GET /ledger/:accountId` — account-specific ledger
- `GET /accounts` — chart of accounts
- `GET /products` — products list
- `GET /stock-levels` — stock levels
- `GET /warehouses` — warehouses
- Fixed `listBills` → `getAllBills` bug in existing route

### Phase 6 — API Client
Created `src/ui/lib/api.ts` — centralized HTTP client:
- All requests use `credentials: 'include'` for HTTP-only cookie sessions
- CSRF token on state-changing requests
- Consistent error handling with `ApiError` type
- Covers: sales, sale-returns, bills, customer-balances, aging, dashboard, ledger, accounts, products, stock, warehouses, purchases, receipts, cash-book

### Phase 7 — Stock Level Updates
PostgresInventoryAdapter `postStockMovement` fully implemented:
- GRN: increases stock, updates AVCO
- RETURN: decreases stock, updates AVCO
- ISSUE: validates sufficient stock, decreases stock
- TRANSFER: decreases source, increases destination
- ADJUSTMENT: sets stock to specified quantity

### Phase 8 — Integration Tests
Created `src/server/PostgresSalesWorkflow.integration.test.ts`:
- 14 unit tests (always run): adapter file existence, migration file, API client
- 9 integration tests (PENDING REAL DB): login, create/post/delete sale, bill retrieval, tenant isolation, ledger, dashboard
- Skipped when `DATABASE_URL` not set

### Phase 9 — Security Hardening
**SQL Injection Fixes (5 files):**
- PostgresCOAAdapter: column whitelist `ACCOUNT_UPDATE_COLUMNS`
- PostgresCustomerAdapter: column whitelist `CUSTOMER_UPDATE_COLUMNS`
- PostgresInventoryAdapter: column whitelist `PRODUCT_UPDATE_COLUMNS`
- PostgresSupplierAdapter: column whitelist `SUPPLIER_UPDATE_COLUMNS`
- PostgresTenantAdapter: column whitelist `TENANT_UPDATE_COLUMNS`
- All `update*()` methods now validate DTO keys against whitelist before interpolation

**Input Validation Fixes:**
- Added `validateSaleReturnDTO` and `validateSaleReturnLines` to validation.ts
- Added body validation to `POST /sale-returns` route
- Added line-level validation (productId, packs, rate, tax rates)

**Security Audit Results:**
- IDOR: NONE FOUND — all routes pass tenantId from session
- Mass Assignment: NONE FOUND — tenantId/createdBy always from server session
- Missing Tenant Isolation: NONE FOUND — all queries filter by tenant_id
- SQL Injection: FIXED — column whitelists prevent interpolation attacks

## Files Changed
| File | Change |
|------|--------|
| `src/server/db/migrate.ts` | NEW — migration runner |
| `src/server/db/repositories/PostgresCOAAdapter.ts` | Column whitelist for updateAccount |
| `src/server/db/repositories/PostgresCustomerAdapter.ts` | Column whitelist for updateCustomer |
| `src/server/db/repositories/PostgresInventoryAdapter.ts` | Column whitelist for updateProduct, full postStockMovement/cancelStockMovement |
| `src/server/db/repositories/PostgresSupplierAdapter.ts` | Column whitelist for update |
| `src/server/db/repositories/PostgresTenantAdapter.ts` | Column whitelist for updateTenant |
| `src/server/db/repositories/PostgresVoucherAdapter.ts` | Transactional delete, FOR UPDATE on voucher numbers |
| `src/server/index.ts` | New service imports, migration runner, createProtectedRoutes updated |
| `src/server/lib/validation.ts` | validateSaleReturnDTO, validateSaleReturnLines |
| `src/server/routes/protected.ts` | 14 new routes, sale return validation, listBills→getAllBills fix |
| `src/ui/lib/api.ts` | NEW — centralized API client |
| `src/server/PostgresSalesWorkflow.integration.test.ts` | NEW — integration test suite |

## Test Results
- **466 passed** (unit tests)
- **9 skipped** (PostgreSQL integration — PENDING REAL DB)
- **0 failed**
- TypeScript: clean
- Build: pass

## Known Limitations
- Integration tests require real PostgreSQL (`DATABASE_URL`) — not yet configured
- SSL `rejectUnauthorized: false` noted as security concern for production
- Cost_rate formula UNKNOWN — blocks COGS → GL (from audit/08)
- Sales.tsx UI not yet migrated to use API client (still calls domain services directly)

## Next Steps
1. Configure real PostgreSQL database and run migrations
2. Run integration tests against real database
3. Migrate Sales.tsx from direct service calls to API client
4. Migrate BillsList.tsx, BillDetail.tsx similarly
5. Accounting reconciliation: prove DR=CR for test sale
6. Performance audit: N+1 queries, missing indexes
