# 34 — LEGACY PARITY IMPLEMENTATION ROADMAP

**Date:** 2026-08-28
**Source:** audit/33_COMPLETE_LEGACY_PARITY_MATRIX.md
**Rule:** LEGACY BEHAVIOR = SOURCE OF TRUTH | NEW UI = MODERN IMPLEMENTATION
**Safety:** Legacy ERP is READ-ONLY. No write operations.

---

## PHASE 1: CORE TRANSACTION LIFECYCLE (Steps 18-23)

Phase 1 closes the 28 HIGH priority gaps. Every step produces a working, testable feature.

### Step 18 — Journal Line-by-Line Entry + Cash Book

**Gap:** Journal workflow forces balanced-at-submit. Legacy builds vouchers line-by-line. Cash Book is entirely missing.

**Files to modify/create:**
- `src/domain/services/CashBookService.ts` (NEW)
- `src/ui/pages/Finance.tsx` (modify Vouchers tab — line-by-line entry)
- `src/ui/pages/CashBook.tsx` (NEW — dedicated Cash Book page)
- `src/ui/App.tsx` (add `/cash-book` route)
- `src/ui/components/layout/Sidebar.tsx` (add Cash Book nav item)
- `src/ui/services.ts` (wire CashBookService)

**Behavior to implement:**
1. Journal voucher entry: add lines ONE AT A TIME, delete individual lines, unbalanced allowed during building, balance validated only on post/save
2. Reference/contra account field exposed in line entry UI
3. Cash Book: select cash account → show opening balance → add receive/payment entries → show closing balance
4. Cash Book voucher types: CV, CP, CR
5. Opening/closing balance calculation: `Closing = Opening + SUM(Debits) - SUM(Credits)`

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 19 — Sale Return (SRV) + Purchase Return (PRV)

**Gap:** SRV and PRV entirely missing. Returns are core to distribution.

**Files to modify/create:**
- `src/domain/services/SaleReturnService.ts` (NEW)
- `src/domain/services/PurchaseReturnService.ts` (NEW)
- `src/ui/pages/Sales.tsx` (add Sale Returns tab)
- `src/ui/pages/Purchases.tsx` (add Purchase Returns tab)
- `src/ui/services.ts` (wire new services)

**Accounting (verified legacy):**
- SRV: DEBIT Sales Return + Tax Payable, CREDIT Customer AR. Stock RETURN (increase).
- PRV: DEBIT Supplier AP, CREDIT Inventory + Tax Input. Stock RETURN (decrease).

**Behavior:** Create return bill, post to ledger, reverse stock movement, update party balance.

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 20 — Supplier Payment Service (CP/PV)

**Gap:** No supplier payment workflow. Legacy uses CP (cash) and PV (bank) on Cash Book/Journal.

**Files to modify/create:**
- `src/domain/services/SupplierPaymentService.ts` (NEW)
- `src/ui/pages/SupplierPayments.tsx` (NEW)
- `src/ui/App.tsx` (add `/supplier-payments` route)
- `src/ui/components/layout/Sidebar.tsx` (add Supplier Payments nav item)
- `src/ui/services.ts` (wire SupplierPaymentService)

**Accounting:**
- CP (Cash): DEBIT Supplier AP, CREDIT Cash
- PV (Bank): DEBIT Supplier AP, CREDIT Bank

**Behavior:** Select supplier → show AP balance → enter amount → select cash/bank → create + post.

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 21 — Sale Bill Update + Purchase Bill Update

**Gap:** No updateSaleBill() or updatePurchaseBill(). Bills can't be edited after creation.

**Files to modify:**
- `src/domain/services/SalesService.ts` (add updateSaleBill method)
- `src/domain/services/PurchaseService.ts` (add updatePurchaseBill method)
- `src/ui/pages/Sales.tsx` (add edit mode for existing bills)
- `src/ui/pages/Purchases.tsx` (add edit mode for existing bills)

**Behavior:** Open existing DRAFT bill → modify lines → save updates → re-validate balanced.

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 22 — Bills List with Full Filters

**Gap:** No dedicated Bills List page. No type/date/party/item/Sale Man filters.

**Files to modify/create:**
- `src/ui/pages/BillsList.tsx` (NEW — unified bills list for SV/PV/SRV/PRV)
- `src/ui/App.tsx` (add `/bills-list` route)
- `src/ui/components/layout/Sidebar.tsx` (add Bills List nav item)

**Filters to implement:**
- Voucher type (SV/PV/SRV/PRV/All)
- Date from/to
- Party (customer/supplier search)
- Item (product search)
- Sale Man (after Step 23)

**Behavior:** Filter → list → click to open bill in edit mode → print.

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 23 — Sale Man Entity

**Gap:** Sale Man entity entirely missing. Bills can't be associated with sale men.

**Files to modify/create:**
- `src/domain/types/saleMan.ts` (NEW — SaleMan entity)
- `src/domain/repositories/ISaleManRepository.ts` (NEW)
- `src/domain/adapters/mock/MockSaleManAdapter.ts` (NEW)
- `src/ui/pages/SaleMan.tsx` (NEW — CRUD page)
- `src/ui/App.tsx` (add `/sale-man` route)
- `src/ui/components/layout/Sidebar.tsx` (add Sale Man nav item under Add)
- `src/ui/services.ts` (wire adapter)
- `src/domain/types/voucher.ts` (add saleManId to VoucherHeader if needed)
- `src/ui/pages/Sales.tsx` (add Sale Man dropdown on bill form)
- `src/ui/pages/Purchases.tsx` (add Sale Man dropdown on bill form)

**Fields:** number (auto or manual), name, active status.

**Test:** `npx tsc --noEmit && npm run build`

---

## PHASE 2: REPORTS (Steps 24-28)

### Step 24 — Aging Report

**Gap:** Aging Report entirely missing. Critical for AR/AP management.

**Files to modify/create:**
- `src/domain/services/AgingService.ts` (NEW)
- `src/domain/types/reports.ts` (add AgingReportDTO)
- `src/ui/pages/AgingReport.tsx` (NEW)
- `src/ui/App.tsx` (add `/aging` route)
- `src/ui/components/layout/Sidebar.tsx` (add Aging nav item)

**Behavior:** Select customer/supplier → compute outstanding by aging buckets (current, 30, 60, 90, 120+ days) → display report.

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 25 — Ledger Enhancements (Type Filter + Navigation)

**Gap:** No Sales Tax ledger type. No customer/supplier→ledger shortcut.

**Files to modify:**
- `src/ui/components/finance/FinancialReportsView.tsx` (add ledger type filter if separated)
- `src/ui/pages/Sales.tsx` (add "View Ledger" button on customer detail)
- `src/ui/pages/Purchases.tsx` (add "View Ledger" button on supplier detail)
- `src/ui/pages/CustomerReceipts.tsx` (add "View Ledger" link)
- `src/ui/pages/Finance.tsx` (accept accountId param for pre-selection)

**Behavior:** Click "View Ledger" on any customer/supplier → opens Ledger tab with that account pre-selected.

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 26 — Trial Balance With Activity + Stock Reports

**Gap:** TBWA, Stock Balance With Activity, Stock Demand, Item Ledger with filters — all missing.

**Files to modify/create:**
- `src/domain/services/StockReportService.ts` (NEW)
- `src/ui/pages/StockReports.tsx` (NEW — Item Ledger, Stock Balance, StockBWA, Stock Demand)
- `src/ui/components/finance/FinancialReportsView.tsx` (add TBWA tab)
- `src/domain/types/reports.ts` (add TBWA DTO, StockReport DTOs)

**Behavior:**
- TBWA: Opening + period debit/credit activity + closing per account
- Item Ledger: Date range + item filter → quantity in/out/balance
- Stock Balance: Item range + date range → stock quantities + values
- Stock Demand: Items below reorder level
- StockBWA: Detailed stock activity with opening/closing

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 27 — Voucher Viewer + Transaction Navigation

**Gap:** Can't open/view existing vouchers from list. No line detail view.

**Files to modify/create:**
- `src/ui/pages/VoucherViewer.tsx` (NEW — or modal in Finance.tsx)
- `src/ui/pages/Finance.tsx` (add click-to-open on voucher list)

**Behavior:** Voucher list → click → opens voucher detail view showing header + all lines + debit/credit + balance + print button.

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 28 — Voucher Browsing Filters

**Gap:** No voucher type filter on entries list. Missing date range filter.

**Files to modify:**
- `src/ui/pages/Finance.tsx` (add type filter dropdown + date range to voucher list)

**Behavior:** Filter by voucher type (JV/CV/PV/CP/CR/SV/PV/SRV/PRV/All) + date range.

**Test:** `npx tsc --noEmit && npm run build`

---

## PHASE 3: MASTER DATA PARITY (Steps 29-31)

### Step 29 — Item Hierarchy (Super Head / Main Head)

**Gap:** Items use flat category. Legacy has Super Head → Main Head → Items hierarchy.

**Files to modify/create:**
- `src/domain/types/inventory.ts` (add ItemSuperHead, ItemMainHead entities)
- `src/domain/repositories/IItemHierarchyRepository.ts` (NEW)
- `src/domain/adapters/mock/MockItemHierarchyAdapter.ts` (NEW)
- `src/ui/pages/Inventory.tsx` (add hierarchy management tabs)
- `src/ui/services.ts` (wire adapter)

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 30 — Bill Form Enhancements

**Gap:** Missing Previous Balance display, Sale Man dropdown, TO% as numeric.

**Files to modify:**
- `src/ui/pages/Sales.tsx` (add prev balance, Sale Man dropdown, fix TO%)
- `src/ui/pages/Purchases.tsx` (add prev balance, Sale Man dropdown, fix TO%)
- `src/domain/types/inventory.ts` (change tradeOffer from string to number, rename to tradeOfferPercent)

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 31 — Account Form Enhancements

**Gap:** Legacy accounts have Owner's Name, Mobile, STN, NTN, CNIC visible on form. Current COA tree may not expose all fields.

**Files to modify:**
- `src/ui/pages/Finance.tsx` (ensure COA edit form exposes all AccountHead fields)

**Test:** `npx tsc --noEmit && npm run build`

---

## PHASE 4: UTILITIES (Steps 32-34)

### Step 32 — Change Password + Logout

**Gap:** No change password page. No explicit logout.

**Files to modify/create:**
- `src/ui/pages/ChangePassword.tsx` (NEW)
- `src/ui/App.tsx` (add `/change-password` route)
- `src/ui/components/layout/Sidebar.tsx` (add Change Password + Logout items)
- `src/domain/services/IAuthService.ts` (add changePassword method)
- `src/domain/adapters/mock/MockAuthService.ts` (implement changePassword)

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 33 — Data Transfer Utilities (Read-Only Safe Versions)

**Gap:** Delete Item/Account Transfer utilities missing. Implement as safe, confirmed operations.

**Files to modify/create:**
- `src/domain/services/DataMigrationService.ts` (NEW — transfer item/account data)
- `src/ui/pages/Utilities.tsx` (NEW — transfer utilities page)
- `src/ui/App.tsx` (add `/utilities` route)
- `src/ui/components/layout/Sidebar.tsx` (add Utilities nav item)

**Behavior:** Transfer with confirmation dialog, validation, dependency check, audit log. No destructive operations without explicit confirmation.

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 34 — Account Transfer / Change Area

**Gap:** AcTransfer.aspx functionality missing.

**Files to modify:**
- `src/domain/services/DataMigrationService.ts` (add changeAccountArea method)
- `src/ui/pages/Utilities.tsx` (add account transfer UI)

**Test:** `npx tsc --noEmit && npm run build`

---

## PHASE 5: PRINT / EXPORT / NAVIGATION POLISH (Steps 35-37)

### Step 35 — Print Infrastructure

**Gap:** No print on any voucher, bill, or report.

**Files to modify/create:**
- `src/ui/lib/printUtils.ts` (NEW — print helper functions)
- All voucher/bill pages (add print buttons using printUtils)

**Behavior:** Print → opens print-friendly view → browser print dialog.

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 36 — Bill Navigation (First/Prev/Next/Last)

**Gap:** No bill navigation arrows.

**Files to modify:**
- `src/ui/pages/Sales.tsx` (add navigation controls)
- `src/ui/pages/Purchases.tsx` (add navigation controls)

**Test:** `npx tsc --noEmit && npm run build`

---

### Step 37 — Report Export

**Gap:** No report export to PDF/Excel.

**Files to modify/create:**
- `src/ui/lib/exportUtils.ts` (NEW — export to CSV/PDF helpers)
- All report views (add export buttons)

**Test:** `npx tsc --noEmit && npm run build`

---

## DEPENDENCY GRAPH

```
Step 18 (Journal + Cash Book)
  ├── Step 19 (Returns) — depends on voucher infrastructure
  ├── Step 20 (Supplier Payments) — depends on Cash Book
  └── Step 21 (Bill Update) — independent

Step 22 (Bills List) — depends on Step 19, 20 (needs all bill types)
Step 23 (Sale Man) — independent, but needed by Step 22 filters

Step 24 (Aging) — independent
Step 25 (Ledger Enhancements) — independent
Step 26 (TBWA + Stock Reports) — independent
Step 27 (Voucher Viewer) — depends on Step 18
Step 28 (Voucher Filters) — depends on Step 18

Step 29 (Item Hierarchy) — independent
Step 30 (Bill Form Enhancements) — depends on Step 23 (Sale Man)
Step 31 (Account Form) — independent

Step 32 (Change Password + Logout) — independent
Step 33-34 (Data Migration) — independent
Step 35 (Print) — depends on all pages existing
Step 36 (Bill Navigation) — depends on Step 22
Step 37 (Export) — depends on all reports existing
```

---

## RECOMMENDED STEP 18 SCOPE

Based on dependency analysis and impact:

**Step 18 should implement:**

1. **Journal line-by-line entry** — Fix Finance.tsx VoucherEntryForm to add/delete lines individually
2. **Cash Book page** — New CashBookService + CashBook.tsx with opening/closing balance
3. **Wire Cash Book into navigation** — Route + Sidebar

**Step 18 files:**
- MODIFY: `src/ui/pages/Finance.tsx` (voucher entry rework)
- CREATE: `src/domain/services/CashBookService.ts`
- CREATE: `src/ui/pages/CashBook.tsx`
- MODIFY: `src/ui/App.tsx` (add route)
- MODIFY: `src/ui/components/layout/Sidebar.tsx` (add nav item)
- MODIFY: `src/ui/services.ts` (wire service)

**Step 18 test:** `npx tsc --noEmit && npm run build`

**WAIT FOR APPROVAL BEFORE IMPLEMENTING STEP 18.**
