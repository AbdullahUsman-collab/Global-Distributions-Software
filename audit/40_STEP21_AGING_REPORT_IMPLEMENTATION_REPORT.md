# Step 21 — Aging Report Implementation Report

**Date:** 2026-08-29  
**Status:** ✅ COMPLETE  
**Audit Reference:** `audit/37_COMPLETE_LEGACY_REMAINING_PARITY_DISCOVERY.md`

---

## Summary

Implemented a customer/supplier aging report at `/aging` with FIFO payment allocation, aging buckets (Current, 1–30, 31–60, 61–90, 91–120, 120+ days), and as-of-date filtering. Resolves the HIGH priority aging report parity gap identified in the discovery audit.

---

## Files Created

| File | Description |
|------|-------------|
| `src/domain/services/AgingReportService.ts` | Core aging calculation with FIFO allocation, bucket mapping, and party grouping |
| `src/domain/services/AgingReportService.test.ts` | 33 tests covering buckets, FIFO, customer/supplier aging, as-of dates, tenant isolation |
| `src/ui/pages/AgingReport.tsx` | Aging Report UI with mode toggle, filters, summary chips, responsive table, print CSS |

## Files Modified

| File | Change |
|------|--------|
| `src/ui/App.tsx` | Added `/aging` route and import |
| `src/ui/components/layout/Sidebar.tsx` | Added "Aging" navigation entry |
| `src/domain/test-helpers.ts` | Fixed mock repos to filter by tenant (was returning all tenants' data) |

---

## Legacy Parity

| Feature | Status | Notes |
|---------|--------|-------|
| Customer Aging | ✅ Implemented | Groups by customer account, FIFO payment allocation |
| Supplier Aging | ✅ Implemented | Groups by supplier account, FIFO payment allocation |
| Aging Buckets | ✅ Implemented | Current, 1–30, 31–60, 61–90, 91–120, 120+ days |
| As-of Date | ✅ Implemented | Filters transactions up to selected date |
| Party Filter | ✅ Implemented | Optional filter to single customer or supplier |
| Search | ✅ Implemented | Searches by party name or account code |
| Grand Totals | ✅ Implemented | Summary chips + footer totals per bucket |
| Print Support | ✅ Implemented | Print CSS hides controls, shows all columns |
| Sale Man Filter | ⚠️ Not implemented | Entity does not exist in New ERP |

---

## Technical Implementation

### AgingReportService

**Core Algorithm — FIFO Payment Allocation:**

1. Fetch all ledger entries for a party's control account (AR for customers, AP for suppliers)
2. Filter entries up to as-of date, sort ascending by date
3. For AR mode: debits increase outstanding (invoices), credits decrease it (payments/returns)
4. For AP mode: credits increase outstanding (invoices), debits decrease it (payments/returns)
5. Payments/returns reduce the oldest outstanding items first (FIFO)
6. Remaining outstanding amounts are allocated to aging buckets based on days since invoice date

**Key Methods:**
- `generateReport(tenantId, mode, asOfDate, partyId?)` — main entry point
- `allocateAging(sortedEntries, asOfDate, accountType)` — FIFO allocation logic
- `daysBetween(dateFrom, dateTo)` — date arithmetic
- `getBucket(days)` — maps age in days to bucket key

**Account Resolution:**
- Customer's `accountHeadId` (COA record ID) → resolved to `accountCode` via COA lookup → used for ledger query
- Supplier's `accountHeadId` → same resolution path

### AgingReport.tsx

- Mode toggle: Customer / Supplier
- As-of date picker (defaults to today)
- Party filter dropdown (populated from customer/supplier repos)
- Search bar (name + account code)
- Summary chips showing total per bucket
- Responsive table with aging buckets (mobile hides middle columns)
- Ledger link button navigates to Finance > Ledger tab with account pre-selected
- Print CSS: hides controls, shows all columns, adds report footer

### Test Coverage (33 tests)

| Category | Tests |
|----------|-------|
| `daysBetween` | 3 |
| `getBucket` | 6 |
| `allocateAging (AR)` | 5 |
| `allocateAging (AP)` | 3 |
| `generateReport — Customer` | 6 |
| `generateReport — Supplier` | 5 |
| `as-of date behavior` | 3 |
| `tenant isolation` | 1 |
| `totals` | 1 |

---

## Bugs Found & Fixed During Implementation

### 1. Mock Repository Tenant Isolation (test-helpers.ts)

**Issue:** `createMockCustomerRepo().getCustomersByTenantId()` and `createMockSupplierRepo().getSuppliers()` ignored the `tenantId` parameter, returning all tenants' data. This caused the tenant isolation test to fail.

**Fix:** Updated both mocks to filter by the passed `tenantId` parameter instead of returning the full store.

---

## Verification

| Check | Result |
|-------|--------|
| TypeScript (`npx tsc --noEmit`) | ✅ Clean |
| Build (`npm run build`) | ✅ Pass |
| Tests (`npx vitest run`) | ✅ 135/135 pass (33 new aging + 102 existing) |
| Total test files | 8 |

---

## Known Limitations

1. **Cost_rate formula** — UNKNOWN in audit/08; blocks COGS → GL integration. Not relevant to aging.
2. **Sale Man filter** — Legacy entity does not exist in New ERP.
3. **Write-back to ledger** — Not in scope for aging report.
