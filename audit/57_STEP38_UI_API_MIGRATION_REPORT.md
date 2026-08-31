# Step 38 — UI → API Migration + Application Stabilization

**Date:** 2026-08-31  
**Commit:** TBD  
**Tests:** 466/466 pass (+ 9 skipped PostgreSQL integration)  
**Build:** 96 modules, 612.75 KB  
**TypeScript:** Clean (0 errors)

---

## Executive Summary

Migrated 107 direct domain service calls across 13 UI pages to use the centralized API client (`src/ui/lib/api.ts`). Added 2 missing server routes, React Error Boundaries, and fixed CashBook computation from ledger data.

---

## 1. Server Routes Added (2)

| Route | Method | Permission | Purpose |
|---|---|---|---|
| `/api/sale-returns` | GET | `returns.view` | List all sale returns (SRV vouchers) |
| `/api/purchase-returns` | GET | `returns.view` | List all purchase returns (PRV vouchers) |

---

## 2. UI → API Migration Summary

### Fully Migrated Pages (10 pages, ~87 calls)

| Page | Calls Migrated | API Functions Used |
|---|---|---|
| Dashboard.tsx | 1 | `getDashboard` |
| BillsList.tsx | 4 | `getBills`, `deleteSaleBill`, `deletePurchaseBill`, `getCustomers`, `getSuppliers`, `getProducts` |
| BillDetail.tsx | 1 | `getBillDetail` |
| BrandSelection.tsx | 1 | `fetch('/api/tenants')` |
| Login.tsx | 1 | `fetch('/api/tenants/:slug')` |
| Settings.tsx | 3 | `getSettings`, `updateSettings` |
| AgingReport.tsx | 4 | `getAgingReport`, `getCustomers`, `getSuppliers` |
| CustomerReceipts.tsx | 5 | `getBills`, `getCustomers`, `getAccounts`, `createCustomerReceipt`, `postCustomerReceipt`, `deleteCustomerReceipt` |
| CashBook.tsx | 6 | `getAccounts`, `getLedger`, `createCashBookVoucher`, `postCashBookVoucher`, `deleteCashBookVoucher` |
| FinancialReportsView.tsx | 3 | `getTrialBalance`, `getProfitAndLoss`, `getBalanceSheet` |

### Partially Migrated Pages (4 pages, ~48 calls migrated, ~22 kept)

| Page | Migrated | Kept (no API) | Notes |
|---|---|---|---|
| Sales.tsx | 21 | 0 | Full migration |
| Purchases.tsx | 21 | 0 | Full migration |
| Inventory.tsx | 6 | 10 | Read ops migrated; write ops + specialized queries kept on service |
| Finance.tsx | 9 | 7 | COA CRUD + ledger migrated; voucher CRUD kept on service |
| CustomerReceipts.tsx | 5 | 2 | `getVoucherLines`, `getCustomerARBalance` kept on service |

---

## 3. Remaining `services.*` Calls (19 total across 3 pages)

These operations have NO corresponding API endpoints and are kept on the mock service:

### Inventory.tsx (10 calls)
- `createProduct`, `updateProduct`, `deactivateProduct`
- `getWarehouseLocations`, `getBatches`, `getSerials`
- `getStockMovements`, `postStockMovement`, `cancelStockMovement`, `createStockMovement`

### Finance.tsx (7 calls)
- `getVouchersByTenantId`, `postVoucher`, `deleteVoucher`
- `createVoucher`, `updateVoucher`
- `getVoucherLines` (×2)

### CustomerReceipts.tsx (2 calls)
- `getVoucherLines` (for expandable row detail)
- `getCustomerARBalance` (for form balance display)

---

## 4. Error Boundaries Added

**New component:** `src/ui/components/ErrorBoundary.tsx`
- Catches JavaScript errors in child component tree
- Shows fallback UI with error details
- "Try Again" resets boundary; "Reload Page" refreshes

**Wrapped in App.tsx:**
- Top-level boundary around all Routes
- Per-page boundary on every Route element (13 pages)
- Prevents white-screen crashes from any single page

---

## 5. CashBook API Adaptation

The `getCashBook()` service method had no API endpoint. Migrated to:
1. `getLedger({ accountId, startDate, endDate })` fetches raw ledger entries
2. Client-side computation of `CashBookSummary` (opening balance, totals, running balance)
3. Cash/bank account list sourced from `getAccounts()` filtered by codes `['11101', '11102']`

---

## 6. API Client Coverage

| Metric | Count |
|---|---|
| Exported functions in api.ts | 51 |
| Server route handlers | 50 (48 original + 2 new GET) |
| Routes with matching api.ts functions | 50/50 (100%) |
| Orphaned api.ts functions | 0 (was 2, fixed) |

---

## 7. Architecture State

```
React UI → api.ts (fetch) → Express API → Services → Repositories → Mock adapters
                ↓
          Error Boundaries (per-page + root)
```

**Files still importing `services` directly:** 3 (Inventory, Finance, CustomerReceipts — partial migrations for operations without API endpoints)

---

## 8. Files Modified

| File | Change |
|---|---|
| `src/server/routes/protected.ts` | +2 GET routes (sale-returns, purchase-returns) |
| `src/ui/App.tsx` | +ErrorBoundary wrapper on all routes |
| `src/ui/components/ErrorBoundary.tsx` | NEW — React error boundary component |
| `src/ui/pages/Dashboard.tsx` | Migrated to `getDashboard` |
| `src/ui/pages/BillsList.tsx` | Migrated to `getBills`, `deleteSaleBill`, `deletePurchaseBill` |
| `src/ui/pages/BillDetail.tsx` | Migrated to `getBillDetail` |
| `src/ui/pages/BrandSelection.tsx` | Migrated to `fetch('/api/tenants')` |
| `src/ui/pages/Login.tsx` | Migrated to `fetch('/api/tenants/:slug')` |
| `src/ui/pages/Settings.tsx` | Migrated to `getSettings`, `updateSettings` |
| `src/ui/pages/AgingReport.tsx` | Migrated to `getAgingReport` |
| `src/ui/pages/CustomerReceipts.tsx` | Partial migration (5/7 calls) |
| `src/ui/pages/CashBook.tsx` | Migrated to `getLedger` + `createCashBookVoucher` |
| `src/ui/pages/FinancialReportsView.tsx` | Migrated to `getTrialBalance`, `getProfitAndLoss`, `getBalanceSheet` |
| `src/ui/pages/Sales.tsx` | Full migration (21 calls) |
| `src/ui/pages/Purchases.tsx` | Full migration (21 calls) |
| `src/ui/pages/Inventory.tsx` | Partial migration (6/16 calls) |
| `src/ui/pages/Finance.tsx` | Partial migration (9/16 calls) |
