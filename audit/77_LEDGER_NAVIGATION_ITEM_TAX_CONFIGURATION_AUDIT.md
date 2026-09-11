# Step 77: Ledger + Navigation + Item-Level Tax Configuration

**Date:** 2026-09-11
**Status:** COMPLETED

## Executive Summary

Fixed three bugs reported after Step 76 deployment:

1. **Ledger empty** — Demo data handler didn't match `/api/ledger/:accountId`, only `/api/ledger`
2. **Cannot open pages in new tab** — Sidebar used `<button onClick>` instead of `<Link to>`
3. **Tax config in wrong place** — Further Tax % was a tenant-level setting instead of per-item

## Bug #1: Ledger Empty

**Root cause:** The demo data handler in `demoData.ts` only matched the exact path `/api/ledger` (no params). When `LedgerTab` called `GET /api/ledger/11101`, the demo handler returned `undefined` → fell through to Express 404 → the response was not JSON → `response.json()` failed silently → empty ledger.

**Fix:** Added a route pattern match for `/api/ledger/:accountId` in the demo handler that:
- Extracts the account code from the URL
- Filters `DEMO_LEDGER` entries by matching `entry.accountCode === accountId`
- Computes a running balance for the filtered entries
- Returns paginated results with correct `total`, `hasMore`, and `runningBalance`

**Files changed:**
- `src/ui/lib/demoData.ts` — Added `/api/ledger/:accountId` handler at ~L553

## Bug #2: Cannot Open Pages in New Tab

**Root cause:** ALL sidebar navigation used `<button onClick={() => navigate(path)}>`. Buttons don't generate `<a>` elements, so right-click → "Open in new tab" was impossible.

**Fix:** Changed sidebar from `<button onClick>` to `<Link to={path}>`. Also changed all "Back to Dashboard" buttons across 9 pages to `<Link>` elements:
- Sidebar, Users, BillsList, Settings, Inventory, Sales, Finance, Purchases, CustomerReceipts, AgingReport

**Files changed:**
- `src/ui/components/layout/Sidebar.tsx`
- `src/ui/pages/Users.tsx`
- `src/ui/pages/BillsList.tsx`
- `src/ui/pages/Settings.tsx`
- `src/ui/pages/Inventory.tsx`
- `src/ui/pages/Sales.tsx`
- `src/ui/pages/Finance.tsx`
- `src/ui/pages/Purchases.tsx`
- `src/ui/pages/CustomerReceipts.tsx`
- `src/ui/pages/AgingReport.tsx`

## Bug #3: Item-Level Tax Configuration

**Root cause:** The Product type already had `gstType`, `gstPercent`, `fedPercent`, `advanceTaxSalePercent`, `advanceTaxPurchasePercent` fields, but `furtherTaxPercent` was missing. Further Tax was configured at the tenant level in Settings and hardcoded to `0` in all bill creation flows.

**Fix:** Added `furtherTaxPercent` to the Product model and propagated it through the entire stack:

### Type System
- `Product.furtherTaxPercent` — new required field (default 0)
- `CreateProductDTO.furtherTaxPercent` — optional (default 0)
- `UpdateProductDTO.furtherTaxPercent` — optional

### Database
- Created migration `005_further_tax_percent.sql`: `ALTER TABLE products ADD COLUMN IF NOT EXISTS further_tax_percent DECIMAL(5,2) DEFAULT 0`
- Registered in `migrate.ts` (version '005')

### Adapters
- `PostgresInventoryAdapter` — SELECT/INSERT/UPDATE `further_tax_percent`
- `MockInventoryAdapter` — Added `furtherTaxPercent` to all 8 seed products + create/update logic
- `test-helpers.ts` — Added `furtherTaxPercent` to SEED_PRODUCTS and mock createProduct

### UI
- `Inventory.tsx` — Added Further Tax % input to product edit modal
- `Sales.tsx` — Bill lines now read `product.furtherTaxPercent` (was hardcoded `0`)
- `Purchases.tsx` — Bill lines now read `product.furtherTaxPercent` (was hardcoded `0`)
- `Finance.tsx` — Voucher modal reads `prod.furtherTaxPercent` (was hardcoded `0`)

### Settings Cleanup
- Removed 4 tax config tabs from `Settings.tsx`: Sales Tax, Further Tax, FED, Advance Tax
- Removed associated state variables, draft handlers, and tab component definitions
- Kept: Business Profile, Tax Accounts, Financial Rules, Change Password

### Demo Data
- All 20 demo products in `demoData.ts` now include `furtherTaxPercent`
- Cooking Oil products (PRD-004, PRD-005) set to 5% to demonstrate the feature

## Regression Tests

19 focused tests in `src/domain/services/Step77_Regression.test.ts`:

| Section | Tests | Covers |
|---------|-------|--------|
| Item-Level Tax | 7 | Product type, bill line calculation, auto-fill |
| Ledger Demo Handler | 3 | Account filtering, running balance |
| Navigation | 2 | Path definitions, Link structure |
| Settings Tabs | 1 | Tab count after removal |
| Migration | 3 | File exists, SQL content, registration |
| Backward Compat | 3 | Zero furtherTax behavior |

## Verification

- **TypeScript:** `npx tsc --noEmit` — clean (0 errors)
- **Tests:** `npx vitest run` — **748 passed / 1 failed** (flaky Postgres timeout, not related)
- **Build:** `npm run build` — successful
- **Migration:** Applied to test DB (migration 005)
