# Step 55 — Bill Detail Runtime Fix & Regression Audit

**Date:** 2026-09-09  
**Goal:** Fix "Cannot read properties of undefined (reading 'subtotal')" crash when opening Bill Detail

---

## 1. Root Cause

### Type Mismatch Between Bill Record and Bill Detail

The crash was a **type mismatch** in the demo mode client-side data layer:

| Property | `BillRecord` (list shape) | `BillDetail` (detail shape) |
|---|---|---|
| `voucher` | Yes | Yes |
| `partyName` | Yes | Yes |
| `partyId` | Yes | Yes |
| **`taxSummary`** | **NO** | **YES** |
| `accountingEntries` | NO | YES |
| `inventoryMovements` | NO | YES |
| `partyType` | NO | YES |
| `partyAccountCode` | NO | YES |
| `total` | YES | NO |

**Flow:**
1. `BillsList.tsx` calls `GET /api/bills` → returns `BillRecord[]` (list shape)
2. User clicks "View" → navigates to `/bills/:voucherId`
3. `BillDetail.tsx` calls `GET /api/bills/:id` → should return `BillDetail` shape
4. **Demo mode handler** at `demoData.ts:559-561` returned `DEMO_BILLS.find(...)` which is a `BillRecord` — **no `taxSummary` field**
5. `BillDetail.tsx:281` accesses `detail.taxSummary.subtotal` → **crash: undefined.subtotal**

**Server mode** was never affected — `BillDetailService.getBillDetail()` constructs the full `BillDetail` shape with `taxSummary` populated.

---

## 2. Fix

**File:** `src/ui/lib/demoData.ts`

**Change:** Modified the bill detail handler to construct a proper `BillDetail`-shaped response from `BillRecord` data, including:
- `partyType` (derived from `partyId` prefix: `cust-*` → customer, `sup-*` → supplier)
- `partyAccountCode` (default `11201` for customers, `21100` for suppliers)
- `taxSummary` (subtotal from total, 17% GST, grand total computed)
- `accountingEntries: []`
- `inventoryMovements: []`
- `stockLevels: []`

---

## 3. Verification

### Build & Tests
- **TypeScript:** CLEAN (0 errors)
- **Build:** SUCCESS (20.90s)
- **Unit/Service Tests:** 609 passed, 0 failed
- **Integration Tests:** 10 passed, 4 failed (data availability — live DB has no customers/products; same as Step 54)

### Transaction Type Coverage
The fix covers all 9 demo bill types by constructing the same `BillDetail` response regardless of voucher type:
- 4 Sale Vouchers (SV)
- 2 Purchase Vouchers (PV)
- 1 Sale Return Voucher (SRV)
- 1 Purchase Return Voucher (PRV)
- 1 Customer Receipt Voucher (CRV)

### Step 53 Tax Fix
The tax display fix in `BillDetailService.ts` was NOT affected — the fix was in demo data only, server-side service is unchanged.

---

## 4. Regression Summary

| Area | Status | Notes |
|---|---|---|
| Bills List | ✅ OK | List view unaffected |
| Bill Detail (all types) | ✅ FIXED | taxSummary now properly populated in demo mode |
| Voucher CRUD | ✅ OK | No changes to voucher services |
| Ledger | ✅ OK | No changes to ledger services |
| Tax calculation | ✅ OK | Step 53 tax fix in BillDetailService unaffected |
| Customers/Suppliers | ✅ OK | No changes to party services |
| Inventory | ✅ OK | No changes to inventory services |
| Reporting | ✅ OK | No changes to report services |

---

## 5. Known Issues (Unchanged from Step 54)

| Issue | Severity | Status |
|---|---|---|
| Live DB missing customers/products/suppliers/warehouses | Medium | DATA GAP — not seeded |
| COGS GL posting not implemented | Low | SPECIFICATION GAP — source unknown |
| Per-line FED/advance/further tax not persisted | Low | SCHEMA GAP |

---

## 6. Files Changed

| File | Change |
|---|---|
| `src/ui/lib/demoData.ts` | Bill detail handler now returns `BillDetail` shape with `taxSummary`, `partyType`, `partyAccountCode` |
