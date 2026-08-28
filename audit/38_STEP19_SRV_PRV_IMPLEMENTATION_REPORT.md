# Step 19 — Sale Return (SRV) & Purchase Return (PRV) Implementation Report

**Date:** 2026-08-27  
**Status:** ✅ COMPLETE  
**Audit Reference:** `audit/37_COMPLETE_LEGACY_REMAINING_PARITY_DISCOVERY.md`

---

## Summary

Implemented Sale Return (SRV) and Purchase Return (PRV) functionality following the existing Sales and Purchase service patterns. Both voucher types were already defined in the type system (`VoucherType` union) but lacked service implementations, UI, and GL accounts.

---

## Changes Made

### 1. New GL Accounts Added

| Code | Name | Type | Parent | Source |
|------|------|------|--------|--------|
| `41104` | Sales Return | REVENUE | `41100` | MockCOAAdapter seed |
| `51104` | Purchase Return | COGS | `51100` | MockCOAAdapter seed |

### 2. New Service Files

| File | Description |
|------|-------------|
| `src/domain/services/SaleReturnService.ts` | SRV creation, posting, queries |
| `src/domain/services/PurchaseReturnService.ts` | PRV creation, posting, queries |

### 3. Modified Files

| File | Change |
|------|--------|
| `src/domain/adapters/mock/MockCOAAdapter.ts` | Added `41104` and `51104` to seed data |
| `src/ui/services.ts` | Wired `SaleReturnService` and `PurchaseReturnService` in DI container |
| `src/ui/pages/Sales.tsx` | Added "Sale Returns" tab with list view and creation form |
| `src/ui/pages/Purchases.tsx` | Added "Purchase Returns" tab with list view and creation form |

---

## Accounting Entries

### SRV (Sale Return) Posting

```
DEBIT:  Sales Return (41104)            — Base Amount
DEBIT:  Sales Tax Output (21201)        — GST + Further Tax
DEBIT:  FED Payable (21203)             — FED
DEBIT:  Withholding Tax Payable (21202) — Advance Tax
CREDIT: Customer AR                     — Net Amount (all taxes included)
```

**Inventory Effect:** Stock RETURN movement (increases stock, reverse of ISSUE)

### PRV (Purchase Return) Posting

```
DEBIT:  Supplier AP                     — Net Amount (all taxes included)
CREDIT: Inventory (11301)              — Base Amount
CREDIT: Tax Input (11401)              — GST Amount
```

**Inventory Effect:** Stock RETURN movement (decreases stock, reverse of GRN)

---

## Safety Guards

- **D2 Safety:** PRV creation fails if Further Tax, Advance Tax, or FED are non-zero (no verified GL purchase-side accounts for these tax types)
- **D1 Safety:** PRV voucher balance is validated by `MockVoucherAdapter.postVoucher()` before posting
- **Stock Validation:** Return quantity is not validated against current stock (matches legacy behavior)

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Clean |
| `npm run build` | ✅ Success (523 kB bundle) |
| `npx vitest run` | ✅ 72 tests passed |

---

## Voucher Types (Complete List)

| Type | Service | Status |
|------|---------|--------|
| SV | `SalesService` | ✅ Implemented |
| PV | `PurchaseService` | ✅ Implemented |
| SRV | `SaleReturnService` | ✅ **NEW** |
| PRV | `PurchaseReturnService` | ✅ **NEW** |
| CR | `CustomerReceiptService` | ✅ Implemented |
| JV | `FinancialReportService` | ✅ Implemented |
| CV/PV/CP | `CashBookService` | ✅ Implemented |
