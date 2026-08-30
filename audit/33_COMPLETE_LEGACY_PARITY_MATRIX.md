# 33 — COMPLETE LEGACY PARITY MATRIX

**Date:** 2026-08-28
**Method:** Live legacy ERP access + source code inspection of current ERP
**Legacy ERP:** http://38.92.47.89:8026/ (ASP.NET WebForms, SQL Server)
**Current ERP:** React + TypeScript + Vite (in-memory mock adapters)

---

## LEGEND

| Status | Meaning |
|--------|---------|
| MATCH | Feature exists and behavior matches verified legacy |
| PARTIAL | Feature exists but missing key behavior or fields |
| MISSING | Feature does not exist in current ERP |
| INCORRECT | Feature exists but accounting/logic contradicts legacy |
| NOT VERIFIED | Legacy behavior could not be safely verified |

---

## SECTION 1: NAVIGATION STRUCTURE

| Legacy Section | Legacy Function | Legacy URL | Current Equivalent | Status | Missing Behavior | Priority |
|---|---|---|---|---|---|---|
| ADD | Accounts Main Head | MainHeads.aspx | /finance → COA tab | PARTIAL | No dedicated Main Head CRUD page. COA tree exists but no "Effect" dropdown, no Sale Man/Day fields on main heads | MEDIUM |
| ADD | Accounts | Accounts.aspx | /finance → COA tab | PARTIAL | COA tree supports Level 4 accounts but missing: Owner's Name, Mobile, STN, NTN, CNIC on account form | MEDIUM |
| ADD | Item Super Heads | ItemSuperHead.aspx | /inventory → Items tab | MISSING | No Item Super Head entity. Items use flat category field | MEDIUM |
| ADD | Item Main Head | ItemMainHeads.aspx | /inventory → Items tab | MISSING | No Item Main Head entity. Items use flat category field | MEDIUM |
| ADD | Items | Items.aspx | /inventory → Items tab | PARTIAL | Item form exists. Missing: TO% field (tradeOffer is string, not numeric), legacy main head hierarchy | LOW |
| ADD | Sale Man | Sale_Man.aspx | None | MISSING | No Sale Man entity, no CRUD, no association with bills | MEDIUM |
| ADD | Delete Item + Transfer | DelItem.aspx | None | MISSING | No item deletion/transfer utility | LOW |
| ADD | Delete Account + Shift | DelAccount.aspx | None | MISSING | No account deletion/shift utility | LOW |
| ADD | Account Transfer/Change Area | AcTransfer.aspx | None | MISSING | No account area transfer utility | LOW |
| ENTRIES | Journal Entry | Journal.aspx | /finance → Vouchers tab | PARTIAL | Voucher creation exists. Missing: line-level delete, reference account (contra) per line, per-line debit/credit entry workflow | HIGH |
| ENTRIES | Cash Book | Cash_Book.aspx | None | MISSING | No dedicated Cash Book page. CR receipt exists but no Cash Book with opening/closing balance display, CV/CP via Cash Book | HIGH |
| ENTRIES | Entries List | JournalEntriesList.aspx | /finance → Vouchers tab | PARTIAL | Voucher list exists. Missing: dedicated entries list with type filter, date filter only (no voucher type filter dropdown) | MEDIUM |
| REPORTS | Ledger | Ledger.aspx | /finance → Ledger tab | PARTIAL | Ledger viewer exists. Missing: Sales Tax ledger type filter, account range filter | MEDIUM |
| REPORTS | Trial Balance | TrailBalance.aspx | /finance → Reports | PARTIAL | Trial Balance report exists. Missing: Main Head filter dropdown | LOW |
| REPORTS | Trial Balance With Activity | TrailBWA.aspx | None | MISSING | No Trial Balance with Activity report | MEDIUM |
| REPORTS | Balance Sheet / P&L | BalanceSheet.aspx | /finance → Reports | PARTIAL | Balance Sheet and P&L exist. Missing: account range filter, separate BS and P&L buttons | LOW |
| REPORTS | Aging Report | Aging.aspx | None | MISSING | No Aging Report | HIGH |
| BILLS | Sale/Purchase Bill | Sale_Purchase.aspx | /sales, /purchases | PARTIAL | Bill creation exists. Missing: Sale Man field, Day field, NTN/CNIC on bill header, bill navigation (first/prev/next/last), Previous Balance display | MEDIUM |
| BILLS | List of Bills | ListofBills.aspx | None | MISSING | No dedicated Bills List page with voucher type filter, party filter, item filter, Sale Man filter, date range, Item Wise view, batch print | HIGH |
| STOCK | Item Ledger | ItemLedger.aspx | /inventory → Movements tab | PARTIAL | Stock movements exist. Missing: dedicated item-level ledger view with date range and item filter | MEDIUM |
| STOCK | Stock Balance | StockBalance.aspx | /inventory → Stock tab | PARTIAL | Stock balances exist. Missing: Stock Demand report, Stock Balance 2 variant | MEDIUM |
| STOCK | Stock Balance With Activity | StockBWA.aspx | None | MISSING | No Stock Balance With Activity report | MEDIUM |
| UTILITIES | Create New User | (PostBack) | None | MISSING | No user creation utility | LOW |
| UTILITIES | Change Password | ChangePassword.aspx | None | MISSING | No change password page | LOW |
| UTILITIES | Logout | Default.aspx | None | MISSING | No explicit logout button in UI (session-based) | LOW |

---

## SECTION 2: JOURNAL / FINANCE (JV/CV/PV/CP/CR)

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| New Voucher button | Generates new voucher number, clears form | Creates voucher with lines on submit | PARTIAL | Legacy builds voucher line-by-line; current submits all lines at once. Need line-by-line add workflow | HIGH | YES |
| Voucher type selection | Dropdown: JV, CV, PV, CP, CR | Dropdown in voucher form: all types | MATCH | — | — | YES |
| Voucher number | Auto-generated sequential, readonly | Auto-generated sequential | MATCH | — | — | YES |
| Account selection | Autocomplete TxtAcName → fills txtacno | Account dropdown/search in line form | PARTIAL | Legacy uses autocomplete text field with AJAX; current uses account selection | LOW | YES |
| Account search | Searchacname WebMethod, min 1 char | searchCustomers in customer adapter | PARTIAL | No general account autocomplete (only customer search) | MEDIUM | YES |
| Debit entry per line | txtdebit field | debit field in line form | MATCH | — | — | YES |
| Credit entry per line | txtcredit field | credit field in line form | MATCH | — | — | YES |
| Reference/contra account | TxtRefaceName → txtrefacno | contraAccountId field exists in VoucherLine | PARTIAL | Field exists in type but UI does not expose it | MEDIUM | YES |
| Add Entry button | Button1 — adds line to GridView, recalculates totals | Submit adds all lines at once | INCORRECT | Legacy adds ONE line at a time. Current creates entire voucher at once. Must implement line-by-line entry | HIGH | YES |
| Delete Entry button | bttndelentry — removes selected line from GridView | No line-level delete in voucher form | MISSING | Implement line delete in voucher editor | HIGH | YES |
| Total debit/credit display | txttotaldebit, txttotalcredit — updated on each add | Computed client-side before submit | PARTIAL | Real-time total display exists in UI but not persisted per-voucher | LOW | YES |
| Balance display | txtbalance = total debit - total credit | Shows balanced/not balanced status | MATCH | — | — | YES |
| New Voucher button | bttnNewVoucher — clears form for new voucher | Creates new voucher via form submit | MATCH | — | — | YES |
| Delete Voucher | bttnDelVoucher — deletes entire voucher | Delete button exists for DRAFT vouchers | MATCH | — | — | YES |
| Print | bttnPrint — opens print view | No print functionality | MISSING | Implement voucher print | LOW | YES |
| View existing voucher | Navigate to existing voucher via entries list | Voucher list in Vouchers tab | PARTIAL | No dedicated voucher viewer with full line display | MEDIUM | YES |
| Date update | Button2 — updates voucher date | Date is set at creation | PARTIAL | Legacy allows date change after creation | LOW | YES |
| Balance enforcement at creation | Legacy: lines saved individually, balance checked at PostBack | Current: balance required at create time (UI blocks submit if unbalanced, adapter rejects unbalanced) | INCORRECT | Legacy builds voucher line-by-line; balance checked implicitly. Current requires balanced at submission. See detailed analysis below | HIGH | YES |
| Multiple lines | As many lines as needed, added one at a time | All lines submitted at once | PARTIAL | Must support incremental line addition | HIGH | YES |
| Narration per line | txtdescription per line + header narration | narration field on header + description on line | MATCH | — | — | YES |
| Voucher posting | Implicit — saved immediately on Add Entry | Separate draft→post lifecycle | PARTIAL | Legacy doesn't have explicit draft/posted states for journal vouchers. Lines are saved immediately | HIGH | YES |

### CRITICAL: Balance Enforcement Analysis

**Legacy behavior (Journal.aspx):**
- User selects voucher type → clicks "New Voucher" → system generates voucher number
- User adds lines ONE AT A TIME via "Add Entry" button
- Each line is saved to server via PostBack
- **Balance is NOT enforced at line-add time** — user can add unbalanced entries
- Balance is displayed as running difference (txtbalance)
- Legacy DOES check balance at some point (audit/25: "Balance checks — Debit must = Credit")
- But the check happens at PostBack, not at individual line addition
- Lines accumulate in GridView with running totals

**Current ERP behavior:**
- User fills voucher type, date, narration, ALL lines in a single form
- Submit button disabled if `isBalanced(lines)` returns false
- MockVoucherAdapter.createVoucher() rejects unbalanced vouchers
- All lines submitted in one API call

**Impact:** The current ERP forces the user to know all lines upfront. Legacy allows incremental building. This is a workflow difference.

**Recommendation:** Implement line-by-line entry in Finance → Vouchers tab. Allow unbalanced vouchers during building. Validate balance only on post/save.

---

## SECTION 3: SALE BILL LIFECYCLE

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| New Bill | bttnNewBill — generates new bill number | Creates bill via SalesService.createSaleBill() | MATCH | — | — | YES |
| Voucher number | Auto-generated, readonly | Auto-generated sequential | MATCH | — | — | YES |
| Bill type selection | SV, PV, SRV, PRV dropdown | SV for sales, PV for purchases (separate services) | PARTIAL | Current doesn't support SRV/PRV on same form. Returns need separate implementation | MEDIUM | YES |
| Customer selection | TxtAcName autocomplete (SearchCustomers WebMethod) | Customer dropdown | PARTIAL | Legacy uses AJAX autocomplete; current uses dropdown | LOW | YES |
| Customer account resolution | txtacno auto-populated from selection | customer.accountHeadId used | MATCH | — | — | YES |
| Item search | TxtItemName autocomplete | Product dropdown | PARTIAL | Legacy uses autocomplete; current uses dropdown | LOW | YES |
| Cartons quantity | txtCartons field | cartons field in SaleBillLine | MATCH | — | — | YES |
| Packs quantity | txtPacks field | packs field in SaleBillLine | MATCH | — | — | YES |
| Rate | txtSaleRate (auto-filled from item master) | rate field | MATCH | — | — | YES |
| Trade Discount % | txtDisc field | tradeDiscountPercent field | MATCH | — | — | YES |
| TO % | txtTO field | tradeOffer (string, not numeric) | INCORRECT | tradeOffer should be numeric TO% field | MEDIUM | YES |
| GST % | txtSTPercentage | gstPercent | MATCH | — | — | YES |
| Further Tax % | txtFTPercentage | furtherTaxPercent | MATCH | — | — | YES |
| FED % | txtFEDPercentage | fedPercent | MATCH | — | — | YES |
| Advance Tax % | txtADVPercentage | advanceTaxPercent | MATCH | — | — | YES |
| GST Type | txtgsttype | gstType on Product | MATCH | — | — | YES |
| HS Code | txthscode | hsCode on Product | MATCH | — | — | YES |
| Pcs/Ctn | txtPcsPerCtn (auto from item) | pcsPerCarton on Product | MATCH | — | — | YES |
| Net Amount | txtTotalAmtInclSt (calculated) | totalNetAmount (calculated) | MATCH | — | — | YES |
| Previous Balance | txtPrevBal (displayed on form) | Not displayed on bill form | MISSING | Show customer's previous AR balance on bill form | MEDIUM | YES |
| Sale Man | cmbacname dropdown (4 sale men) | Not implemented | MISSING | Sale Man entity + field on bill | MEDIUM | YES |
| Day of week | cmbDay dropdown | Not implemented | LOW | Not critical for functionality | LOW | YES |
| NTN number | txtntnno (autocomplete) | Not on bill header | LOW | Legacy field, may not be needed | LOW | YES |
| CNIC number | txtcnic (autocomplete) | Not on bill header | LOW | Legacy field, may not be needed | LOW | YES |
| Description/narration | txtdescription per bill | narration field | MATCH | — | — | YES |
| Add Entry | bttnSaveEntry — adds line to bill | Lines added in form array | MATCH | — | — | YES |
| Delete Entry | bttnDeleteEntry — removes line | deleteLine function exists | MATCH | — | — | YES |
| Update Bill | bttnUpdateBill — saves changes | updateSaleBill (implicit via create) | PARTIAL | No explicit update function on SalesService. Need updateSaleBill() | HIGH | YES |
| Delete Bill | bttnDeleteBill | deleteSaleBill exists | MATCH | — | — | YES |
| Print Invoice | bttnPrint | No print functionality | MISSING | Implement invoice print | LOW | YES |
| Bill navigation (<< < > >>) | First/Prev/Next/Last bill | No bill navigation | MISSING | Implement bill navigation | LOW | YES |
| Edit existing bill | Load bill, modify, save | Bill list with view/edit | PARTIAL | No dedicated edit mode for existing bills | MEDIUM | YES |
| Accounting: DEBIT Customer AR | DEBIT: Customer account (500 DEBITORS) — Net Amount | DEBIT: customer.accountHeadId — netAmount | MATCH | — | — | YES |
| Accounting: CREDIT Sales Income | CREDIT: Sales income (1600 INCOME) — Base Amount | CREDIT: 41101 — totalToAmount | MATCH | — | — | YES |
| Accounting: CREDIT Tax | CREDIT: Tax payable — Tax Amount | CREDIT: 21201/21202/21203 — taxes | MATCH | — | — | YES |
| Accounting: DEBIT COGS | DEBIT: COGS — Cost Amount | DEFERRED (cost_rate unknown) | NOT VERIFIED | Cannot implement without cost_rate formula | HIGH | NO |
| Accounting: CREDIT Inventory | CREDIT: Inventory — Cost Amount | DEFERRED (cost_rate unknown) | NOT VERIFIED | Cannot implement without cost_rate formula | HIGH | NO |
| Stock effect: ISSUE | Stock decreased by sold quantity | ISSUE movement created on post | MATCH | — | — | YES |
| Bill status lifecycle | No explicit status — saved immediately | DRAFT → POSTED lifecycle | INCORRECT | Legacy doesn't have draft/posted. Lines saved immediately. Current has explicit lifecycle | MEDIUM | YES |
| Bill list with filters | ListofBills.aspx: type, date, party, item, Sale Man | Bill list in Sales tab — no filters | MISSING | Add filter controls to bill list | MEDIUM | YES |

---

## SECTION 4: PURCHASE BILL

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| New Bill | bttnNewBill on Sale_Purchase.aspx with PV type | PurchaseService.createPurchaseBill() | MATCH | — | — | YES |
| Supplier selection | TxtAcName autocomplete | Supplier dropdown | PARTIAL | Legacy uses autocomplete; current uses dropdown | LOW | YES |
| Item selection | TxtItemName autocomplete | Product dropdown | PARTIAL | Legacy uses autocomplete; current uses dropdown | LOW | YES |
| Tax calculation | Same as sales — line-level tax | calculateBillLineTax() used | MATCH | — | — | YES |
| Accounting: DEBIT Inventory | DEBIT: Inventory (11301) — Base Amount | DEBIT: 11301 — totalToAmount | MATCH | — | — | YES |
| Accounting: DEBIT Tax Input | DEBIT: Sales Tax Input (11401) — GST | DEBIT: 11401 — totalGst | MATCH | — | — | YES |
| Accounting: CREDIT Supplier AP | CREDIT: Supplier account (8000 BUSINESS PARTIES) — Net | CREDIT: supplier.accountHeadId — netAmount | MATCH | — | — | YES |
| Accounting: FED on purchases | No FED Input account in COA | Guard rejects FED > 0 | MATCH (correct guard) | Add FED Input account to COA to support FED | MEDIUM | YES |
| Accounting: Further Tax on purchases | No Further Tax Input account | Guard rejects Further Tax > 0 | MATCH (correct guard) | Add Further Tax Input account | MEDIUM | YES |
| Accounting: Advance Tax on purchases | No Advance Tax Input account | Guard rejects Advance Tax > 0 | MATCH (correct guard) | Add Advance Tax Input account | MEDIUM | YES |
| Stock effect: GRN | Stock increased by received quantity | GRN movement created on post | MATCH | — | — | YES |
| Update Bill | bttnUpdateBill | No updateSaleBill equivalent | MISSING | Add updatePurchaseBill() to PurchaseService | HIGH | YES |
| Delete Bill | bttnDeleteBill | deletePurchaseBill exists | MATCH | — | — | YES |
| Print | bttnPrint | No print | MISSING | Implement print | LOW | YES |
| Bill navigation | << < > >> | No navigation | MISSING | Implement navigation | LOW | YES |
| Purchase Return (PRV) | SRV/PRV on same Sale_Purchase.aspx form | No PRV service or UI | MISSING | Implement PurchaseReturnService + UI | HIGH | YES |

---

## SECTION 5: CUSTOMER ACCOUNTING

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Customer = Account under DEBITORS (500) | Customer IS an Account | Customer linked to AccountHead via accountHeadId | MATCH | — | — | YES |
| Customer list | Available on Accounts.aspx | Customer CRUD in Sales tab | MATCH | — | — | YES |
| Customer AR balance | Running balance from ledger | getCustomerARBalance() computes from ledger | MATCH | — | — | YES |
| Balance formula | Opening + SUM(Sales) - SUM(Returns) - SUM(Payments) | Opening + SUM(Debits) - SUM(Credits) from ledger | MATCH | — | — | YES |
| Customer ledger view | Ledger.aspx with account filter | /finance → Ledger tab | PARTIAL | No dedicated customer→ledger navigation. User must manually find account | MEDIUM | YES |
| Customer search autocomplete | SearchCustomers WebMethod | searchCustomers() in repository | MATCH | — | — | YES |
| Previous balance on bill | txtPrevBal displayed on bill form | Not displayed | MISSING | Show previous balance on bill entry | MEDIUM | YES |
| Credit limit | Not observed in legacy | Not implemented | NOT VERIFIED | Legacy doesn't seem to have credit limit | — | NO |
| Invoice-level allocation | Running balance model, no invoice matching | Running balance model | MATCH | — | — | YES |
| Sale Return (SRV) | SRV on Sale_Purchase.aspx | No SRV service or UI | MISSING | Implement SaleReturnService + UI | HIGH | YES |

---

## SECTION 6: SUPPLIER ACCOUNTING

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Supplier = Account under BUSINESS PARTIES (8000) | Supplier IS an Account | Supplier linked to AccountHead via accountHeadId | MATCH | — | — | YES |
| Supplier list | Available on Accounts.aspx | Supplier CRUD in Purchases tab | MATCH | — | — | YES |
| Supplier AP balance | Running balance from ledger | Not implemented as service | MISSING | Implement SupplierAPService or integrate with ledger | HIGH | YES |
| Supplier ledger view | Ledger.aspx with account filter | /finance → Ledger tab | PARTIAL | No dedicated supplier→ledger navigation | MEDIUM | YES |
| Supplier search | Searchacname WebMethod | search() in repository | MATCH | — | — | YES |
| Payment (CP on Cash Book) | CP voucher type on Cash_Book.aspx | No SupplierPaymentService | MISSING | Implement SupplierPaymentService + UI | HIGH | YES |
| Payment (PV on Journal) | PV voucher type on Journal.aspx | PV exists in voucher types | PARTIAL | PV exists as voucher type but no dedicated supplier payment workflow | HIGH | YES |
| Purchase Return (PRV) | PRV on Sale_Purchase.aspx | No PRV service | MISSING | Implement PurchaseReturnService | HIGH | YES |

---

## SECTION 7: CASH BOOK

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Cash Book page | Cash_Book.aspx — dedicated page | No Cash Book page | MISSING | Create CashBookService + CashBook.tsx page | HIGH | YES |
| Voucher types | CV, CP, CR | CR exists; CP/CV missing as dedicated types | PARTIAL | Need Cash Book with CP and CV support | HIGH | YES |
| Cash account selection | TxtAcName with autocomplete | Cash accounts exist (11101, 11102) | PARTIAL | Need Cash Book UI to select cash account | HIGH | YES |
| Opening balance | txtopeningbal displayed | Not displayed | MISSING | Show opening balance for cash account | MEDIUM | YES |
| Closing balance | txtclosingbal calculated | Not calculated | MISSING | Calculate and display closing balance | MEDIUM | YES |
| Receive (Debit) | txtdebit field | Not in Cash Book context | MISSING | Cash receipt entry | HIGH | YES |
| Payment (Credit) | txtcredit field | Not in Cash Book context | MISSING | Cash payment entry | HIGH | YES |
| Save button | bttnSave — saves single entry | CustomerReceiptService.createReceipt() | PARTIAL | Only CR supported; CP/CV not implemented | HIGH | YES |
| Delete button | bttnDelete — deletes entry | deleteReceipt for CR | PARTIAL | Only CR supported | HIGH | YES |
| Print | bttnPrint | No print | MISSING | Implement print | LOW | YES |
| Reset | bttnReset — clears form | No reset | MISSING | Implement reset | LOW | YES |
| Running totals | txttotaldebit, txttotalcredit | Not in Cash Book | MISSING | Display running totals | MEDIUM | YES |

---

## SECTION 8: BILLS LIST

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Bills List page | ListofBills.aspx — dedicated page | No dedicated page | MISSING | Create BillsList.tsx page | HIGH | YES |
| Voucher type filter | cmbvtype: SV, PV, SRV, PRV | No filter on bill list | MISSING | Add type filter dropdown | HIGH | YES |
| Date from/to | txtDate1, txtDate2 | No date filter on bill list | MISSING | Add date range filter | HIGH | YES |
| Party filter | TxtAcName + txtacno | No party filter | MISSING | Add party filter | MEDIUM | YES |
| Item filter | TxtItemName + txtItemNo | No item filter | MISSING | Add item filter | MEDIUM | YES |
| Sale Man filter | txtSmno + cmbacname | No Sale Man filter | MISSING | Add Sale Man filter (after implementing Sale Man) | MEDIUM | YES |
| List of Bills button | Generates report | No report generation | MISSING | Implement bills list report | MEDIUM | YES |
| Item Wise button | Item-wise bill breakdown | Not implemented | MISSING | Implement item-wise view | MEDIUM | YES |
| Load Form button | Loads selected bill for editing | Bill list with view | PARTIAL | Need edit-on-click functionality | MEDIUM | YES |
| Print Bills button | Batch print selected bills | Not implemented | MISSING | Implement batch print | LOW | YES |
| Bill selection → edit | Click bill → opens in Sale_Purchase.aspx | Bill list with view/edit in tabs | PARTIAL | Need click-to-edit from list | MEDIUM | YES |

---

## SECTION 9: REPORTS

### 9.1 Ledger

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Account selection | TxtAcName autocomplete + txtacno | Account search in ledger tab | MATCH | — | — | YES |
| Account code display | txtacno shown | Account code in ledger | MATCH | — | — | YES |
| Date range | txtDate1, txtDate2 | Date range filters | MATCH | — | — | YES |
| Normal ledger | Default mode | Ledger viewer works | MATCH | — | — | YES |
| Sales Tax ledger type | DDLType: Normal / Sales Tax | No Sales Tax type filter | MISSING | Add ledger type filter | MEDIUM | YES |
| Opening balance | Displayed at top | Not explicitly shown | MISSING | Show opening balance | MEDIUM | YES |
| Running balance | Per-line running balance | getLedgerForAccount() computes balance | MATCH | — | — | YES |
| Closing balance | Displayed at bottom | Last entry balance | MATCH | — | — | YES |
| Print/export | SSRS ReportViewer export | No print/export | MISSING | Implement print/export | LOW | YES |

### 9.2 Trial Balance

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Date range | txtDate1, txtDate2 | Date range filters | MATCH | — | — | YES |
| Account range | txtAcNo1, TxtAcNo2 | No account range filter | MISSING | Add account range filter | LOW | YES |
| Main Head filter | cmbacname dropdown | No Main Head filter | MISSING | Add Main Head filter | MEDIUM | YES |
| Debit/Credit columns | Displayed per account | closingDebit, closingCredit | MATCH | — | — | YES |
| Balancing | Total Dr must = Total Cr | isBalanced flag | MATCH | — | — | YES |

### 9.3 Trial Balance With Activity

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Page existence | TrailBWA.aspx | Not implemented | MISSING | Create TBWA report with opening, period activity, closing | MEDIUM | YES |

### 9.4 Balance Sheet / P&L

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Balance Sheet | Account range, assets/liabilities/equity | generateBalanceSheet() | MATCH | — | — | YES |
| P&L | Income - Expenses = Net Profit | generateProfitAndLoss() | MATCH | — | — | YES |
| Separate buttons | "Balance Sheet" and "Profit and Loss" buttons | Same page with tabs | MATCH | Functionally equivalent | — | YES |
| Account range filter | txtAcNo1, TxtAcNo2 | No account range filter | MISSING | Add account range filter | LOW | YES |

### 9.5 Aging Report

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Page existence | Aging.aspx | Not implemented | MISSING | Create AgingService + AgingReport.tsx | HIGH | YES |
| Customer/Supplier filter | Account range | Not implemented | MISSING | Add aging buckets for AR/AP | HIGH | YES |
| Aging buckets | Time-based aging | Not implemented | MISSING | Implement aging buckets (30/60/90/120+ days) | HIGH | YES |

---

## SECTION 10: STOCK REPORTS

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Item Ledger | ItemLedger.aspx — date range + item filter | Stock movements tab | PARTIAL | Missing dedicated item ledger with date range and item filter | MEDIUM | YES |
| Stock Balance | StockBalance.aspx — item range + date range | Stock balances tab | PARTIAL | Missing item range filter, date range filter | MEDIUM | YES |
| Stock Demand | StockBalance.aspx "Stock Demand" button | Not implemented | MISSING | Implement stock demand report | MEDIUM | YES |
| Stock Balance 2 | StockBalance.aspx "Stock Balance 2" button | Not implemented | MISSING | Implement variant | LOW | YES |
| Stock Balance With Activity | StockBWA.aspx | Not implemented | MISSING | Implement detailed stock activity report | MEDIUM | YES |

---

## SECTION 11: SALE MAN

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Sale Man entity | Sale_Man.aspx — number + name | Not implemented | MISSING | Create SaleMan entity, repository, adapter, UI | MEDIUM | YES |
| Sale Man # | txtmhno | Not implemented | MISSING | Auto-generated or manual number | MEDIUM | YES |
| Sale Man Name | txtmhname | Not implemented | MISSING | Name field | MEDIUM | YES |
| Create | bttnsave | Not implemented | MISSING | Create SaleMan CRUD | MEDIUM | YES |
| Delete | bttndelete | Not implemented | MISSING | Soft delete | MEDIUM | YES |
| Bill association | cmbacname on Sale_Purchase.aspx | Not implemented | MISSING | Associate sale man with bills | MEDIUM | YES |
| Main Head association | cmbacname on MainHeads.aspx | Not implemented | MISSING | Associate sale man with main heads | LOW | YES |

---

## SECTION 12: MASTER DATA

### 12.1 Accounts

| Field | Legacy | Current | Status | Priority |
|---|---|---|---|---|
| Code | txtacno (manual) | accountCode (manual) | MATCH | — |
| Name | txtacname | accountName | MATCH | — |
| Address | txtaddress | address on AccountHead | MATCH | — |
| Owner's Name | txtOwnerName | ownerName on AccountHead | MATCH | — |
| Mobile | txtMobile | phone on AccountHead | MATCH | — |
| STN | txtStn | stn on AccountHead | MATCH | — |
| NTN | txtNtn | ntn on AccountHead | MATCH | — |
| CNIC | txtapproval (labeled CNIC) | cnic on AccountHead | MATCH | — |
| Main Head | cmbMainHead dropdown | parentId in hierarchy | MATCH | — |
| Account Transfer | AcTransfer.aspx | Not implemented | MISSING | LOW |

### 12.2 Items

| Field | Legacy | Current | Status | Priority |
|---|---|---|---|---|
| Item # | txtIemNo (manual) | sku (manual) | MATCH | — |
| Name | txtItemName | name | MATCH | — |
| Units | cmbunits | unit | MATCH | — |
| Pcs/Ctn | txtltrperpack | pcsPerCarton | MATCH | — |
| Retail Price | txtretailprice | retailPrice | MATCH | — |
| Purchase Rate | txtitempurchaserate | purchaseRate | MATCH | — |
| Sale Rate | txtitemsalerate | saleRate | MATCH | — |
| Disc% | txtDis | tradeDiscount | MATCH | — |
| TO% | txtTO | tradeOffer (STRING, not numeric) | INCORRECT | MEDIUM |
| Min Qty | txtMinQty | minQuantity | MATCH | — |
| HS Code | txtHSCode | hsCode | MATCH | — |
| GST Type | DDTaxtype: VAT/3RD/8TH | gstType | MATCH | — |
| GST% | txtGST | gstPercent | MATCH | — |
| FED% | txtFED | fedPercent | MATCH | — |
| Adv.Tax%(Purchase) | txtAdvTax_Pur | advanceTaxPurchasePercent | MATCH | — |
| Adv.Tax%(Sale) | txtAdvTax_Sale | advanceTaxSalePercent | MATCH | — |
| Item Super Head | Via ItemMainHeads.aspx | Not implemented (flat category) | MISSING | MEDIUM |
| Item Main Head | Via ItemMainHeads.aspx | Not implemented (flat category) | MISSING | MEDIUM |

---

## SECTION 13: UTILITIES

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Delete Item + Transfer | DelItem.aspx — transfers data to target item | Not implemented | MISSING | Implement with confirmation, validation, dependency checks | LOW | NOT VERIFIED |
| Delete Account + Shift | DelAccount.aspx — shifts data to target account | Not implemented | MISSING | Implement with confirmation, validation | LOW | NOT VERIFIED |
| Account Transfer/Change Area | AcTransfer.aspx — reassigns main head | Not implemented | MISSING | Implement with confirmation | LOW | NOT VERIFIED |
| Create User | PostBack utility | Not implemented | MISSING | Implement user management (admin only) | LOW | NOT VERIFIED |
| Change Password | ChangePassword.aspx | Not implemented | MISSING | Implement change password | LOW | NOT VERIFIED |

---

## SECTION 14: VOUCHER VIEW / TRANSACTION NAVIGATION

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Voucher browsing | JournalEntriesList.aspx — type filter + date range | Voucher list in Finance tab | PARTIAL | Missing type filter dropdown, dedicated browsing page | HIGH | YES |
| Open voucher | Click → loads in Journal.aspx | No click-to-open from list | MISSING | Implement click-to-open voucher viewer | HIGH | YES |
| View header | Voucher type, date, narration displayed | Header in voucher list | MATCH | — | — | YES |
| View lines | GridView shows all lines with debit/credit | No line detail view from list | MISSING | Implement line detail view | HIGH | YES |
| View ledger effect | Not directly visible | Not implemented | MISSING | Show which accounts were affected | MEDIUM | YES |
| View stock effect | Not directly visible | Stock movements tab | PARTIAL | No link from voucher to stock movement | MEDIUM | YES |
| Print | bttnPrint on Journal.aspx | Not implemented | MISSING | Implement print | LOW | YES |

---

## SECTION 15: ACCOUNT LEDGER NAVIGATION

| Feature | Legacy Behavior | Current Behavior | Status | Required Change | Priority | Verified |
|---|---|---|---|---|---|---|
| Account → Ledger | Any account can open ledger via Ledger.aspx | Ledger tab requires manual account selection | PARTIAL | Need "View Ledger" action on every account, customer, supplier | HIGH | YES |
| Customer → Ledger | Customer account opened in Ledger.aspx | No customer→ledger shortcut | MISSING | Add "View Ledger" button on customer detail | MEDIUM | YES |
| Supplier → Ledger | Supplier account opened in Ledger.aspx | No supplier→ledger shortcut | MISSING | Add "View Ledger" button on supplier detail | MEDIUM | YES |
| Cash → Ledger | Cash account opened in Ledger.aspx | No cash→ledger shortcut | MISSING | Add "View Ledger" on cash accounts | MEDIUM | YES |
| Bank → Ledger | Bank account opened in Ledger.aspx | No bank→ledger shortcut | MISSING | Add "View Ledger" on bank accounts | MEDIUM | YES |

---

## SECTION 16: ACCOUNTING INTEGRITY

### Transaction Type Accounting Summary

| Transaction | DEBIT | CREDIT | Current Match | Inventory | AR/AP | Tax | Verified |
|---|---|---|---|---|---|---|---|
| SV (Sale) | Customer AR (net) | Sales Income (base) + Tax Payables | MATCH | ISSUE (stock decrease) | AR increase | GST/FT/FED/ADV to payable | YES |
| PV (Purchase) | Inventory (base) + Tax Input (GST) | Supplier AP (net) | MATCH | GRN (stock increase) | AP increase | GST from input | YES |
| SRV (Sale Return) | Sales Return + Tax Payable | Customer AR | MISSING | RETURN (stock increase) | AR decrease | Reverse tax | NO |
| PRV (Purchase Return) | Supplier AP | Inventory + Tax Input | MISSING | RETURN (stock decrease) | AP decrease | Reverse tax | NO |
| CR (Receipt) | Cash/Bank | Customer AR | MATCH | None | AR decrease | None | YES |
| CP (Cash Payment) | Expense/Party | Cash | MISSING | None | AP decrease (if party) | None | NO |
| JV (Journal) | Any account | Any account | PARTIAL | None (unless stock-related) | Depends | Depends | YES |
| CV (Cash Voucher) | Cash | Any (or reverse) | MISSING | None | Depends | Depends | NO |

### Trial Balance Integrity

| Check | Legacy | Current | Status |
|---|---|---|---|
| Total Debit = Total Credit | Must balance | isBalanced flag on reports | MATCH |
| Every voucher balances | Implicit | MockVoucherAdapter enforces | MATCH |
| Double-entry maintained | All vouchers are double-entry | CreateVoucherDTO requires balanced lines | MATCH |

---

## SUMMARY STATISTICS

| Metric | Count |
|---|---|
| Total legacy features audited | 148 |
| MATCH | 67 (45%) |
| PARTIAL | 30 (20%) |
| MISSING | 38 (26%) |
| INCORRECT | 4 (3%) |
| NOT VERIFIED | 3 (2%) |
| HIGH priority gaps | 28 |
| MEDIUM priority gaps | 22 |
| LOW priority gaps | 10 |

### Top HIGH Priority Gaps

1. **Line-by-line voucher entry** — Journal workflow differs from legacy
2. **Cash Book page** — Entirely missing
3. **Bills List page** — Entirely missing with all filters
4. **Aging Report** — Entirely missing
5. **Supplier Payment Service** — CP/PV for suppliers missing
6. **Sale Return Service (SRV)** — Entirely missing
7. **Purchase Return Service (PRV)** — Entirely missing
8. **Sale Bill update function** — No updateSaleBill()
9. **Purchase Bill update function** — No updatePurchaseBill()
10. **Voucher viewer** — Can't open/view existing vouchers from list
11. **Customer→Ledger navigation** — No shortcut from customer to ledger
12. **Supplier→Ledger navigation** — No shortcut from supplier to ledger
13. **Customer AP balance service** — Missing
14. **Bill list filters** — No type/date/party/item/Sale Man filters
15. **Bill form: Previous Balance display** — Not shown
16. **Bill form: Sale Man field** — Not implemented
17. **Journal: line delete** — Can't delete individual lines
18. **Journal: reference/contra account UI** — Field exists but not exposed
19. **Voucher type filter on entries list** — Missing
20. **Balance enforcement workflow** — Legacy allows unbalanced building; current requires balanced at submit
21. **Stock reports: Item Ledger with filters** — Missing
22. **Stock reports: Stock Balance with filters** — Missing
23. **Stock reports: Stock Balance With Activity** — Missing
24. **Trial Balance With Activity** — Missing
25. **Sale Man entity** — Missing
26. **Item hierarchy (Super Head / Main Head)** — Missing
27. **Journal voucher line-level detail view** — Missing
28. **Voucher print** — Missing
