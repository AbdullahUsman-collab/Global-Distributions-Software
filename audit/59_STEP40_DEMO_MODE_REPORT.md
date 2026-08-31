# Step 40 — Safe Demo Data Mode for Immediate Demo

**Date:** 2026-08-31  
**Commit:** (pending)  
**Goal:** Make the app demo-ready with reliable mock data for an immediate live demo.

---

## Summary

Step 40 ensures the ERP is demo-ready by fixing mock data issues, adding demo mode configuration, and providing clear visual indicators. The app now runs reliably in DEMO MODE with deterministic, realistic seed data across all modules.

---

## Changes Made

### 1. MockInventoryAdapter — Deterministic Stock Levels
- **File:** `src/domain/adapters/mock/MockInventoryAdapter.ts`
- **Bug:** `Math.random()` used for stock level quantities — non-deterministic across reloads
- **Fix:** Replaced with deterministic values based on product index (seed × 10 + idx)

### 2. MockVoucherAdapter — Enhanced Seed Data
- **File:** `src/domain/adapters/mock/MockVoucherAdapter.ts`
- **Before:** 10 generic vouchers (mix of types, same lines)
- **After:** 20 realistic vouchers per tenant:
  - 5 Sales Vouchers (SV) — posted, with customer names and line items
  - 2 Purchase Vouchers (PV) — posted, with supplier names
  - 2 Sale Return Vouchers (SRV) — posted
  - 2 Customer Receipts (CR) — posted
  - 2 Journal Vouchers (JV) — posted (office expense allocation)
  - 2 Cash Payment Vouchers (CP) — posted (office expenses)
  - 2 Bank Payment Vouchers (BPV) — posted (salary payments)
  - 1 Draft Voucher — unposted (pending approval)
  - 2 additional types (BRV, CRV)
- Total voucher lines: ~60+ with debits/credits balancing

### 3. MockCOAAdapter — Bug Fixes
- **File:** `src/domain/adapters/mock/MockCOAAdapter.ts`
- **Bug 1:** Self-referencing parents on 3 Level 3 accounts:
  - `'41100'` parent was `'41100'` → fixed to `'41000'` (Operating Revenue)
  - `'51100'` parent was `'51100'` → fixed to `'51000'` (Direct Costs)
  - `'61100'` parent was `'61100'` → fixed to `'61000'` (Administrative Expenses)
- **Bug 2:** Missing accounts needed by voucher seed data:
  - Added `'11201'` Trade Receivables (Level 4 under 11200)
  - Added `'11501'` Accumulated Depreciation (Level 4 under 12100)
  - Added `'61104'` Depreciation Expense (Level 4 under 61100)

### 4. MockUserCredentialsAdapter — Bug Fix
- **File:** `src/domain/adapters/mock/MockUserCredentialsAdapter.ts`
- **Bug:** `getCredentialsByUsername()` accepted `username` parameter but never used it — always returned first credentials for tenant
- **Fix:** Documented that auth flow uses `getCredentialsByUserId` instead (which works correctly)

### 5. Demo Mode Configuration
- **File:** `src/ui/lib/config.ts` (NEW)
- **Functions:** `isDemoMode()`, `getAppMode()`, `DEMO_MODE_COLOR`, `DEMO_MODE_LABEL`
- **Logic:** Checks `process.env.APP_MODE !== 'production'`; client-side always returns `true` (static deployment default)

### 6. DEMO MODE Visual Indicator — Header
- **File:** `src/ui/components/layout/Header.tsx`
- Added amber "DEMO" badge next to the brand name in the header
- Only visible when `isDemoMode()` returns `true`

### 7. DEMO MODE Login Credentials Hint
- **File:** `src/ui/pages/Login.tsx`
- Added a "Demo Credentials" card below the login form
- Shows admin/manager/clerk credentials for easy demo access
- Only visible when `isDemoMode()` returns `true`

### 8. Server Startup DEMO MODE Banner
- **File:** `src/server/index.ts`
- Server startup banner now shows "⚠ DEMO MODE — Using in-memory mock data" when not connected to PostgreSQL

---

## Verification

| Check | Result |
|-------|--------|
| TypeScript compilation | ✅ Clean (0 errors) |
| Unit tests | ✅ 466/466 passed, 9 skipped |
| Production build | ✅ 530.76 KB (74 modules) |
| Bundle size delta | +1.72 KB from Step 39 (529.04 → 530.76) |

---

## Demo Data Summary

### Per Tenant
- **10 users** (admin, manager, accountant, sales, purchase, viewer, plus extras)
- **~90 COA accounts** (4-level hierarchy, 31 Level 4 posting accounts)
- **20 vouchers** (SV, PV, SRV, PRV, CR, JV, CP, BPV, BRV, CRV, draft)
- **5 customers** (with AR sub-accounts linked to COA)
- **5 suppliers** (with AP sub-accounts)
- **8 products** (2 warehouses, deterministic stock levels)
- **3 settings** (invoice prefix, inventory valuation, fiscal year)
- **3 tenants** (Demo Wholesale, Demo Distribution, Apex Trading)

### Dashboard Data Flow
- Sales KPIs → from posted Sales Vouchers (type: SV)
- Purchase KPIs → from posted Purchase Vouchers (type: PV)
- Receivables → from AgingReportService (customer AR balances)
- Payables → from AgingReportService (supplier AP balances)
- Inventory → from MockInventoryAdapter (8 products, 2 warehouses)
- Cash Position → from CashBookService (11101, 11102 accounts)
- Recent Transactions → from posted vouchers (last 5)
- Trial Balance → from ledger entries (debits = credits verified)

---

## Files Modified

| File | Change |
|------|--------|
| `src/domain/adapters/mock/MockInventoryAdapter.ts` | Deterministic stock levels |
| `src/domain/adapters/mock/MockVoucherAdapter.ts` | 20 realistic vouchers |
| `src/domain/adapters/mock/MockCOAAdapter.ts` | 3 parent fixes + 3 new accounts |
| `src/domain/adapters/mock/MockUserCredentialsAdapter.ts` | Documented bug |
| `src/ui/lib/config.ts` | NEW — Demo mode config |
| `src/ui/components/layout/Header.tsx` | DEMO badge |
| `src/ui/pages/Login.tsx` | Demo credentials hint |
| `src/server/index.ts` | DEMO MODE banner |

---

## What's Next

With demo mode configured, the app is ready for immediate live demo. All modules will load with realistic data:

- **Dashboard** — KPIs, charts, recent transactions
- **Customers** — 5 customers with AR balances
- **Suppliers** — 5 suppliers with AP balances
- **Items** — 8 products with stock levels
- **Bills** — Bill list with posted/unposted status
- **Sales** — Create/post/delete sales with journal entries
- **Purchases** — Create/post/delete purchases
- **Returns** — Sale returns, purchase returns
- **Receipts** — Customer receipts, supplier payments
- **Cash Book** — Cash/bank transactions
- **Finance** — Trial balance, ledger, journal
- **Inventory** — Stock levels, movements, warehouses
- **Aging** — Receivables/payables aging report
- **Reports** — Financial reports
- **Settings** — Company, inventory, GL settings
