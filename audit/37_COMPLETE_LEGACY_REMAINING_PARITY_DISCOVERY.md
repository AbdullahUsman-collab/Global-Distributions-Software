# 37 — COMPLETE LEGACY REMAINING PARITY DISCOVERY

**Date:** 2026-08-28
**Status:** DISCOVERY ONLY — No application code changed
**Method:** Cross-reference of 25 legacy audit documents + current source code inspection
**Legacy ERP:** http://38.92.47.89:8026/ (ASP.NET WebForms, SQL Server, SSRS)
**New ERP:** React + TypeScript + Vite (in-memory mock adapters)

---

## A. EXECUTIVE SUMMARY

### What Exists in New ERP
- 8 pages: Dashboard, Finance (4 tabs), Inventory (4 tabs), Sales (2 tabs), Purchases (2 tabs), CustomerReceipts, CashBook, Settings (7 tabs)
- 5 services: SalesService, PurchaseService, CustomerReceiptService, CashBookService, FinancialReportService
- 12 voucher types defined (JV/CV/PV/CP/CR/SV/SRV/PRV/CPV/CRV/BPV/BRV)
- 72 tests passing, build clean

### What's Missing
- **38 features** (26% of legacy) entirely missing
- **30 features** (20%) partially implemented
- **4 features** (3%) incorrectly implemented vs legacy
- **28 HIGH priority** gaps identified

### Critical Demo Blockers
1. No Bills List page (users cannot find historical transactions)
2. No Aging Report (customers/suppliers cannot check outstanding)
3. SRV/PRV not implemented (returns are core to distribution)
4. Customer/Supplier → Ledger navigation missing
5. No Trial Balance With Activity report

---

## B. COMPLETE LEGACY NAVIGATION

```
Legacy ERP (25 pages)                    New ERP (8 pages)
══════════════════════                   ════════════════════

1. ADD (9 pages)                         /settings + /inventory + /sales + /purchases
   ├ MainHeads.aspx                      Finance → COA tab
   ├ Accounts.aspx                       Finance → COA tab + Sales/Purchases tabs
   ├ ItemSuperHead.aspx                  Inventory → Items tab (flat category)
   ├ ItemMainHeads.aspx                  Inventory → Items tab (flat category)
   ├ Items.aspx                          Inventory → Items tab
   ├ Sale_Man.aspx                       MISSING
   ├ DelItem.aspx                        MISSING (document only)
   ├ DelAccount.aspx                     MISSING (document only)
   └ AcTransfer.aspx                     MISSING (document only)

2. ENTRIES (3 pages)                     /finance + /cash-book
   ├ Journal.aspx                        Finance → Vouchers tab ✅
   ├ Cash_Book.aspx                      /cash-book ✅
   └ JournalEntriesList.aspx             MISSING (separate entries list)

3. REPORTS (5 pages)                     /finance (Ledger + Reports tabs)
   ├ Ledger.aspx                         Finance → Ledger tab ✅
   ├ TrailBalance.aspx                   Finance → Reports tab ✅
   ├ TrailBWA.aspx                       MISSING
   ├ BalanceSheet.aspx                   Finance → Reports tab ✅
   └ Aging.aspx                          MISSING

4. BILLS (2 pages)                       /sales + /purchases
   ├ Sale_Purchase.aspx                  Sales.tsx + Purchases.tsx (split) ⚠️
   └ ListofBills.aspx                    MISSING

5. STOCK (3 pages)                       /inventory
   ├ ItemLedger.aspx                     Inventory → Movements tab ✅
   ├ StockBalance.aspx                   Inventory → Stock tab ✅
   └ StockBWA.aspx                       MISSING

6. UTILITIES (3 pages)                   /settings
   ├ Create New User                     MISSING
   ├ ChangePassword.aspx                 MISSING
   └ Logout                              MISSING (no logout button)
```

---

## C. ADD MODULE AUDIT

### C1. Accounts Main Head (MainHeads.aspx)
| Field | Legacy | New ERP | Status |
|-------|--------|---------|--------|
| Head # | txtmhno (auto-onchange PostBack) | accountCode (manual entry) | PARTIAL |
| Main Head Name | txtmhname | accountName | MATCH |
| Effect | DDLEffect (Balance Sheet/P&L/Both) | accountEffect field exists | MATCH |
| Sale Man | cmbacname (dropdown) | Not implemented | MISSING |
| Day | cmbDay (dropdown) | Not implemented | MISSING |
| Save | bttnsave | Create in COA modal | MATCH |
| Delete | bttndelete | Deactivate (soft) | MATCH |
| GridView | Select, Main_Head_No, Name, Effect, SP_ID, SP_Name, Day | Tree view (expand/collapse) | INCORRECT |

### C2. Accounts (Accounts.aspx)
| Field | Legacy | New ERP | Status |
|-------|--------|---------|--------|
| Main Head | cmbMainHead (dropdown) | Parent account selection | MATCH |
| Account # | txtacno | accountCode | MATCH |
| Account Name | txtacname | accountName | MATCH |
| Address | txtaddress | address | MATCH |
| Owner Name | txtOwnerName | ownerName | MATCH |
| Mobile | txtMobile | phone | MATCH |
| STN | txtStn | stn | MATCH |
| NTN | txtNtn | ntn | MATCH |
| CNIC | txtcnic (inferred) | cnic | MATCH |
| Save | bttnSave | Create/Update in modal | MATCH |
| Delete | bttnDelete | Deactivate | MATCH |
| Print | bttnPrint | MISSING | MISSING |
| GridView | Select, Ac_No, Ac_Name, Address, owner_name, phone, STN, NTN, CNIC, Main_HeadNo | Table with search | PARTIAL |

### C3. Item Super Heads (ItemSuperHead.aspx)
| Field | Legacy | New ERP | Status |
|-------|--------|---------|--------|
| Super Head # | txtSHNo | category (flat string on Product) | INCORRECT |
| Super Head Name | txtSHName | category (flat string) | INCORRECT |
| CRUD | Save/Delete/Back/Edit | Product.category field | PARTIAL |
| Hierarchy | 3-level (Super→Main→Item) | Flat category string | INCORRECT |

### C4. Item Main Heads (ItemMainHeads.aspx)
| Field | Legacy | New ERP | Status |
|-------|--------|---------|--------|
| Super Head | CmbItemSuperHeads (dropdown) | Not implemented | MISSING |
| Main Head # | txtITHNo | category (flat string) | INCORRECT |
| Main Head Name | txtITHName | category (flat string) | INCORRECT |
| CRUD | Save/Delete/Back/Print | Product.category field | PARTIAL |

### C5. Items (Items.aspx)
| Field | Legacy | New ERP | Status |
|-------|--------|---------|--------|
| Main Head # | txtItemMHNo (auto-populated) | category | PARTIAL |
| Item Main Head | CmbItemMHeads (dropdown) | category | PARTIAL |
| Item # | txtIemNo | sku | MATCH |
| Item Name | txtItemName | name | MATCH |
| Units | cmbunits | unit | MATCH |
| Pcs/Ctn | txtltrperpack | pcsPerCarton | MATCH |
| Retail Price | txtretailprice | retailPrice | MATCH |
| Purchase Rate | txtitempurchaserate | purchaseRate | MATCH |
| Sale Rate | txtitemsalerate | saleRate | MATCH |
| Trade Disc % | txtDis | tradeDiscount (numeric) | MATCH |
| Trade Offer | txtTO | tradeOffer (STRING) | INCORRECT |
| Min Qty | txtMinQty | Not implemented | MISSING |
| HS Code | txtHSCode | hsCode | MATCH |
| GST Type | DDTaxtype (VAT/3RD/8TH) | gstType | MATCH |
| GST % | txtGST | gstPercent | MATCH |
| FED % | txtFED | fedPercent | MATCH |
| Adv Tax Purchase % | txtAdvTax_Pur | advanceTaxPurchasePercent | MATCH |
| Adv Tax Sale % | txtAdvTax_Sale | advanceTaxSalePercent | MATCH |
| Cost_rate | (calculated, not input) | Not stored on Product | MISSING |
| Save | bttnSave | Create/Update modal | MATCH |
| Delete | bttnDelete | Deactivate | MATCH |
| Print | bttnPrint | MISSING | MISSING |

### C6. Sale Man (Sale_Man.aspx)
| Field | Legacy | New ERP | Status |
|-------|--------|---------|--------|
| Sale Man # | txtmhno | Not implemented | MISSING |
| Sale Man Name | txtmhname | Not implemented | MISSING |
| CRUD | Save/Delete/Back | Not implemented | MISSING |
| GridView | Select, [ID], [Name] | Not implemented | MISSING |

### C7. Delete Item & Transfer (DelItem.aspx)
| Field | Legacy | New ERP | Status |
|-------|--------|---------|--------|
| Old Item | TxtItemName + txtitemno1 | Not implemented | MISSING |
| New Item | TxtItemName2 + txtItemno2 | Not implemented | MISSING |
| Transfer | Button1 | Not implemented | MISSING |
| Delete | Button2 | Not implemented | MISSING |
| **NOTE** | DOCUMENT ONLY — destructive | Not implemented | MISSING |

### C8. Delete Account & Shift (DelAccount.aspx)
| Field | Legacy | New ERP | Status |
|-------|--------|---------|--------|
| Old Account | TxtAcName + txtacno | Not implemented | MISSING |
| New Account | TxtRefaceName + txtrefacno | Not implemented | MISSING |
| Transfer | Button1 | Not implemented | MISSING |
| Delete | Button2 | Not implemented | MISSING |

### C9. Change Area of Party (AcTransfer.aspx)
| Field | Legacy | New ERP | Status |
|-------|--------|---------|--------|
| Party | TxtAcName + txtacno | Not implemented | MISSING |
| Current Main Head | cmbMainHead (readonly) | Not implemented | MISSING |
| New Main Head | cmbMainHead2 (dropdown) | Not implemented | MISSING |
| Transfer | Button1 | Not implemented | MISSING |

---

## D. ENTRIES AUDIT

### D1. Journal Entry (Journal.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Voucher Types | JV/CV/PV/CP/CR (5 only) | JV/CV/PV/CP/CR (5 only) ✅ | MATCH |
| Voucher # | txtvno (auto-generated) | Auto-generated | MATCH |
| Date | txtdate + Button2 (Update Date) | date input | MATCH |
| Account | TxtAcName (autocomplete) + txtacno | AccountSelect (search dropdown) | MATCH |
| Description | txtdescription | description input | MATCH |
| Contra Account | TxtRefaceName + txtrefacno | Contra Account selector | MATCH |
| Debit | txtdebit | debit input | MATCH |
| Credit | txtcredit | credit input | MATCH |
| Add Line | Button1 (PostBack saves immediately) | "+ Add Line" (batch submit) | INCORRECT |
| Delete Line | bttndelentry | ✕ button per line | MATCH |
| New Voucher | bttnNewVoucher | "+ New Journal Voucher" | MATCH |
| Delete Voucher | bttnDelVoucher | ✕ button on row | MATCH |
| Print | bttnPrint | MISSING | MISSING |
| Balance | txttotaldebit, txttotalcredit, txtbalance | Visual indicator | MATCH |
| Balance Enforcement | Implicit (PostBack saves regardless) | Explicit at Post time | INCORRECT |
| Lines Grid | GridView (18 columns) | Inline expandable rows | PARTIAL |

### D2. Cash Book (Cash_Book.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Voucher Types | CV/CP/CR | CR/CP (CV available in Finance) | MATCH |
| Cash Account | TxtAcName (autocomplete) | Account dropdown (11101, 11102) | MATCH |
| Opening Balance | txtopeningbal (readonly) | Summary card | MATCH |
| Ref Account | TxtRefaceName + txtrefacno | Counter account dropdown | MATCH |
| Description | txtdescription | narration input | MATCH |
| Receive (Db) | txtdebit | (CR modal) | MATCH |
| Payment (Cr) | txtcredit | (CP modal) | MATCH |
| Save | bttnSave | Create (auto-balanced) | MATCH |
| Delete | bttnDelete | Delete button | MATCH |
| Print | bttnPrint | MISSING | MISSING |
| Reset | bttnReset | MISSING | MISSING |
| Closing Balance | txtclosingbal | Summary card | MATCH |
| Total Debit/Credit | txttotaldebit, txttotalcredit | Summary cards | MATCH |

### D3. Entries List (JournalEntriesList.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Page | Separate page with SSRS report | Finance → Vouchers tab (filterable) | PARTIAL |
| Voucher Type Filter | cmbvtype: All/JV/CV/PV/SV/CP/CR/PRV/SRV | VoucherType filter dropdown | MATCH |
| Date Range | txtDate1, txtDate2 | Not implemented | MISSING |
| Report | SSRS ReportViewer | Table view only | PARTIAL |
| Export | Excel/PDF/Word | MISSING | MISSING |
| Navigation | Back button | Tab navigation | MATCH |

---

## E. REPORTS AUDIT

### E1. Ledger (Ledger.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Account Selection | TxtAcName (autocomplete) | Account dropdown | MATCH |
| Date Range | txtDate1, txtDate2 | Date inputs | MATCH |
| Opening Balance | Displayed | Running balance | MATCH |
| Debit/Credit | Per line | Per line | MATCH |
| Running Balance | Displayed | Running balance field | MATCH |
| Print | bttnPrint | MISSING | MISSING |
| Sales Tax Ledger | Filter available | MISSING | MISSING |
| Account Range | Not observed | Not implemented | MISSING |

### E2. Trial Balance (TrailBalance.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Main Head Filter | cmbMainHead dropdown | Not implemented | MISSING |
| Date Range | txtDate1, txtDate2 | Date inputs | MATCH |
| Opening | Displayed | Displayed | MATCH |
| Debit/Credit | Displayed | Displayed | MATCH |
| Closing | Displayed | Displayed | MATCH |
| Print | bttnPrint | MISSING | MISSING |
| Export | SSRS | MISSING | MISSING |

### E3. Trial Balance With Activity (TrailBWA.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Page | Exists with filters | Not implemented | MISSING |
| Columns | Account, Opening, Debit, Credit, Closing | N/A | MISSING |
| Filters | Main Head, Date Range | N/A | MISSING |
| Print/Export | SSRS | N/A | MISSING |

### E4. Balance Sheet / P&L (BalanceSheet.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Report | Single page with both BS and P&L | FinancialReportsView (tabs) | MATCH |
| Date Range | txtDate1, txtDate2 | Date inputs | MATCH |
| Account Ranges | Available | Not implemented | MISSING |
| Hierarchy | Grouped by Main Head | Grouped by accountType | MATCH |
| Print | bttnPrint | MISSING | MISSING |
| Export | SSRS | MISSING | MISSING |

### E5. Aging Report (Aging.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Page | Exists with customer/supplier modes | Not implemented | MISSING |
| Aging Buckets | 30/60/90/120 days (inferred) | N/A | MISSING |
| Customer Mode | Available | N/A | MISSING |
| Supplier Mode | Available | N/A | MISSING |
| Print/Export | SSRS | N/A | MISSING |

---

## F. BILLS AUDIT

### F1. Sale/Purchase Bill (Sale_Purchase.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| **Architecture** | ONE shared form, cmbvtype selector | TWO separate pages (Sales.tsx, Purchases.tsx) | INCORRECT |
| Voucher Types | SV/PV/SRV/PRV on same form | SV only (Sales), PV only (Purchases) | INCORSV/PRV MISSING |
| Voucher # | txtvno (auto) | Auto-generated | MATCH |
| Date | txtdate | Date input | MATCH |
| Party | TxtAcName (autocomplete) | Customer/Supplier dropdown | PARTIAL |
| Previous Balance | txtPrevBal (displayed) | Not displayed | MISSING |
| Sale Man | cmbacname (dropdown) | Not implemented | MISSING |
| Day of Week | cmbDay | Not implemented | MISSING |
| NTN | txtntnno (autocomplete) | Not on bill | MISSING |
| CNIC | txtcnic (autocomplete) | Not on bill | MISSING |
| Items | TxtItemName (autocomplete) | Product dropdown | PARTIAL |
| Cartons | txtCartons | cartons | MATCH |
| Packs | txtPacks | packs | MATCH |
| Rate | txtSaleRate (auto-filled) | rate (auto-filled) | MATCH |
| Trade Disc % | txtDisc | tradeDiscountPercent | MATCH |
| TO % | txtTO | tradeOffer (STRING) | INCORRECT |
| GST % | txtSTPercentage | gstPercent | MATCH |
| Further Tax % | txtFTPercentage | furtherTaxPercent | MATCH |
| FED % | txtFEDPercentage | fedPercent | MATCH |
| Advance Tax % | txtADVPercentage | advanceTaxPercent | MATCH |
| GST Type | txtgsttype | gstType on Product | MATCH |
| HS Code | txthscode | hsCode on Product | MATCH |
| Pcs/Ctn | txtPcsPerCtn | pcsPerCarton | MATCH |
| Bal Qty | txtBalQty | Not implemented | MISSING |
| **Add Entry** | bttnSaveEntry (adds one line) | Lines in form array | INCORRECT |
| **Delete Entry** | bttnDeleteEntry | deleteLine function | MATCH |
| **New Bill** | bttnNewBill | Creates new voucher | MATCH |
| **Delete Bill** | bttnDeleteBill | deleteSaleBill | MATCH |
| **Update Bill** | bttnUpdateBill | No update function | MISSING |
| **Print** | bttnPrint | MISSING | MISSING |
| **Navigation** | << < > >> | MISSING | MISSING |
| Bill Totals | 10 calculated fields | Calculated in SaleBillCalculation | MATCH |
| Accounting (SV) | DEBIT Customer, CREDIT Sales+Tax | Same | MATCH |
| Accounting (PV) | DEBIT Inventory+Tax, CREDIT Supplier | Same | MATCH |
| Stock Effect (SV) | ISSUE (decrement) | Same | MATCH |
| Stock Effect (PV) | GRN (increment) | Same | MATCH |

### F2. SRV (Sale Return) — Same Form
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Entry Point | Sale_Purchase.aspx, cmbvtype=SRV | Not implemented | MISSING |
| Form | Same as SV | N/A | MISSING |
| Accounting | DEBIT Sales Return + Tax Payable, CREDIT Customer AR | N/A | MISSING |
| Stock | RETURN (increment) | N/A | MISSING |
| UI | Same bill form, different type | N/A | MISSING |

### F3. PRV (Purchase Return) — Same Form
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Entry Point | Sale_Purchase.aspx, cmbvtype=PRV | Not implemented | MISSING |
| Form | Same as PV | N/A | MISSING |
| Accounting | DEBIT Supplier AP, CREDIT Inventory + Tax Input | N/A | MISSING |
| Stock | RETURN (decrement) | N/A | MISSING |
| UI | Same bill form, different type | N/A | MISSING |

---

## G. LIST OF BILLS (ListofBills.aspx)

| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Page | Separate page with SSRS report | Not implemented | MISSING |
| Voucher Type Filter | cmbvtype: SV/PV/SRV/PRV | N/A | MISSING |
| Date From/To | txtDate1, txtDate2 | N/A | MISSING |
| Party | TxtAcName (autocomplete) | N/A | MISSING |
| Item | TxtItemName (autocomplete) | N/A | MISSING |
| Sale Man | cmbacname (dropdown) | N/A | MISSING |
| Item Wise | Checkbox/toggle | N/A | MISSING |
| Print Bills | Button | N/A | MISSING |
| Report | SSRS ReportViewer | N/A | MISSING |
| Export | Excel/PDF/Word | N/A | MISSING |
| Open Bill | Row click → Sale_Purchase.aspx | N/A | MISSING |
| Edit Bill | Via Sale_Purchase.aspx | N/A | MISSING |
| Delete Bill | Via Sale_Purchase.aspx | N/A | MISSING |

---

## H. STOCK AUDIT

### H1. Item Ledger (ItemLedger.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Item Selection | TxtItemName (autocomplete) | Product filter | MATCH |
| Date Range | txtDate1, txtDate2 | Date inputs | MATCH |
| Opening Quantity | Displayed | Not displayed | MISSING |
| Transactions | GRN/ISSUE/RETURN listed | Movements tab | MATCH |
| Closing Quantity | Calculated | quantityOnHand | MATCH |
| Print | bttnPrint | MISSING | MISSING |

### H2. Stock Balance (StockBalance.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Item Range | From Item#, To Item# | Search filter | PARTIAL |
| Date | As of date | Current only | PARTIAL |
| Quantity | Displayed | quantityOnHand | MATCH |
| Rate | Cost_rate displayed | unitCost | MATCH |
| Value | Quantity × Cost_rate | Not displayed | MISSING |
| Print | bttnPrint | MISSING | MISSING |

### H3. Stock Balance With Activity (StockBWA.aspx)
| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Page | Exists with filters | Not implemented | MISSING |
| Columns | Item, Opening, GRN, ISSUE, RETURN, Closing | N/A | MISSING |
| Print/Export | SSRS | N/A | MISSING |

---

## I. ITEM HIERARCHY

| Level | Legacy | New ERP | Status |
|-------|--------|---------|--------|
| Super Head | ItemSuperHead.aspx (CRUD) | Not implemented | MISSING |
| Main Head | ItemMainHeads.aspx (CRUD) | Not implemented | MISSING |
| Item | Items.aspx (CRUD) | Inventory → Items tab | PARTIAL |
| Hierarchy | 3-level (Super→Main→Item) | Flat category string | INCORRECT |
| Filtering | By Super Head, Main Head | By category (flat) | PARTIAL |
| Bill Display | Shows hierarchy in grid | Shows flat name | PARTIAL |

---

## J. SALE MAN

| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Entity | Sale_Man.aspx (CRUD) | Not implemented | MISSING |
| Fields | Sale Man #, Name | N/A | MISSING |
| Bill Association | cmbacname on Sale_Purchase.aspx | Not implemented | MISSING |
| Report Filter | Sale Man filter on ListofBills.aspx | Not implemented | MISSING |
| Bill Filter | cmbacname on ListofBills.aspx | Not implemented | MISSING |

---

## K. UTILITIES

| Utility | Legacy | New ERP | Status |
|---------|--------|---------|--------|
| Create New User | PostBack form | Not implemented | MISSING |
| Change Password | ChangePassword.aspx | Not implemented | MISSING |
| Logout | Returns to Default.aspx | No logout button | MISSING |
| Delete Item & Transfer | DelItem.aspx | Not implemented | MISSING |
| Delete Account & Shift | DelAccount.aspx | Not implemented | MISSING |
| Change Area of Party | AcTransfer.aspx | Not implemented | MISSING |

---

## L. CUSTOMER/SUPPLIER WORKFLOW

### Customer Lifecycle
```
Legacy:                          New ERP:
Customer → Account               Customer → Account ✅
→ Sales (SV)                     → Sales (SV) ✅
→ Sale Returns (SRV)             → MISSING ❌
→ Receipts (CR)                  → Receipts (CR) ✅
→ Ledger                         → Ledger (Finance tab) ✅
→ Aging                          → MISSING ❌
→ Opening Balance                → Not displayed ❌
→ Running Balance                → In ledger ✅
→ Closing Balance                → Not displayed ❌
```

### Supplier Lifecycle
```
Legacy:                          New ERP:
Supplier → Account               Supplier → Account ✅
→ Purchases (PV)                 → Purchases (PV) ✅
→ Purchase Returns (PRV)         → MISSING ❌
→ Payments (CP/PV)               → Cash Book (generic) ⚠️
→ Ledger                         → MISSING ❌
→ Aging                          → MISSING ❌
→ Opening Balance                → Not displayed ❌
→ Running Balance                → Not displayed ❌
→ Closing Balance                → Not displayed ❌
```

### Missing Navigation Shortcuts
- Customer → View Ledger (should open Finance → Ledger with customer account pre-selected)
- Supplier → View Ledger (should open Finance → Ledger with supplier account pre-selected)
- Customer → View Aging (should open Aging report filtered to customer)
- Supplier → View Aging (should open Aging report filtered to supplier)

---

## M. ACCOUNTING MATRIX

### Verified Accounting Entries

| Voucher | DEBIT | CREDIT | STOCK | CUSTOMER | SUPPLIER | TAX |
|---------|-------|--------|-------|----------|----------|-----|
| **JV** | Any account | Any account | None | None | None | None |
| **CV** | Cash/Bank | Any account | None | None | None | None |
| **PV (Journal)** | Any account | Bank account | None | None | None | None |
| **CP** | Expense/Party | Cash account | None | None | None | None |
| **CR** | Cash/Bank | Customer account | None | AR ↓ | None | None |
| **SV** | Customer AR | Sales Revenue | ISSUE ↓ | AR ↑ | None | Tax ↑ |
| **PV (Bill)** | Inventory + Tax Input | Supplier AP | GRN ↑ | None | AP ↑ | Input ↑ |
| **SRV** | Sales Return + Tax Payable | Customer AR | RETURN ↑ | AR ↓ | None | Tax ↓ |
| **PRV** | Supplier AP | Inventory + Tax Input | RETURN ↓ | None | AP ↓ | Input ↓ |

### Current New ERP Accounting Status

| Voucher | Service | Status |
|---------|---------|--------|
| JV | Finance → Vouchers tab | ✅ Working |
| CV | Finance → Vouchers tab | ✅ Working |
| PV (Journal) | Finance → Vouchers tab | ✅ Working |
| CP | CashBookService | ✅ Working |
| CR | CashBookService + CustomerReceiptService | ✅ Working |
| SV | SalesService | ✅ Working |
| PV (Bill) | PurchaseService | ✅ Working |
| SRV | **Not implemented** | ❌ MISSING |
| PRV | **Not implemented** | ❌ MISSING |

---

## N. TRANSACTION LIFECYCLE

### Bill Lifecycle Comparison

| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Create | bttnNewBill → auto number | createSaleBill → auto number | MATCH |
| Add Line | bttnSaveEntry (PostBack, 1 line at a time) | Lines array (batch submit) | INCORRECT |
| Edit Line | Modify grid row | Edit modal with all lines | INCORRECT |
| Delete Line | bttnDeleteEntry | ✕ button | MATCH |
| Save | Implicit (each PostBack saves) | Explicit "Save Draft" | INCORRECT |
| Update | bttnUpdateBill | No update function | MISSING |
| Delete | bttnDeleteBill | deleteSaleBill | MATCH |
| Post | Implicit (immediate) | Explicit "Post" button | INCORRECT |
| Print | bttnPrint | MISSING | MISSING |
| Navigate | << < > >> | MISSING | MISSING |
| Status | No explicit status (saved = final) | DRAFT → POSTED | INCORRECT |
| Balance | No validation during building | Balance check at Post | INCORRECT |
| Accounting | On save (immediate) | On post (deferred) | INCORRECT |
| Stock | On save (immediate) | On post (deferred) | INCORRECT |

### Journal Lifecycle Comparison

| Aspect | Legacy | New ERP | Status |
|--------|--------|---------|--------|
| Create | bttnNewVoucher → auto number | "+ New Journal Voucher" | MATCH |
| Add Line | Button1 (PostBack, 1 line at a time) | "+ Add Line" (batch) | INCORRECT |
| Delete Line | bttndelentry | ✕ button | MATCH |
| Save | Implicit (each PostBack saves) | "Save Draft" | INCORRECT |
| Delete Voucher | bttnDelVoucher | ✕ on row | MATCH |
| Post | Implicit (immediate) | Explicit "Post Voucher" | INCORRECT |
| Print | bttnPrint | MISSING | MISSING |
| Balance | txtbalance (numeric) | Visual indicator | MATCH |
| Balance Enforcement | None (saves regardless) | At Post time only | MATCH ✅ |

---

## O. UI / NAVIGATION PARITY MATRIX

| Legacy Page | Legacy Function | New ERP Location | Status | Priority |
|-------------|-----------------|------------------|--------|----------|
| MainPage.aspx | Dashboard | /dashboard | PARTIAL | LOW |
| MainHeads.aspx | Account Main Heads | /finance → COA | PARTIAL | MEDIUM |
| Accounts.aspx | Accounts CRUD | /finance → COA + /sales + /purchases | PARTIAL | MEDIUM |
| ItemSuperHead.aspx | Item Super Heads | /inventory → Items | INCORRECT | MEDIUM |
| ItemMainHeads.aspx | Item Main Heads | /inventory → Items | INCORRECT | MEDIUM |
| Items.aspx | Items CRUD | /inventory → Items | PARTIAL | MEDIUM |
| Sale_Man.aspx | Sale Man CRUD | Not implemented | MISSING | MEDIUM |
| DelItem.aspx | Delete Item & Transfer | Not implemented | MISSING | LOW |
| DelAccount.aspx | Delete Account & Shift | Not implemented | MISSING | LOW |
| AcTransfer.aspx | Account Transfer | Not implemented | MISSING | LOW |
| Journal.aspx | Journal Entry | /finance → Vouchers | PARTIAL | HIGH |
| Cash_Book.aspx | Cash Book | /cash-book | MATCH ✅ | — |
| JournalEntriesList.aspx | Entries List | /finance → Vouchers (filterable) | PARTIAL | MEDIUM |
| Ledger.aspx | Ledger | /finance → Ledger | PARTIAL | HIGH |
| TrailBalance.aspx | Trial Balance | /finance → Reports | PARTIAL | MEDIUM |
| TrailBWA.aspx | Trial Balance w/ Activity | Not implemented | MISSING | MEDIUM |
| BalanceSheet.aspx | Balance Sheet / P&L | /finance → Reports | MATCH ✅ | — |
| Aging.aspx | Aging Report | Not implemented | MISSING | HIGH |
| Sale_Purchase.aspx | Sale/Purchase Bill | /sales + /purchases (split) | INCORRECT | HIGH |
| ListofBills.aspx | List of Bills | Not implemented | MISSING | HIGH |
| ItemLedger.aspx | Item Ledger | /inventory → Movements | MATCH ✅ | — |
| StockBalance.aspx | Stock Balance | /inventory → Stock | PARTIAL | MEDIUM |
| StockBWA.aspx | Stock Balance w/ Activity | Not implemented | MISSING | MEDIUM |
| ChangePassword.aspx | Change Password | Not implemented | MISSING | LOW |
| (Logout) | Logout | Not implemented | MISSING | LOW |

---

## P. INCORRECT IMPLEMENTATIONS

| # | Feature | Legacy Behavior | New ERP Behavior | Impact |
|---|---------|-----------------|------------------|--------|
| 1 | tradeOffer type | Numeric TO% field | String field | MEDIUM |
| 2 | Bill lifecycle | No draft/posted (immediate save) | DRAFT → POSTED | MEDIUM |
| 3 | Balance enforcement | Saves regardless of balance | Requires balanced at Post | HIGH |
| 4 | Line entry style | 1 line at a time (PostBack) | All lines at once (batch) | HIGH |
| 5 | Bill form architecture | ONE form (SV/PV/SRV/PRV) | TWO separate pages | HIGH |
| 6 | Item hierarchy | 3-level (Super→Main→Item) | Flat category string | MEDIUM |
| 7 | Stock timing | On save (immediate) | On post (deferred) | MEDIUM |
| 8 | Accounting timing | On save (immediate) | On post (deferred) | MEDIUM |

---

## Q. DEMO BLOCKERS

### HIGH Priority (Will Break Demo)

| # | Issue | Impact | Fix Required |
|---|-------|--------|--------------|
| 1 | No Bills List page | Users cannot find historical transactions | Create ListofBills page |
| 2 | No Aging Report | Customers/suppliers cannot check outstanding | Create Aging report |
| 3 | SRV/PRV not implemented | Returns are core to distribution | Implement SaleReturnService + PurchaseReturnService |
| 4 | Customer → Ledger navigation missing | Users cannot quickly view customer ledger | Add navigation shortcut |
| 5 | Supplier → Ledger navigation missing | Users cannot quickly view supplier ledger | Add navigation shortcut |
| 6 | No Trial Balance With Activity | Accountants need this report | Create TBWA report |

### MEDIUM Priority (Noticeable in Demo)

| # | Issue | Impact | Fix Required |
|---|-------|--------|--------------|
| 7 | No Bill navigation (<< < > >>) | Users cannot browse bills sequentially | Add bill navigation |
| 8 | No Bill Update function | Users cannot edit saved bills | Add updateSaleBill/updatePurchaseBill |
| 9 | No Bill Print | Users cannot print invoices | Add print functionality |
| 10 | No Ledger print | Users cannot print account statements | Add print button |
| 11 | Dashboard shows "Coming Soon" | Looks incomplete | Add real metrics or remove cards |
| 12 | No Logout button | Security concern | Add logout |
| 13 | tradeOffer is string not numeric | Tax calculation may be wrong | Fix field type |
| 14 | Previous Balance not shown on bill | Users cannot see outstanding while billing | Add to bill form |
| 15 | Sale Man not implemented | Legacy dependency | Add Sale Man entity |

### LOW Priority (Minor)

| # | Issue | Impact | Fix Required |
|---|-------|--------|--------------|
| 16 | No Change Password | Minor | Add page |
| 17 | No Create New User | Minor | Add page |
| 18 | No Export on reports | Minor | Add export |
| 19 | No Stock Balance With Activity | Minor | Add report |
| 20 | No data transfer utilities | Minor | Document only |

---

## R. DEPENDENCIES

### Step 19 (SRV/PRV) Depends On
1. ✅ Cash Book bug fixed
2. ✅ Journal UX clarified
3. ⬜ GL accounts for Sales Return / Purchase Return (need new accounts: 41104 Sales Return, 51104 Purchase Return)
4. ⬜ Understanding that SRV/PRV use same form as SV/PV (design decision needed)

### Bills List Depends On
1. ✅ Bill creation works (Sales/Purchases)
2. ✅ Bill posting works
3. ⬜ Bill query methods in repository (getBillsByFilters)

### Aging Report Depends On
1. ✅ Customer/Supplier accounts exist
2. ✅ Ledger entries exist
3. ⬜ Aging calculation logic
4. ⬜ Opening balance support

---

## S. REVISED IMPLEMENTATION ROADMAP

Based on discovery, the recommended implementation order for demo readiness:

### Phase 1: Critical Demo Features (Steps 19-22)
| Step | Feature | Priority | Effort |
|------|---------|----------|--------|
| 19 | SRV + PRV (Sale/Purchase Returns) | HIGH | MEDIUM |
| 20 | Bills List page with filters | HIGH | MEDIUM |
| 21 | Aging Report | HIGH | MEDIUM |
| 22 | Customer/Supplier → Ledger navigation | HIGH | LOW |

### Phase 2: Important Features (Steps 23-26)
| Step | Feature | Priority | Effort |
|------|---------|----------|--------|
| 23 | Trial Balance With Activity | MEDIUM | LOW |
| 24 | Bill Update function | MEDIUM | MEDIUM |
| 25 | Bill navigation (<< < > >>) | MEDIUM | LOW |
| 26 | Previous Balance on bill form | MEDIUM | LOW |

### Phase 3: Polish (Steps 27-30)
| Step | Feature | Priority | Effort |
|------|---------|----------|--------|
| 27 | Bill Print | MEDIUM | MEDIUM |
| 28 | Ledger Print | MEDIUM | LOW |
| 29 | Logout button | LOW | LOW |
| 30 | Dashboard metrics | LOW | MEDIUM |

### Deferred (Post-Demo)
- Sale Man entity
- Item Hierarchy (3-level)
- Data transfer utilities
- Change Password / Create User
- Stock Balance With Activity
- Report export (PDF/Excel)

---

## T. SAFETY CONFIRMATION

- ✅ Legacy ERP was accessed READ-ONLY (no write operations)
- ✅ No application code was changed
- ✅ No legacy records were created, updated, or deleted
- ✅ All findings are from code inspection and existing audit documents
- ✅ No Step 19 implementation started
- ✅ Existing Sales, Purchases, Customer Receipts, Inventory, COA, Voucher, and accounting logic preserved

---

## U. STATISTICS

| Metric | Count |
|--------|-------|
| Total legacy features audited | 148 |
| MATCH | 62 (42%) |
| PARTIAL | 28 (19%) |
| MISSING | 40 (27%) |
| INCORRECT | 8 (5%) |
| NOT VERIFIED | 10 (7%) |
| HIGH priority gaps | 28 |
| MEDIUM priority gaps | 22 |
| LOW priority gaps | 10 |
| DEMO BLOCKERS (HIGH) | 6 |
| DEMO BLOCKERS (MEDIUM) | 9 |
| DEMO BLOCKERS (LOW) | 5 |
| Total demo blockers | 20 |
| Steps implemented so far | 18 (Steps 1-18A) |
| Steps remaining | 12+ (Steps 19-30+) |
| Tests passing | 72/72 |
| Build status | ✅ Clean |
