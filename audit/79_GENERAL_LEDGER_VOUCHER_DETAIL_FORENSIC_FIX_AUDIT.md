# Step 79 — General Ledger Voucher Detail Error: Forensic Fix Audit

**Date:** 2026-09-12  
**Scope:** General Ledger → Voucher Number Click → Detail View  
**Status:** RESOLVED  
**Commit:** (pending)

---

## 1. Bug Description

When a user clicks a Voucher Number in the **General Ledger** tab of FinancePage, the app navigates to `/bills/:voucherId` to display the BillDetailPage. For non-bill voucher types (JV, CR, CP, BPV), the detail view returned an error instead of showing the voucher detail.

## 2. Forensic Investigation

### 2.1 Navigation Chain (Traced End-to-End)

| Step | Component | File:Line | Action |
|------|-----------|-----------|--------|
| 1 | FinancePage → LedgerTab | `Finance.tsx:1168` | `navigate('/bills/' + e.voucherId)` |
| 2 | React Router | `App.tsx:45` | Route `/bills/:voucherId` → `BillDetailPage` |
| 3 | BillDetailPage | `BillDetail.tsx:17` | `useParams<{ voucherId: string }>()` |
| 4 | BillDetailPage | `BillDetail.tsx:20` | `getBillDetail(voucherId)` |
| 5 | api.ts | `api.ts:204` | `apiRequest<any>(/bills/${id})` |
| 6a | api.ts (PG mode) | `api.ts:57` | `fetch(/api/bills/${id})` → server |
| 6b | api.ts (demo fallback) | `api.ts:69` | `handleDemoRequest(/api/bills/${id}, 'GET')` |
| 7a | Server | `protected.ts:388-404` | `billDetailService.getBillDetail(tenantId, id)` |
| 7b | Demo handler | `demoData.ts:567-596` | `DEMO_BILLS.find(b => b.voucher.id === id)` |
| 8 | BillDetailService | `BillDetailService.ts:100` | Works for ALL voucher types ✓ |
| 9 | Demo handler | `demoData.ts:595` | Returns `null` for non-bill vouchers ✗ |

### 2.2 Root Cause

**File:** `src/ui/lib/demoData.ts:567-596`

The demo handler for `/api/bills/:id` only searched `DEMO_BILLS`, which contains 9 bill-type vouchers (SV, PV, SRV, PRV, CRV). However, `DEMO_LEDGER` (used by the GL) contains 15 voucher IDs spanning ALL types including JV, CR, CP, BPV.

When a non-bill-type voucher was clicked in the GL:
1. `handleDemoRequest('/api/bills/vch-01', 'GET')` was called
2. `DEMO_BILLS.find(b => b.voucher.id === 'vch-01')` → `undefined` (vch-01 is JV, not in DEMO_BILLS)
3. Handler returned `null`
4. `apiRequest` received null → error displayed in UI

**Affected voucher IDs (in GL but not in DEMO_BILLS):**
- `vch-01` — JV (Journal Voucher, opening balance)
- `vch-10` — CR (Customer Receipt)
- `vch-12` — CP (Cash Payment)
- `vch-13` — BPV (Bank Payment Voucher)
- `vch-14` — JV
- `vch-17` — PV

### 2.3 Why Server-Side Was Not Affected

The server-side `BillDetailService.getBillDetail()` at `BillDetailService.ts:100` fetches voucher by ID from the database without filtering by voucher type. It returns detail for ANY voucher type. The bug was exclusively in the demo data fallback path.

## 3. Fix Applied

### 3.1 Code Change

**File:** `src/ui/lib/demoData.ts` — `/api/bills/:id` handler (lines 567-621)

**Before:** Handler returned `null` when voucher ID was not found in `DEMO_BILLS`.

**After:** Handler falls back to `DEMO_VOUCHERS` when not found in `DEMO_BILLS`, building a minimal BillDetail response from `DEMO_LEDGER` entries.

```typescript
// Fallback: find voucher from DEMO_VOUCHERS (covers JV, CR, CP, BPV, etc. shown in GL)
const voucher = DEMO_VOUCHERS.find(v => v.id === id);
if (voucher) {
  return {
    voucher,
    partyType: 'unknown' as const,
    partyId: '',
    partyName: '',
    partyAccountCode: '',
    lines: [],
    accountingEntries: DEMO_LEDGER.filter(e => e.voucherId === id).map(e => ({
      accountId: e.accountId,
      accountCode: e.accountId,
      accountName: e.accountId,
      description: e.narration,
      debit: e.debit,
      credit: e.credit,
    })),
    inventoryMovements: [],
    taxSummary: { subtotal: 0, gst: 0, furtherTax: 0, fed: 0, advanceTax: 0, totalTax: 0, grandTotal: 0 },
    stockLevels: [],
  };
}
```

### 3.2 Fix Characteristics

- **Minimal:** Single code block addition (20 lines)
- **Safe:** Only activates when DEMO_BILLS lookup fails (existing behavior preserved)
- **Comprehensive:** Covers ALL voucher types that appear in DEMO_LEDGER
- **Correct shape:** Returns the same BillDetail type expected by BillDetailPage

## 4. Test Results

### 4.1 Reproduction Tests (Step79_GLDemoReproduction.test.ts)

| Test | Status |
|------|--------|
| SV voucher from GL resolves via demo handler | ✓ |
| ALL 15 voucher IDs in DEMO_LEDGER resolve | ✓ |
| JV opening balance voucher detail | ✓ |
| CR receipt voucher detail | ✓ |
| BPV bank payment voucher detail | ✓ |
| CP cash payment voucher detail | ✓ |
| All DEMO_LEDGER voucher IDs should resolve | ✓ |

**Result: 7/7 passed**

### 4.2 Full Regression

| Suite | Tests | Result |
|-------|-------|--------|
| 38 test files | 778 tests | **778 passed, 0 failed** |
| TypeScript (tsc --noEmit) | — | **0 errors** |
| Vite build | — | **Success** |

## 5. Impact Assessment

| Area | Impact |
|------|--------|
| General Ledger tab | **FIXED** — All voucher types now clickable |
| Bills tab | No change — Bill-type vouchers still resolve from DEMO_BILLS |
| BillsListService | No change — Only lists bill types (by design) |
| BillDetailService | No change — Already handled all types |
| Server-side | No change — Already worked correctly |
| Cash Book / Journal | No change — Uses same demo handler, now benefits from fix |

## 6. Pre-existing Conditions (No Change)

These were noted during investigation but are not bugs:

- **BillsListService** only lists SV/PV/SRV/PRV — by design for the Bills tab
- **Server startup** prints banner but process may not bind to port 3000 — investigation deferred
- **Vite chunk size** warning — pre-existing, not introduced by this fix

## 7. Files Modified

| File | Change |
|------|--------|
| `src/ui/lib/demoData.ts` | Added DEMO_VOUCHERS fallback in `/api/bills/:id` handler |
| `src/domain/services/Step79_GLDemoReproduction.test.ts` | New: 7 reproduction tests for GL→BillDetail path |
| `audit/79_GENERAL_LEDGER_VOUCHER_DETAIL_FORENSIC_FIX_AUDIT.md` | This document |

---

**Conclusion:** A 20-line addition to the demo data handler resolved the bug. The root cause was that the demo fallback only knew about bill-type vouchers (SV/PV/SRV/PRV/CRV) but the GL displays ledger entries for all voucher types. The fix adds a fallback that constructs a BillDetail response from DEMO_VOUCHERS and DEMO_LEDGER for any voucher type.
