# Step 36 — PostgreSQL Vertical Slice Audit

## Executive Summary
This audit maps the complete Sales vertical slice from UI through domain services to PostgreSQL adapters, identifying every dependency, bypass, and mismatch that must be resolved.

## A. SalesService Dependencies
- Constructor: `coaRepo`, `voucherRepo`, `inventoryRepo`, `customerRepo`
- Account codes: `41101` (Sales Revenue), `21201` (Sales Tax Output), `21202` (Withholding Tax), `21203` (FED Payable)
- `11301` (Inventory) and `51101` (COGS) declared but unused — COGS formula UNKNOWN

## B. Voucher Repository Operations
| Operation | Method | Tables |
|-----------|--------|--------|
| Create draft | `createVoucher` | vouchers, voucher_lines (transaction) |
| Post voucher | `postVoucher` | vouchers, ledger_entries (transaction) |
| Delete draft | `deleteVoucher` | voucher_lines, vouchers (NO transaction) |
| Get by ID | `getVoucherById` | vouchers |
| Get lines | `getVoucherLines` | voucher_lines |
| Get ledger | `getLedgerEntries` | ledger_entries |

## C. Customer Repository Operations
- `getCustomersByTenantId`, `getCustomerById`, `getCustomerByAccountHeadId`, `searchCustomers`
- All queries scoped by `tenant_id`

## D. Inventory Repository Operations
- `getProducts`, `getStockLevels`, `getStockMovements`, `createStockMovement`, `postStockMovement`
- **CRITICAL GAP**: `postStockMovement` only flips status — does NOT update `stock_levels.quantity_on_hand`

## E. Ledger Operations
- `getLedgerEntries` — all entries for tenant, optionally filtered by accountId/date/voucherType
- `getLedgerForAccount` — entries for one account with running balance (computed in JS)

## F. Dashboard Dependencies
- `DashboardService` uses: voucherRepo, inventoryRepo, coaRepo, customerRepo, supplierRepo, cashBookService, financialReportService

## G. AgingReportService Dependencies
- `voucherRepo`, `coaRepo`, `customerRepo`, `supplierRepo`
- N+1 pattern: calls `getLedgerEntries` per party

## H. BillDetailService Dependencies
- `voucherRepo`, `coaRepo`, `customerRepo`, `supplierRepo`, `inventoryRepo`
- Fetches ALL ledger entries then filters by voucherId client-side

## I. PartyBalanceService Dependencies
- `voucherRepo`, `coaRepo`, `customerRepo`, `supplierRepo`
- Resolves accountHeadId → accountCode via COA lookup

## J. Existing Express Routes
| Route | Method | Permission |
|-------|--------|-----------|
| `/api/sales` | POST | `sales.create` |
| `/api/sales/:id/post` | POST | `sales.post` |
| `/api/sales/:id` | DELETE | `sales.delete` |
| `/api/purchases` | POST | `purchases.create` |
| `/api/purchases/:id/post` | POST | `purchases.post` |
| `/api/purchases/:id` | DELETE | `purchases.delete` |
| `/api/customer-receipts` | POST | `receipts.create` |
| `/api/cash-book` | POST | `cash.create` |
| `/api/bills` | GET | `bills.view` |
| `/api/bills/:id` | GET | `bills.view` |

### MISSING Routes
- Sale returns (CRUD + post) — `saleReturnService` injected but no routes
- Purchase returns — `purchaseReturnService` injected but no routes
- Customer balances / party balance
- Aging report
- Dashboard data
- Ledger queries
- COA queries
- Inventory/stock queries
- Customer CRUD
- Product CRUD

## K. Existing API Client
- `src/ui/lib/session.ts` — only handles login/me/logout via `fetch()`
- No general-purpose API client exists

## L. UI Operations Currently Bypassing API
**ALL UI pages call domain services directly through mock DI container:**
- `Sales.tsx` → `services.salesService.*`, `services.customerRepository.*`, etc.
- `BillsList.tsx` → `new BillsListService(...)` instantiated inline
- `BillDetail.tsx` → `services.billDetailService.*`
- `AgingReport.tsx` → `new AgingReportService(...)` instantiated inline
- `Dashboard.tsx` → `services.dashboardService.*`
- `Finance.tsx` → `services.coaRepository.*`, `services.voucherRepository.*`
- `services.ts` — DI container wiring ONLY Mock adapters

## M. Repositories Used When DATABASE_URL Exists
Server `index.ts` factory selects PostgreSQL adapters when `DATABASE_URL` is set:
- `PostgresTenantAdapter`, `PostgresUserAdapter`, `PostgresUserCredentialsAdapter`, `PostgresSessionAdapter`
- `PostgresCOAAdapter`, `PostgresVoucherAdapter`, `PostgresInventoryAdapter`, `PostgresCustomerAdapter`, `PostgresSupplierAdapter`

## Critical Issues Found

### HIGH Priority
1. **PostgresSessionAdapter ignores tenant_id** in all queries (getSession, deleteSession)
2. **Stock movement posting doesn't update stock_levels** — `postStockMovement` only flips status flag
3. **Race condition in voucher number generation** — `SELECT MAX(voucher_number) + 1` without lock
4. **`deleteVoucher` not wrapped in transaction** — two DELETE statements without atomicity

### MEDIUM Priority
5. **No API routes for sale returns, aging, dashboard, ledger, customer balance**
6. **No API client in UI** — every page uses direct service calls
7. **`ssl: { rejectUnauthorized: false }`** in pool.ts
8. **COA adapter uses `acct-${Date.now()}` for ID** — collision risk
9. **BillDetailService fetches ALL ledger entries** then filters client-side

### LOW Priority
10. **N+1 inserts** for voucher lines and ledger entries
11. **Business logic in COA adapter** (deriveNormalBalance, is_posting derivation)
12. **No pagination on list queries**
13. **Duplicated row-mapping code in InventoryAdapter**
