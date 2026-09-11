# Step 76 — Cash Book, Journal & Tax Settings Bug Fix Audit

**Date:** 2026-09-10
**Status:** COMPLETE — all bugs fixed, 730/730 tests pass

---

## Executive Summary

Client reported 4 bugs: Cash Book receipts not posting/deleting, Journal not loading entries, Tax Settings needed tenant isolation audit. Root cause analysis identified a single architectural inconsistency (account ID vs account code mismatch between Mock and Postgres adapters) as the underlying cause of bugs 1–3. Tax Settings was already correctly tenant-scoped.

---

## Root Cause Analysis

### Bug 1–3: Account Code vs DB ID Mismatch

**The fundamental issue:** Two adapters stored different values in `ledger_entries.account_id`:

| Adapter | `voucher_lines.account_id` | `ledger_entries.account_id` |
|---------|---------------------------|----------------------------|
| Mock | Raw code (`'11101'`) | Raw code (`'11101'`) |
| Postgres | Resolved DB ID (`'coa-11101'`) | Resolved DB ID (`'coa-11101'`) |

All services pass **account codes** (e.g., `'11101'`) to `getLedgerEntries()`, matching the Mock adapter. But Postgres stored **resolved DB IDs**, so `WHERE le.account_id = '11101'` never matched `'coa-11101'` in the DB.

**Spec reference:** `LedgerEntry.accountId` comment in `voucher.ts:135`: *"Account code (5-digit string, references AccountHead.accountCode)"* — the spec was correct; the Postgres adapter was wrong.

### Bug 4: Tax Settings Tenant Isolation

**No bug found.** The Settings adapter correctly scopes all queries by `tenant_id`. Each tenant gets independent `SalesTaxConfig`, `FurtherTaxConfig`, `FedConfig`, `AdvanceTaxConfig`, and `TaxAccountMapping`.

---

## Fixes Applied

### 1. PostgresVoucherAdapter.postVoucher() — Store account codes in ledger

**File:** `src/server/db/repositories/postgresVoucherAdapter.ts`
**Change:** Build reverse map `DB_id → account_code` before inserting ledger entries. Store the code, not the resolved DB ID.

**Before:** `ledger_entries.account_id = line.accountId` (which was the resolved DB ID like `'coa-11101'`)
**After:** `ledger_entries.account_id = reverseMap.get(line.accountId) || line.accountId` (which is the code like `'11101'`)

### 2. PostgresVoucherAdapter.updateVoucher() — Resolve account codes

**File:** `src/server/db/repositories/postgresVoucherAdapter.ts`
**Change:** Build account code map and use `resolveAccountId()` when inserting updated lines (was missing the resolution step, storing raw codes instead of DB IDs in `voucher_lines`).

### 3. CashBookService.getCashBook() — Include draft vouchers

**File:** `src/domain/services/CashBookService.ts`
**Changes:**
- Fetch ALL vouchers (not just POSTED) to build the voucher map
- Filter `getLedgerEntries()` by `status: 'POSTED'` for the transaction list
- Added `draftVouchers: VoucherHeader[]` to `CashBookSummary` interface
- Collect DRAFT vouchers and return them separately

### 4. CashBook UI — Show draft vouchers with Post/Delete actions

**File:** `src/ui/pages/CashBook.tsx`
**Change:** Added "Pending Drafts" section above the main entries table, displaying draft vouchers with Post and Delete buttons.

### 5. Ledger route — Resolve account DB IDs to codes

**File:** `src/server/routes/protected.ts`
**Change:** `GET /api/ledger/:accountId` now detects if the value is a DB ID (contains `-`) and resolves it to the account code via `coaRepo.getAccountById()` before querying.

### 6. Settings — Verified correct (no code change)

All `ISettingsRepository` methods are scoped by `tenantId`. Postgres adapter uses `WHERE tenant_id = $1` for all queries. Mock adapter uses per-tenant `Map<tenantId, TenantSettings>`.

---

## Files Modified

| File | Change |
|------|--------|
| `src/server/db/repositories/PostgresVoucherAdapter.ts` | Store codes in ledger entries; resolve in updateVoucher |
| `src/domain/services/CashBookService.ts` | Add `draftVouchers` to summary; use `accountCode` consistently |
| `src/ui/pages/CashBook.tsx` | Display draft vouchers with Post/Delete buttons |
| `src/server/routes/protected.ts` | Resolve DB IDs to codes in ledger route |
| `src/domain/services/CashBookJournalTenantBugFix.test.ts` | **NEW** — 19 regression tests |

---

## Regression Tests (19 new, 730 total)

| # | Test | Bug |
|---|------|-----|
| 1 | Opening balance uses account.accountCode | Bug 1 |
| 2 | Range entries use account.accountCode | Bug 1 |
| 3 | Closing balance correct after receipt + payment | Bug 1 |
| 4 | draftVouchers includes unposted receipts | Bug 2 |
| 5 | draftVouchers includes unposted payments | Bug 2 |
| 6 | Posted vouchers not in draftVouchers | Bug 2 |
| 7 | Multiple drafts appear correctly | Bug 2 |
| 8 | Deletes a draft receipt | Bug 3 |
| 9 | Deletes a draft payment | Bug 3 |
| 10 | Deleting draft removes from list | Bug 3 |
| 11 | Rejects deleting posted voucher | Bug 3 |
| 12 | Post receipt moves from drafts to transactions | Bug 1 |
| 13 | Post payment appears in transactions | Bug 1 |
| 14 | Two tenants have independent accounts | Bug 5 |
| 15 | getAccountById scoped to tenant | Bug 5 |
| 16 | getAccountByCode scoped to tenant | Bug 5 |
| 17 | Cash book operations isolated per tenant | Bug 5 |
| 18 | Ledger entries store codes, not DB IDs | Bug 1 |
| 19 | getLedgerForAccount returns entries by code | Bug 1 |

---

## Verification

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | PASS (0 errors) |
| `npx vitest run` | PASS (35 files, 730 tests, 0 failures) |
| `npm run build` | PASS (8.83s) |
