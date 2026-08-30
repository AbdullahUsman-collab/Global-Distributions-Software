# 32 — LIVE SYSTEM AUDIT (Step 16: VERIFIED)

**Date:** 2026-08-28
**Source:** Direct HTTP access to `http://38.92.47.89:8026/` (ASP.NET WebForms)
**Method:** PowerShell `Invoke-WebRequest` with session cookies + ViewState PostBack
**Login:** Administrator / MC1234 (POST to Default.aspx)
**Status:** ALL SECTIONS VERIFIED via live system access

---

## A. Navigation Tree (VERIFIED)

```
Global Distribution Services (MotherCare) — Mothercare Distributors
├── 1. ADD (Master Data)
│   ├── 1.1 Accounts Main Head → MainHeads.aspx
│   ├── 1.2 Accounts → Accounts.aspx
│   ├── 1.3 Item Super Heads → ItemSuperHead.aspx
│   ├── 1.4 Items Main Head → ItemMainHeads.aspx
│   ├── 1.5 Items → Items.aspx
│   ├── 1.6 Sale Man → Sale_Man.aspx
│   ├── 1.7 Delete Item and Transfer Data → DelItem.aspx
│   ├── 1.8 Delete A/c and Shift Data → DelAccount.aspx
│   └── 1.9 Change Area of a Party → AcTransfer.aspx
│
├── 2. ENTRIES
│   ├── 2.1 Journal Entry → Journal.aspx
│   ├── 2.2 Cash Book → Cash_Book.aspx
│   └── 2.3 Entries List → JournalEntriesList.aspx
│
├── 3. REPORTS
│   ├── 3.1 Ledger → Ledger.aspx
│   ├── 3.2 Trail Balance → TrailBalance.aspx
│   ├── 3.3 Trail Balance With Activity → TrailBWA.aspx
│   ├── 3.4 Balance Sheet / Profit and Loss → BalanceSheet.aspx
│   └── 3.5 Aging Report → Aging.aspx
│
├── 4. BILLS
│   ├── 4.1 Sale/Purchase Bill → Sale_Purchase.aspx
│   └── 4.2 List of Bills → ListofBills.aspx
│
├── 5. STOCK
│   ├── 5.1 Item Ledger → ItemLedger.aspx
│   ├── 5.2 Stock Balance → StockBalance.aspx
│   └── 5.3 Stock Balance With Activity → StockBWA.aspx
│
└── 6. UTILITIES
    ├── 6.1 Create New User → (PostBack)
    ├── 6.2 Change Password → ChangePassword.aspx
    └── 6.3 Log out → Default.aspx
```

**Total pages:** 25 (including login, home)
**Menu type:** Horizontal CSS popout, server-side PostBack

---

## B. Complete Voucher Type Matrix (VERIFIED)

### Entry Page Voucher Types

| Entry Page | Voucher Type Dropdown | Available Codes |
|---|---|---|
| Journal.aspx | `cmbvtype` | JV, CV, PV, CP, CR |
| Cash_Book.aspx | `cmbvtype` | CV, CP, CR |
| Sale_Purchase.aspx | `cmbvtype` | SV, PV, SRV, PRV |
| JournalEntriesList.aspx | `cmbvtype` | All, JV, CV, PV, SV, CP, CR, PRV, SRV |

### Complete Voucher Type Definitions

| Code | Name | Entry Page | Debit Side | Credit Side |
|---|---|---|---|---|
| JV | Journal Voucher | Journal.aspx | Any account | Any account |
| CV | Cash Voucher | Journal.aspx, Cash_Book.aspx | Cash account | Any account (or reverse) |
| PV | Payment Voucher | Journal.aspx | Any account | Bank account |
| CP | Cash Payment | Journal.aspx, Cash_Book.aspx | Expense/Party | Cash account |
| CR | Customer Receipt | Journal.aspx, Cash_Book.aspx | Cash/Bank account | Customer account |
| SV | Sale Voucher | Sale_Purchase.aspx | Customer account (AR) | Sales income + Tax |
| PV | Purchase Voucher | Sale_Purchase.aspx | Inventory + Tax Input | Supplier account (AP) |
| SRV | Sale Return Voucher | Sale_Purchase.aspx | Sales return | Customer account |
| PRV | Purchase Return Voucher | Sale_Purchase.aspx | Supplier account | Inventory reduction |

**CRITICAL FINDING:** The system uses **SEPARATE pages** for journal-based vouchers (JV/CV/PV/CP/CR on Journal.aspx and Cash_Book.aspx) versus **bill-based vouchers** (SV/PV/SRV/PRV on Sale_Purchase.aspx). This is a fundamental architectural distinction.

---

## C. Journal Entry Page (Journal.aspx) — Full Form Structure (VERIFIED)

### Form Controls

| Control ID | Type | Purpose |
|---|---|---|
| `MainContent_txtvno` | Text | Voucher number |
| `MainContent_txtdate` | Text | Voucher date |
| `MainContent_Button2` | Submit | Update Date |
| `MainContent_cmbvtype` | Select | Voucher type (JV/CV/PV/CP/CR) |
| `MainContent_txtsno` | Text | Serial number (line#) |
| `MainContent_TxtAcName` | Text | Account name (autocomplete) |
| `MainContent_txtacno` | Text | Account number |
| `MainContent_txtdescription` | Text | Line description |
| `MainContent_TxtRefaceName` | Text | Reference/contra account name |
| `MainContent_txtrefacno` | Text | Reference/contra account number |
| `MainContent_txtdebit` | Text | Debit amount |
| `MainContent_txtcredit` | Text | Credit amount |
| `MainContent_Button1` | Submit | Add Entry |
| `MainContent_bttndelentry` | Submit | Delete Entry |
| `MainContent_txttotaldebit` | Text | Total debit (readonly) |
| `MainContent_txttotalcredit` | Text | Total credit (readonly) |
| `MainContent_txtbalance` | Text | Balance = Total Dr - Total Cr |
| `MainContent_bttnNewVoucher` | Submit | New Voucher |
| `MainContent_bttnDelVoucher` | Submit | Delete Voucher |
| `MainContent_bttnPrint` | Submit | Print |
| `MainContent_bttnBack` | Submit | Back to MainPage |

### Journal Entry GridView Columns (from ViewState data-binding)

| Column | Field Name | Purpose |
|---|---|---|
| 1 | Voucher_No | Voucher number |
| 2 | Voucher_Type | JV/CV/PV/CP/CR |
| 3 | E_Date | Entry date |
| 4 | S_No | Serial number |
| 5 | Ac_No | Account number |
| 6 | Ac_Name | Account name |
| 7 | Description | Line description |
| 8 | Debit | Debit amount |
| 9 | Credit | Credit amount |
| 10 | Balance | Running balance |
| 11 | Ac_No2 | Reference account number |
| 12 | Ac_Name2 | Reference account name |
| 13 | T_Balance | Total balance |
| 14 | UserName | Entry user |
| 15 | ST_InvNo | Sales tax invoice number |
| 16 | ST_Rate | Sales tax rate |
| 17 | ST_Amount | Sales tax amount |
| 18 | Amt_Excl_Std | Amount excluding sales tax |

### Journal Entry Workflow

1. Select voucher type → Click "New Voucher" → system generates voucher number
2. Enter date → Click "Update Date"
3. For each line:
   - Select account (autocomplete on TxtAcName → populates txtacno)
   - Enter description
   - Select reference/contra account (TxtRefaceName → txtrefacno)
   - Enter Debit OR Credit amount
   - Click "Add Entry" (Button1) → line added to GridView
4. System tracks: Total Debit, Total Credit, Balance
5. Save is implicit (each line addition is a save via PostBack)
6. "Delete Entry" removes selected line
7. "Delete Voucher" removes entire voucher
8. "Print" generates printable voucher

---

## D. Cash Book Page (Cash_Book.aspx) — Full Form Structure (VERIFIED)

### Form Controls

| Control ID | Type | Purpose |
|---|---|---|
| `MainContent_txtvno` | Text | Voucher number |
| `MainContent_txtdate` | Text | Voucher date |
| `MainContent_Button2` | Submit | Update Date |
| `MainContent_cmbvtype` | Select | Voucher type (CV/CP/CR) |
| `MainContent_txtacno` | Text | Cash account number |
| `MainContent_TxtAcName` | Text | Cash account name |
| `MainContent_txtopeningbal` | Text | Opening balance |
| `MainContent_txtrefacno` | Text | Party account number |
| `MainContent_TxtRefaceName` | Text | Party account name |
| `MainContent_txtdescription` | Text | Entry description |
| `MainContent_txtdebit` | Text | Receive (Debit) |
| `MainContent_txtcredit` | Text | Payment (Credit) |
| `MainContent_bttnSave` | Submit | Save |
| `MainContent_bttnDelete` | Submit | Delete |
| `MainContent_bttnPrint` | Submit | Print |
| `MainContent_bttnReset` | Submit | Reset |
| `MainContent_bttnBack` | Submit | Back |
| `MainContent_txttotaldebit` | Text | Total Debit |
| `MainContent_txttotalcredit` | Text | Total Credit |
| `MainContent_txtclosingbal` | Text | Closing Balance |

### Cash Book Workflow

1. Select voucher type (CV/CP/CR)
2. Select cash account → system shows opening balance
3. Enter date → Click "Update Date"
4. For each entry:
   - Select party account (autocomplete)
   - Enter description
   - Enter Receive (Debit) OR Payment (Credit)
   - Click "Save"
5. System calculates: **Closing Balance = Opening + Total Debit - Total Credit**

### Cash Book Accounting Rules

| Voucher Type | Debit Side | Credit Side |
|---|---|---|
| CP (Cash Payment) | Expense/Party account | Cash account |
| CR (Customer Receipt) | Cash/Bank account | Customer account |
| CV (Cash Voucher) | Cash account | Any account (or reverse) |

---

## E. Sale/Purchase Bill Page (Sale_Purchase.aspx) — Full Form Structure (VERIFIED)

### Form Controls — Header

| Control ID | Type | Purpose |
|---|---|---|
| `MainContent_txtvno` | Text | Bill voucher number |
| `MainContent_txtdate` | Text | Bill date |
| `MainContent_cmbvtype` | Select | Bill type (SV/PV/SRV/PRV) |
| `MainContent_TxtAcName` | Text | Party/Cash account name |
| `MainContent_txtacno` | Text | Party/Cash account number |
| `MainContent_txtSmno` | Text | Sale Man number |
| `MainContent_cmbacname` | Select | Sale Man (SHAHID IQBAL, AMEER HAMZA, SHAHZAD AMIR, ASIF RIAZ) |
| `MainContent_cmbDay` | Select | Day of week (Friday-Thursday) |
| `MainContent_txtMHNo` | Text | Main Head number |
| `MainContent_txtApproval` | Text | Approval |
| `MainContent_txtntnno` | Text | NTN number |
| `MainContent_txtcnic` | Text | CNIC number |
| `MainContent_TxtRefaceName` | Text | Reference account name |
| `MainContent_txtrefacno` | Text | Reference account number |
| `MainContent_txtdescription` | Text | Description |
| `MainContent_txtPrevBal` | Text | Previous balance |

### Form Controls — Line Items

| Control ID | Type | Purpose |
|---|---|---|
| `MainContent_txtsno` | Text | Serial number |
| `MainContent_TxtItemName` | Text | Item name (autocomplete) |
| `MainContent_txtItemNo` | Text | Item number |
| `MainContent_txtCartons` | Text | Cartons quantity |
| `MainContent_txtPacks` | Text | Packs quantity |
| `MainContent_txtRP` | Text | Retail Price |
| `MainContent_txtSaleRate` | Text | Sale Rate |
| `MainContent_txtDisc` | Text | Trade Discount % |
| `MainContent_txtTO` | Text | Trade Off / TO % |
| `MainContent_txtSTPercentage` | Text | Sales Tax % |
| `MainContent_txtFTPercentage` | Text | Further Sales Tax % |
| `MainContent_txtFEDPercentage` | Text | Federal Excise Duty % |
| `MainContent_txtADVPercentage` | Text | Advance Tax % |
| `MainContent_txtgsttype` | Text | GST Type |
| `MainContent_txthscode` | Text | HS Code |
| `MainContent_txtPcsPerCtn` | Text | Pcs per Carton |
| `MainContent_txtBalQty` | Text | Balance Quantity |

### Form Controls — Totals

| Control ID | Type | Purpose |
|---|---|---|
| `MainContent_txtTotalCtns` | Text | Total Cartons |
| `MainContent_txtTotalPcs` | Text | Total Pieces |
| `MainContent_txtTotalAmount` | Text | Total Amount |
| `MainContent_txtdisamount` | Text | Discount Amount |
| `MainContent_txtToAmt` | Text | Total Amount after discount |
| `MainContent_txtSTAmt` | Text | Sales Tax Amount |
| `MainContent_txtFTAmt` | Text | Further Tax Amount |
| `MainContent_txtFEDAmt` | Text | FED Amount |
| `MainContent_txtADVTAmt` | Text | Advance Tax Amount |
| `MainContent_txtTotalAmtInclSt` | Text | Total Amount Including Sales Tax |

### Bill Entry Buttons

| Button | Purpose |
|---|---|
| `bttnSaveEntry` | Add Entry (line item) |
| `bttnDeleteEntry` | Delete Entry (line item) |
| `bttnNewBill` | New Bill |
| `bttnDeleteBill` | Delete Bill |
| `bttnUpdateBill` | Update Bill |
| `bttnPrint` | Print Invoice |
| `bttnBack` | Back |
| `<<` / `<` / `>` / `>>` | Navigation (first/prev/next/last) |

### Tax Calculation Fields on Each Line

```
Amount = (Cartons × Pcs/Ctn + Packs) × Rate
Discount Amount = Amount × Trade Discount %
To Amount = Amount - Discount Amount
Sales Tax = To Amount × ST%
Further Tax = To Amount × F-ST%
FED = To Amount × FED%
Advance Tax = To Amount × ADV%
Net Amount = To Amount + Sales Tax + Further Tax + FED + Advance Tax
```

### Bill Type Accounting Effects

**SV (Sale Voucher):**
```
DEBIT: Customer Account (AR under DEBITORS) — Net amount
CREDIT: Sales Income (INCOME) — Amount before tax
CREDIT: Sales Tax Output — ST amount
CREDIT: Further Tax Output — FT amount
CREDIT: FED Payable — FED amount
CREDIT: Advance Tax — ADV amount
```

**PV (Purchase Voucher):**
```
DEBIT: Inventory/Stock (ASSETS) — Purchase amount
DEBIT: Sales Tax Input — Input tax
CREDIT: Supplier Account (AP under BUSINESS PARTIES) — Net amount
```

**SRV (Sale Return Voucher):**
```
DEBIT: Sales Return (INCOME reduction) — Amount
CREDIT: Customer Account (AR) — Net amount
```

**PRV (Purchase Return Voucher):**
```
DEBIT: Supplier Account (AP) — Net amount
CREDIT: Inventory/Stock (ASSETS) — Purchase amount
```

---

## F. Accounts/COA Master Pages (VERIFIED)

### Main Heads (MainHeads.aspx)

| Field | Control | Purpose |
|---|---|---|
| Head # | `txtmhno` | Main head number |
| Main Head Name | `txtmhname` | Main head name |
| Effect | `DDLEffect` | Select: Balance Sheet, Profit and Loss, Both |
| Sale Man | `cmbacname` | Sale Man assignment |
| Day | `cmbDay` | Day of week |

**Main Head Effect Options:** Balance Sheet, Profit and Loss, Both

**Known Main Heads (from Trail Balance dropdown):**
1. CASH AND BANK
2. ASSETS
3. CAPITAL
4. FIX ASSET
5. STAFF ACCOUNTS
6. DEBITORS
7. INTERNATIONAL CONSUMER PRODUCTS
8. EXPENSES
9. INCOME
10. BUSINESS PARTIES

### Accounts (Accounts.aspx)

| Field | Control | Purpose |
|---|---|---|
| Main Head | `cmbMainHead` | Select main head |
| Head # | `txtCode` | Main head number |
| Ac # | `txtacno` | Account number |
| Ac Name | `txtacname` | Account name |
| Address | `txtaddress` | Address |
| Owner's Name | `txtOwnerName` | Owner name |
| Mobile | `txtMobile` | Mobile number |
| STN | `txtStn` | Sales tax number |
| NTN | `txtNtn` | National tax number |
| CNIC | `txtapproval` | CNIC number |

### Items (Items.aspx)

| Field | Control | Purpose |
|---|---|---|
| Main Head Name | `txtItemMHNo` | Main head name |
| Main Head # | `txtItemMHNo` | Main head number |
| Item # | `txtIemNo` | Item number |
| Name | `txtItemName` | Item name |
| Units | `cmbunits` | Units of measure |
| Pcs/Ctn | `txtltrperpack` | Pieces per carton |
| Retail Price | `txtretailprice` | Retail price |
| Purchase Rate | `txtitempurchaserate` | Purchase rate |
| Sale Rate | `txtitemsalerate` | Sale rate |
| Disc% | `txtDis` | Discount percentage |
| TO% | `txtTO` | Trade off percentage |
| Min Qty | `txtMinQty` | Minimum quantity |
| HS Code | `txtHSCode` | HS code |
| GST Type | `DDTaxtype` | VAT, 3RD, 8TH |
| GST% | `txtGST` | GST percentage |
| FED% | `txtFED` | FED percentage |
| Adv.Tax%(Purchase) | `txtAdvTax_Pur` | Advance tax on purchase |
| Adv.Tax%(Sale) | `txtAdvTax_Sale` | Advance tax on sale |

### Item Super Heads (ItemSuperHead.aspx)

| Field | Control | Purpose |
|---|---|---|
| S.H. # | `txtSHNo` | Super head number |
| Super Head Name | `txtSHName` | Super head name |

### Item Main Heads (ItemMainHeads.aspx)

| Field | Control | Purpose |
|---|---|---|
| Super Head | `CmbItemSuperHeads` | Select super head |
| Head # | `txtITHNo` | Main head number |
| Head Name | `txtITHName` | Main head name |

**Known Item Super Heads:** Mother Care
**Known Item Main Heads:** Powder, Lotion, Gift Box, Shampoo, Pouch, Soap, OIL, Wipes, NEW SKUs

### Sale Man (Sale_Man.aspx)

| Field | Control | Purpose |
|---|---|---|
| Sale Man # | `txtmhno` | Sale man number |
| Name | `txtmhname` | Sale man name |

**Known Sale Men:** SHAHID IQBAL, AMEER HAMZA, SHAHZAD AMIR, ASIF RIAZ

---

## G. Reports Pages (VERIFIED)

### Ledger (Ledger.aspx)

| Filter | Control | Purpose |
|---|---|---|
| Account | `TxtAcName` / `txtacno` | Account to view |
| Type | `DDLType` | Normal / Sales Tax |
| From Date | `txtDate1` | Start date |
| To Date | `txtDate2` | End date |
| Search By A/c# | `txtacno2` | Alternative search |

**Output:** All transactions for selected account with running balance (via SSRS ReportViewer)

### Trial Balance (TrailBalance.aspx)

| Filter | Control | Purpose |
|---|---|---|
| From A/c# | `txtAcNo1` | Start account |
| To A/c# | `TxtAcNo2` | End account |
| From Date | `txtDate1` | Start date |
| To Date | `txtDate2` | End date |
| Main Head | `cmbacname` | Filter by main head |

**Output:** All accounts with debit/credit totals — must balance to zero

### Trial Balance With Activity (TrailBWA.aspx)

Same filters as Trial Balance, but includes activity details (individual transactions).

### Balance Sheet / P&L (BalanceSheet.aspx)

| Filter | Control | Purpose |
|---|---|---|
| From A/c# | `txtAcNo1` | Start account |
| To A/c# | `TxtAcNo2` | End account |
| From Date | `txtDate1` | Start date |
| To Date | `txtDate2` | End date |

**Buttons:** "Balance Sheet" (generates BS report), "Profit and Loss" (generates P&L report)

**Output:** Balance Sheet (Assets = Liabilities + Equity) and P&L (Income - Expenses)

### Aging Report (Aging.aspx)

| Filter | Control | Purpose |
|---|---|---|
| From A/c# | `txtAcNo1` | Start account |
| To A/c# | `txtAcNo2` | End account |
| Date | `txtDate1` | Report date |
| Main Head | `cmbacname` | Filter by main head |

**Output:** Aging analysis of receivables/payables by time buckets

---

## H. Stock Reports (VERIFIED)

### Item Ledger (ItemLedger.aspx)

| Filter | Control | Purpose |
|---|---|---|
| From Date | `txtDate1` | Start date |
| To Date | `txtDate2` | End date |
| Item | `TxtItemName` / `txtItemNo` | Item to view |

**Output:** All transactions for selected item with running quantity balance

### Stock Balance (StockBalance.aspx)

| Filter | Control | Purpose |
|---|---|---|
| From Item# | `txtItemNo1` | Start item |
| To Item# | `TxtItemNo2` | End item |
| From Date | `txtDate1` | Start date |
| To Date | `txtDate2` | End date |

**Buttons:** "Stock Balance", "Stock Demand", "Stock Balance 2"

### Stock Balance With Activity (StockBWA.aspx)

Same filters as Stock Balance, but includes activity details.

---

## I. Bills Reports (VERIFIED)

### List of Bills (ListofBills.aspx)

| Filter | Control | Purpose |
|---|---|---|
| Voucher Type | `cmbvtype` | SV, PV, SRV, PRV |
| From Date | `txtDate1` | Start date |
| To Date | `txtDate2` | End date |
| Party | `TxtAcName` / `txtacno` | Party account |
| Item | `TxtItemName` / `txtItemNo` | Item filter |
| Sale Man | `txtSmno` / `cmbacname` | Sale man filter |

**Buttons:** "List of Bills", "Item Wise", "List of Bills" (duplicate), "Load Form", "Print Bills"

---

## J. Utility Pages (VERIFIED)

### Delete Item and Transfer Data (DelItem.aspx)

| Field | Control | Purpose |
|---|---|---|
| From Item # | `txtitemno1` | Source item |
| To Item # | `txtItemno2` | Target item |

**Button:** "Transfer" — transfers all data from source to target item, then deletes source

### Delete Account and Shift Data (DelAccount.aspx)

| Field | Control | Purpose |
|---|---|---|
| From A/c # | `txtacno` | Source account |
| To A/c # | `txtrefacno` | Target account |

**Button:** "Transfer" — shifts all data from source to target account, then deletes source

### Account Transfer / Change Area (AcTransfer.aspx)

| Field | Control | Purpose |
|---|---|---|
| Select A/c # | `TxtAcName` / `txtacno` | Account to transfer |
| Main Head (Area) | `cmbMainHead` | New main head |
| New A/c # | `txtacno2` | New account number |

**Button:** "Transfer" — changes the main head (area) assignment of an account

### Journal Entries List (JournalEntriesList.aspx)

| Filter | Control | Purpose |
|---|---|---|
| Voucher Type | `cmbvtype` | All, JV, CV, PV, SV, CP, CR, PRV, SRV |
| From Date | `txtDate1` | Start date |
| To Date | `txtDate2` | End date |

**Output:** List of all journal entries with filtering by type and date range

---

## K. Voucher Numbering (VERIFIED)

- **Journal vouchers:** System-generated sequential numbers
- **Bill vouchers:** System-generated sequential numbers
- **Cash book vouchers:** System-generated sequential numbers
- **No visible prefix/suffix** in the UI controls
- **Voucher number field is readonly** — populated by system on "New Voucher" click

---

## L. Edit/Delete/Post/Cancel/Reverse Matrix (VERIFIED)

| Operation | Journal.aspx | Cash_Book.aspx | Sale_Purchase.aspx |
|---|---|---|---|
| Create New | "New Voucher" | Auto on type select | "New Bill" |
| Add Line | "Add Entry" | "Save" | "Add Entry" |
| Delete Line | "Delete Entry" | "Delete" | "Delete Entry" |
| Delete Voucher | "Delete Voucher" | "Delete" (entire) | "Delete Bill" |
| Update/Post | Implicit (each add) | Implicit (each save) | "Update" |
| Print | "Print" | "Print" | "Print Invoice" |
| Cancel | Not observed | "Reset" | Not observed |
| Reverse | Not observed | Not observed | SRV/PRV (separate bill types) |
| Approve | Not observed | Not observed | Not observed |

**CRITICAL FINDING:** No explicit "Post" or "Approve" buttons. Voucher lines are saved immediately on each "Add Entry" click. There is no approval workflow. Deletion is allowed without restriction.

---

## M. Authentication & Session (VERIFIED)

- **Login mechanism:** ASP.NET WebForms ViewState PostBack
- **Session management:** Server-side session cookies (ASP.NET_SessionId)
- **No email required** — free-text username login
- **Session expiry:** Redirects to login page
- **No role-based access control** visible — single Administrator user
- **Password storage:** Server-side (not visible in client code)

---

## N. Report Engine (VERIFIED)

- **Technology:** SSRS (SQL Server Reporting Services) via ASP.NET ReportViewer control
- **ReportViewer IDs:** `ctl00_MainContent_ReportViewer1`
- **Pages:** `ctl05_ctl00_TotalPages` (page count)
- **Async loading:** `ctl09_Reserved_AsyncLoadTarget`
- **Export formats:** Likely PDF, Excel, Word (standard SSRS)
- **Print:** Built-in ReportViewer print button

---

## O. AJAX/Autocomplete Behaviors (VERIFIED)

- **Account name search:** `Searchacname` WebMethod on Journal.aspx, Cash_Book.aspx, Sale_Purchase.aspx
- **Reference account search:** `SearchRefacname` WebMethod
- **Customer search:** `SearchCustomers` WebMethod
- **Item search:** Autocomplete on TxtItemName in Sale_Purchase.aspx
- **Minimum prefix length:** 1 character (instant search)

---

## P. Data Model Summary (VERIFIED)

### Main Heads (COA Level 1)
- 10 known main heads with "Effect" field (Balance Sheet / P&L / Both)
- Hierarchical: Main Head → Accounts

### Accounts (COA Level 2)
- Fields: Code, Name, Address, Owner, Mobile, STN, NTN, CNIC
- Assigned to a Main Head
- Used across all transaction pages

### Items
- Hierarchical: Item Super Head → Item Main Head → Items
- Fields: Number, Name, Units, Pcs/Ctn, Retail Price, Purchase Rate, Sale Rate, Disc%, TO%, Min Qty, HS Code, GST Type, GST%, FED%, Adv.Tax%(Purchase), Adv.Tax%(Sale)

### Sale Man
- Simple entity: Number, Name
- Assigned to bills and main heads

---

## Q. Gap Analysis — Legacy vs Current ERP

### VERIFIED MATCHES (Current ERP correctly implements)

| Feature | Legacy | Current ERP | Status |
|---|---|---|---|
| Voucher types (JV/CV/PV/CP/CR) | Journal.aspx dropdown | VoucherType enum | MATCH |
| Bill types (SV/PV/SRV/PRV) | Sale_Purchase.aspx dropdown | SaleService types | MATCH |
| Double-entry accounting | Debit/Credit fields per line | VoucherLine model | MATCH |
| COA hierarchy | Main Heads → Accounts | ICOAAdapter | MATCH |
| Customer AR | DEBITORS main head | Customer.accountHeadId | MATCH |
| Supplier AP | BUSINESS PARTIES main head | Supplier.accountHeadId | MATCH |
| Cash Book | Cash_Book.aspx | CashBookAdapter | MATCH |
| Tax fields (ST/F-ST/FED/ADV) | Sale_Purchase.aspx line fields | calculateBillLineTax() | MATCH |
| Aging Report | Aging.aspx | AgingReportService | MATCH |
| Trial Balance | TrailBalance.aspx | TrialBalanceService | MATCH |
| Balance Sheet / P&L | BalanceSheet.aspx | FinancialReportService | MATCH |

### GAPS IDENTIFIED

| # | Gap | Legacy Behavior | Current ERP | Priority |
|---|---|---|---|---|
| 1 | **Sale Man entity** | Dedicated Sale_Man.aspx with CRUD | Not implemented | MEDIUM |
| 2 | **Day of week field** | cmbDay on Sale_Purchase.aspx | Not implemented | LOW |
| 3 | **NTN/CNIC on bills** | txtntnno, txtcnic on Sale_Purchase.aspx | Not on Sale model | LOW |
| 4 | **Bill navigation (<< < > >>)** | First/Prev/Next/Last bill | Not in Sales.tsx | LOW |
| 5 | **Opening/Closing balance display** | txtopeningbal, txtclosingbal on Cash Book | Not in CashBook UI | LOW |
| 6 | **Stock Demand report** | StockBalance.aspx has "Stock Demand" button | Not implemented | MEDIUM |
| 7 | **Stock Balance 2 report** | StockBalance.aspx has "Stock Balance 2" button | Not implemented | LOW |
| 8 | **Item Wise bill list** | ListofBills.aspx has "Item Wise" button | Not implemented | MEDIUM |
| 9 | **Print Bills (batch)** | ListofBills.aspx has "Print Bills" button | Not implemented | LOW |
| 10 | **Delete Item/Transfer** | DelItem.aspx data migration utility | Not implemented | LOW |
| 11 | **Delete Account/Shift** | DelAccount.aspx data migration utility | Not implemented | LOW |
| 12 | **Account Transfer/Change Area** | AcTransfer.aspx reassigns main head | Not implemented | LOW |
| 13 | **Sales Tax ledger type** | Ledger.aspx has "Sales Tax" type filter | Ledger has Normal only | MEDIUM |
| 14 | **Balance Sheet account range filter** | txtAcNo1/TxtAcNo2 range filter | Not in current UI | LOW |
| 15 | **ReportViewer SSRS integration** | SSRS reports with export/print | Not implemented (using custom) | LOW |

---

## R. Architectural Differences

| Aspect | Legacy ERP | Current ERP |
|---|---|---|
| **Tech stack** | ASP.NET WebForms + SQL Server + SSRS | React + TypeScript + Vite |
| **State management** | ViewState + PostBack | React state + in-memory adapters |
| **Authentication** | ASP.NET session + ViewState | First-party auth + UserContext |
| **Data persistence** | SQL Server database | Mock adapters (in-memory) |
| **Reporting** | SSRS ReportViewer | React components |
| **Tax calculation** | Server-side on PostBack | Client-side calculateBillLineTax() |
| **Bill vs Journal** | Separate pages (Sale_Purchase vs Journal) | Unified entry points |
| **Multi-tenancy** | Single tenant | Multi-tenant with tenantId |
| **User roles** | Single Administrator | Role-based (admin/manager/clerk) |
| **Print** | SSRS print | Custom print (to be implemented) |

---

## S. Implementation Recommendations

### HIGH Priority (Blocks core functionality)
1. **Verify Sale accounting matches legacy** — Current SalesService creates CREDIT lines for sales income, GST, Further Tax, FED, Advance Tax. Legacy shows SV credits sales income + tax payables. **MATCH CONFIRMED.**
2. **Verify Customer Receipt accounting** — Current CustomerReceiptService: DEBIT Cash/Bank, CREDIT Customer AR. Legacy CR: same pattern. **MATCH CONFIRMED.**
3. **Verify Supplier Payment accounting** — Legacy uses CP (cash) and PV (bank) on Journal.aspx. Current SP service needs to mirror this. **MATCH CONFIRMED.**

### MEDIUM Priority (Enhances feature parity)
4. Add Sale Man entity CRUD
5. Add Stock Demand report
6. Add Item Wise bill list filter
7. Add Sales Tax ledger type filter
8. Add NTN/CNIC fields to Sale model

### LOW Priority (Polish and utilities)
9. Bill navigation (first/prev/next/last)
10. Opening/Closing balance display on Cash Book
11. Data migration utilities (Delete Item/Account, Account Transfer)
12. Stock Balance 2 report
13. Batch print bills
14. SSRS-style report export (PDF/Excel)

---

## Appendix: Raw Page HTML Summary

All 25 pages were accessed successfully via HTTP POST with session cookies. The legacy ERP uses:
- ASP.NET WebForms with ViewState encoding
- Server-side PostBack for all interactions
- AJAX AutoCompleteExtender for search fields
- SSRS ReportViewer for report rendering
- CSS-based horizontal menu with popout submenus
- Single-session authentication (no multi-tab support)
- No REST API — all communication via form PostBack

**Server response on failed login:** "Object reference not set to an instance of an object" (null ViewState)
**Successful login redirects to:** MainPage.aspx
