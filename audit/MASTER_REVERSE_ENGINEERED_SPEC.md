# MASTER REVERSE-ENGINEERED SPECIFICATION
## Wholesale Distribution + Financial ERP

---

## 1. SYSTEM ARCHITECTURE

### Technology
- **Type:** ASP.NET WebForms (.NET Framework 4.x)
- **Database:** SQL Server
- **Reporting:** SSRS Report Viewer 12.0
- **Session:** Server-side ASP.NET Session State
- **Communication:** HTTP POST with ViewState (no REST API)
- **Rendering:** Full page postbacks, server-rendered HTML

### Architecture Pattern
- Classic 3-tier: Presentation (WebForms) -> Business Logic (Code-behind) -> Data (SQL Server)
- Master page with shared header/navigation
- ViewState for page state management
- PostBack for server-side events

---

## 2. NAVIGATION ARCHITECTURE

### Module Structure
```
1. ADD (Master Data)
   ├── Accounts Main Head
   ├── Accounts
   ├── Item Super Heads
   ├── Items Main Head
   ├── Items
   ├── Sale Man
   ├── Delete Item & Transfer
   ├── Delete Account & Shift
   └── Change Area of Party

2. ENTRIES
   ├── Journal Entry
   ├── Cash Book
   └── Entries List

3. REPORTS
   ├── Ledger
   ├── Trial Balance
   ├── Trial Balance With Activity
   ├── Balance Sheet / P&L
   └── Aging Report

4. BILLS
   ├── Sale/Purchase Bill
   └── List of Bills

5. STOCK
   ├── Item Ledger
   ├── Stock Balance
   └── Stock Balance With Activity

6. UTILITIES
   ├── Create New User
   ├── Change Password
   └── Log out
```

---

## 3. MODULE ARCHITECTURE

### 3.1 Master Data Module (ADD)
**Purpose:** Create and maintain all master entities
**Entities:** Main Heads, Accounts, Item Super Heads, Item Main Heads, Items, Sale Men
**Operations:** Create, Edit, Delete, Print, Transfer/Merge

### 3.2 Entries Module
**Purpose:** Record financial transactions via vouchers and cash book
**Entities:** Vouchers, Voucher Lines, Cash Book Entries
**Operations:** Create, Edit, Delete, Print vouchers

### 3.3 Reports Module
**Purpose:** Generate financial reports via SSRS
**Entities:** Ledger, Trial Balance, Balance Sheet, P&L, Aging
**Operations:** Filter, View, Export (Excel/PDF/Word), Print

### 3.4 Bills Module
**Purpose:** Create and manage sale/purchase invoices
**Entities:** Bills, Bill Lines
**Operations:** Create, Edit, Delete, Print, Navigate bills

### 3.5 Stock Module
**Purpose:** Track inventory quantities and movements
**Entities:** Stock transactions, Stock balances
**Operations:** View item ledger, stock balance, stock with activity

### 3.6 Utilities Module
**Purpose:** System administration
**Operations:** Create users, change password, logout

---

## 4. MASTER DATA

### 4.1 Chart of Accounts Hierarchy
```
Main Heads (Top Level)
  └── Accounts (Individual accounts)
        ├── CASH AND BANK (1) - Cash/Bank accounts
        ├── ASSETS (100) - Asset accounts
        ├── CAPITAL (200) - Equity accounts
        ├── FIX ASSET (250) - Fixed asset accounts
        ├── STAFF ACCOUNTS (400) - Employee accounts
        ├── DEBITORS (500) - Customer accounts
        ├── INTL CONSUMER PRODUCTS (1000) - Product categories
        ├── EXPENSES (1500) - Expense accounts
        ├── INCOME (1600) - Income accounts
        └── BUSINESS PARTIES (8000) - Supplier accounts
```

### 4.2 Product Hierarchy
```
Item Super Heads (Top Level)
  └── Item Main Heads (Mid Level)
        └── Items (Product Level)
```

### 4.3 Account Fields
Ac_No (PK), Ac_Name, Address, owner_name, phone, STN, NTN, CNIC, Main_HeadNo (FK), approval

### 4.4 Item Fields
Item_No (PK), Item_Name, Item_MainHeadNo (FK), Units, Pcs_PerCtn, Sale_Rate, Purchase_Rate, Retail_Price, Trade_Disc, T_O, Min_Qty, hs_code, gst_type, gst, fed, adv_tax_purchase, adv_tax_sale, Cost_rate

---

## 5. CUSTOMER MANAGEMENT

- **Customer = Account under DEBITORS (500)**
- Fields: Account #, Name, Address, Owner, Phone, STN, NTN, CNIC
- Balance tracked via voucher entries
- Ledger available via Ledger report
- Aging available via Aging report
- No credit limit observed
- No payment terms observed
- No customer-specific pricing observed

---

## 6. SUPPLIER MANAGEMENT

- **Supplier = Account under BUSINESS PARTIES (8000)**
- Same field structure as customers
- Balance tracked via voucher entries
- Ledger and aging available

---

## 7. PRODUCT MANAGEMENT

- **Product = Item record**
- Linked to Item Main Head (category)
- Has purchase rate, sale rate, retail price
- Has tax configuration (GST type, rates)
- Has packing info (Pcs per Carton)
- Has trade discount and trade offer defaults
- Cost_rate is a calculated field (appears in grid)

---

## 8. WAREHOUSE MANAGEMENT

**NOT OBSERVED** — No warehouse selection in any form.
**INFERRED:** Single-warehouse system or warehouse not tracked at form level.

---

## 9. SALES

### Sale Transaction Types
| Type | Code | Effect |
|------|------|--------|
| Sale Invoice | SV | Credit/cash sale |
| Sale Return | SRV | Customer return |

### Sale Bill Fields
**Header:** Voucher Type, Bill #, Date, Sale Man, Day, Party Account, Stock Account, Description, NTN, CNIC
**Line:** Item, Cartons, Packs, Rate, Trade Disc%, TO, ST%, F-ST%, FED%, ADV%, GST Type, HS Code
**Totals:** Total Ctns, Total Pcs, Total Amount, Disc Amount, To Amount, GST, F.Tax, FED, ADV.Tax, Net Amount, Prev Balance

### Sale Accounting Effect (Inferred)
```
DEBIT: Customer Account (500) — Net Amount
CREDIT: Sales Income (1600) — Base Amount
CREDIT: Tax Payable — Tax Amount
DEBIT: COGS — Cost Amount
CREDIT: Inventory — Cost Amount
```

---

## 10. PURCHASES

### Purchase Transaction Types
| Type | Code | Effect |
|------|------|--------|
| Purchase Invoice | PV | Credit purchase |
| Purchase Return | PRV | Return to supplier |

### Purchase Accounting Effect (Inferred)
```
DEBIT: Inventory — Purchase Amount
DEBIT: Tax Input — Input Tax
CREDIT: Supplier Account (8000) — Net Amount
```

---

## 11. INVENTORY

### Stock Movement
- **IN:** Purchases (PV), Sale Returns (SRV)
- **OUT:** Sales (SV), Purchase Returns (PRV)
- **Formula:** Current Stock = Opening + Purchases + Sale Returns - Sales - Purchase Returns

### Unit Conversion
- Total Pieces = Cartons x Pcs_PerCtn + Loose Packs

### Stock Reports
- Item Ledger: Transaction history per item
- Stock Balance: Current quantities
- Stock Balance With Activity: Quantities with movement details

### Warehouse
- NOT OBSERVED — Single-warehouse assumed

---

## 12. COSTING

### Cost Calculation
- **Cost_rate** is a calculated/stored field on Items
- Appears in GridView but not in edit form
- **INFERRED:** Weighted average or last purchase cost

### COGS
- COGS = Quantity Sold x Cost_rate
- Profit = Sale Amount - COGS

---

## 13. PRICING

### Price Types
| Field | Purpose |
|-------|---------|
| Purchase_Rate | Cost price |
| Sale_Rate | Selling price (auto-fills on bill) |
| Retail_Price | MRP |

### Price Resolution
- Bill rate auto-fills from Items.Sale_Rate
- Can be manually overridden per line
- No multi-price-list observed
- No customer-specific pricing observed

---

## 14. DISCOUNTS

### Trade Discount
- Percentage-based, per line item
- Applied on line amount before tax

### No Other Discount Types Observed
- No invoice-level discount
- No cash discount
- No quantity discount
- No promotional discount

---

## 15. TAX

### Tax Types
| Field | Description |
|-------|-------------|
| gst_type | VAT, 3RD, 8TH |
| gst | GST % |
| fed | Federal Excise Duty % |
| adv_tax | Advance Tax % |

### Tax Calculation
```
Base = Quantity x Rate
After Discount = Base - Trade Discount
Tax Amount = After Discount x Tax %
Net = After Discount + All Taxes
```

### Tax Configured Per Item
- Each item has its own tax rates
- Tax rates auto-fill on bill lines
- Can be overridden per bill line

---

## 16. RECEIVABLES

### Customer Balance
```
Balance = Opening + Sales - Returns - Payments - Discounts
```

### Payment Recording
- Cash Receipt (CR) credits customer account
- No invoice-level allocation observed
- Running balance model

### Aging
- Available via Aging Report
- Filter by Main Head (DEBITORS)
- Shows outstanding by age buckets

---

## 17. PAYABLES

### Supplier Balance
```
Balance = Opening + Purchases - Returns - Payments - Discounts
```

### Payment Recording
- Cash Payment (CP) debits supplier account
- Running balance model

---

## 18. GENERAL LEDGER

### Account Balance
```
Balance = Opening + SUM(Debits) - SUM(Credits)
```

### Ledger Report
- Filter by Account, Type, Date Range
- Shows all transactions with running balance
- Available for any account

---

## 19. CASH

### Cash Book
- Voucher Types: CV (Cash Voucher), CP (Cash Payment), CR (Cash Receipt)
- Shows Opening Balance, Transactions, Closing Balance
- Closing = Opening + Receipts - Payments

---

## 20. BANK

**NOT SEPARATELY OBSERVED** — Bank transactions likely handled via Journal entries (PV type).

---

## 21. EXPENSES

- Recorded via Journal entries (CP type) or Cash Book
- Accounts under EXPENSES (1500) main head
- No separate expense management module observed

---

## 22. JOURNALS

### Voucher Types
| Code | Name | Purpose |
|------|------|---------|
| JV | Journal Voucher | General adjustments |
| CV | Cash Voucher | Cash transactions |
| PV | Payment Voucher | Bank payments |
| CP | Cash Payment | Cash disbursement |
| CR | Cash Receipt | Cash receipt |

### Entry Process
1. Select type, enter date
2. Add lines: Account, Debit/Credit, Contra Account
3. Lines accumulate until balanced
4. Save/commit entire voucher

---

## 23. RETURNS

### Sale Return (SRV)
- Uses same bill form with SRV type
- Increases stock, decreases customer receivable
- Accounting reverses original sale

### Purchase Return (PRV)
- Uses same bill form with PRV type
- Decreases stock, decreases supplier payable
- Accounting reverses original purchase

---

## 24. REVERSALS

**NOT SYSTEMATICALLY OBSERVED** — Correction via:
- Delete bill/voucher (if not locked)
- Manual journal adjustment

---

## 25. FINANCIAL PERIODS

**UNKNOWN** — No period management screen observed.

---

## 26. NUMBERING

### Auto-Generated
- Voucher numbers: Sequential, auto-generated on "New Voucher"
- Bill numbers: Sequential, auto-generated on "New Bill"

### Manual Entry
- Account numbers: Entered on creation
- Item numbers: Entered on creation
- Main Head codes: Entered on creation

---

## 27. REPORTS

### Financial Reports
1. Ledger — Account transaction history
2. Trial Balance — Debit/credit totals
3. Trial Balance With Activity — Detailed transactions
4. Balance Sheet — Assets = Liabilities + Equity
5. Profit & Loss — Income - Expenses
6. Aging — Outstanding by age

### Distribution Reports
7. Entries List — All vouchers
8. List of Bills — All invoices
9. Item Ledger — Item transaction history
10. Stock Balance — Current stock
11. Stock Balance With Activity — Stock with movements

### All Reports via SSRS
- Filter parameters on each report
- Export: Excel, PDF, Word
- Print support

---

## 28. FINANCIAL STATEMENTS

- **Trial Balance:** All accounts with debit/credit totals
- **Balance Sheet:** Assets (100, 250) = Liabilities (500, 8000, 1) + Equity (200)
- **Profit & Loss:** Income (1600) - Expenses (1500) = Net Profit/Loss
- **Ledger:** Per-account transaction detail

---

## 29. PERMISSIONS

- **Authentication:** Username + Password, session-based
- **Roles:** Administrator (full access) observed
- **Permission model:** UNKNOWN — no role/permission management screen
- **Security concerns:** HTTP (not HTTPS), plaintext password transmission

---

## 30. DATA MODEL

### Core Tables (Inferred)
1. Main_Heads — Account categories
2. Accounts — Chart of accounts / parties
3. Item_Super_Heads — Product super-categories
4. Item_Main_Heads — Product categories
5. Items — Products
6. Sale_Men — Salesmen
7. Vouchers — Voucher headers
8. Voucher_Lines — Voucher line items
9. Bills — Invoice headers
10. Bill_Lines — Invoice line items
11. Users — System users

### Key Relationships
- Main_Heads -> Accounts (1:M)
- Item_Super_Heads -> Item_Main_Heads (1:M)
- Item_Main_Heads -> Items (1:M)
- Vouchers -> Voucher_Lines (1:M)
- Bills -> Bill_Lines (1:M)
- Accounts -> Bills (1:M via party)
- Items -> Bill_Lines (1:M)

---

## 31. API ARCHITECTURE

- **No REST API** — WebForms PostBack only
- **Communication:** HTTP POST with ViewState
- **No AJAX observed** — Full page postbacks
- **No client-side routing**

---

## 32. CALCULATIONS

### Line Amount
```
Amount = Packs x Rate
```

### Trade Discount
```
Disc_Amount = Amount x (Trade_Disc% / 100)
```

### After Discount
```
To_Amt = Amount - Disc_Amount
```

### Tax Calculations
```
GST = To_Amt x (ST% / 100)
F.Tax = To_Amt x (F-ST% / 100)
FED = To_Amt x (FED% / 100)
ADV_Tax = To_Amt x (ADV% / 100)
```

### Net Amount
```
Net = To_Amt + GST + F.Tax + FED + ADV_Tax
```

### Bill Totals
```
Total_Ctns = SUM(Cartons)
Total_Pcs = SUM(Packs)
Total_Amount = SUM(Amounts)
Net_Bill = SUM(Net Amounts)
```

### Cash Book
```
Closing = Opening + Total_Debit - Total_Credit
```

### Account Balance
```
Balance = Opening + SUM(Debits) - SUM(Credits)
```

### Stock
```
Current = Opening + Purchases + Sale_Returns - Sales - Purchase_Returns
```

### COGS
```
COGS = Quantity_Sold x Cost_Rate
```

### Profit
```
Profit = Sale_Amount - COGS
```

---

## 33. VALIDATIONS

### Observed
- Required fields enforced (Account #, Name, Item #, etc.)
- Unique identifiers (Account #, Item #, Voucher #)
- Debit/Credit mutual exclusivity per line
- Voucher balance check (Debit must = Credit)

### Not Observed (Unknown)
- Credit limit enforcement
- Stock sufficiency check
- Duplicate prevention rules
- Period lock validation
- Date range validation
- Return quantity limits

---

## 34. TRANSACTION DEPENDENCIES

### Sale Invoice Effects
```
Bill -> Bill Lines -> Stock Decrease -> Customer Receivable -> 
Customer Ledger -> General Ledger -> COGS -> Profit -> Reports
```

### Purchase Invoice Effects
```
Bill -> Bill Lines -> Stock Increase -> Supplier Payable -> 
Supplier Ledger -> General Ledger -> Reports
```

### Cash Receipt Effects
```
Voucher -> Cash Increase -> Customer Decrease -> 
Cash Book -> Ledger -> Reports
```

---

## 35. FUNCTION CATALOG

**Master Data:** CREATE_MAIN_HEAD, CREATE_ACCOUNT, CREATE_ITEM_SUPER_HEAD, CREATE_ITEM_MAIN_HEAD, CREATE_ITEM, CREATE_SALE_MAN

**Transactions:** NEW_JOURNAL_VOUCHER, ADD_JOURNAL_LINE, DELETE_JOURNAL_LINE, DELETE_JOURNAL_VOUCHER, NEW_CASH_BOOK_ENTRY, NEW_SALE_BILL, ADD_BILL_LINE, SAVE_BILL, DELETE_BILL, NEW_PURCHASE_BILL, RETURN_SALE, RETURN_PURCHASE

**Data Maintenance:** DELETE_ITEM_TRANSFER, DELETE_ACCOUNT_TRANSFER, CHANGE_PARTY_AREA

**Reports:** VIEW_LEDGER, VIEW_TRIAL_BALANCE, VIEW_BALANCE_SHEET, VIEW_PROFIT_LOSS, VIEW_AGING, VIEW_ENTRIES_LIST, VIEW_BILLS_LIST, VIEW_ITEM_LEDGER, VIEW_STOCK_BALANCE

**Utilities:** LOGIN, LOGOUT, CHANGE_PASSWORD, CREATE_USER

---

## 36. WORKFLOW CATALOG

1. Credit Sale: Select customer -> Add items -> Calculate -> Save -> Update stock/receivable/GL
2. Cash Sale: Select cash account -> Add items -> Save -> Update stock/cash
3. Purchase: Select supplier -> Add items -> Save -> Update stock/payable
4. Sale Return: Select customer -> Add returned items -> Save -> Reverse stock/receivable
5. Purchase Return: Select supplier -> Add returned items -> Save -> Reverse stock/payable
6. Customer Payment: Select cash account -> Select customer -> Enter amount -> Save
7. Supplier Payment: Select supplier -> Select cash account -> Enter amount -> Save
8. Journal Adjustment: Select accounts -> Enter debit/credit -> Save
9. Expense Payment: Select expense -> Select cash -> Enter amount -> Save

---

## 37. PRINTING / EXPORT

### Print Functions
- Bill Print (Sale_Purchase.aspx)
- Voucher Print (Journal.aspx)
- Cash Book Print (Cash_Book.aspx)
- Account List Print (Accounts.aspx)
- Item List Print (Items.aspx)

### Export (SSRS Reports)
- Excel (XLS/XLSX)
- PDF
- Word (DOC/DOCX)

---

## 38. UNKNOWN / UNVERIFIED AREAS

1. Exact accounting entries for each transaction type
2. Stock sufficiency validation
3. Credit limit enforcement
4. Period locking mechanism
5. Financial year closing
6. Opening balance entry method
7. Multi-warehouse support
8. Batch/lot tracking
9. Customer-specific pricing
10. Price list management
11. Approval workflows
12. Audit trail
13. Role-based permissions
14. Password hashing
15. Concurrent access handling
16. Bank reconciliation
17. Cheque management
18. Expense budgets
19. Sales orders
20. Delivery challan
21. Quotation/estimate
22. Stock adjustment mechanism
23. Cost_rate calculation formula (PARTIALLY VERIFIED - see below)
24. Tax-inclusive vs exclusive pricing
25. Year-end closing procedure

---

## 39. SECOND-PASS VERIFIED FINDINGS

### 39.1 AJAX AutoComplete Services
**VERIFIED:** System uses ASP.NET AJAX AutoCompleteExtender for real-time search:
- `Searchacname` WebMethod → Account name search (TxtAcName, txtntnno, txtcnic)
- `SearchRefacname` WebMethod → Reference account search (TxtRefaceName)
- `SearchCustomers` WebMethod → Customer/item search (TxtItemName)
- Minimum prefix length = 1 character (instant search)
- Pages: Sale_Purchase.aspx, Journal.aspx, Cash_Book.aspx

### 39.2 PostBack Calculation Triggers
**VERIFIED:** Multiple fields trigger server-side calculations on change:
- **Sale_Purchase.aspx:** 17 fields trigger PostBack (txtvno, TxtAcName, txtntnno, txtcnic, TxtRefaceName, TxtItemName, txtItemNo, txtgsttype, txthscode, txtTotalAmount, txtToAmt, txtSTAmt, txtFTAmt, txtFEDAmt, txtADVTAmt, txtTotalAmtInclSt, txtPrevBal)
- **Journal.aspx:** 3 fields trigger PostBack (txtvno, TxtAcName, TxtRefaceName)
- **Cash_Book.aspx:** 5 fields trigger PostBack (txtvno, txtdate, txtacno, TxtAcName, TxtRefaceName)
- **Accounts.aspx:** 2 fields trigger PostBack (cmbMainHead, txtacno)
- **MainHeads.aspx:** 6 fields trigger PostBack (txtmhno, DDLEffect, cmbacname, txtSmno, cmbDay)
- **Items.aspx:** 1 field triggers PostBack (CmbItemMHeads)

### 39.3 CNIC/NTN Fields
**VERIFIED:** CNIC and NTN fields exist on Sale_Purchase.aspx:
- txtcnic → AutoComplete behavior (Searchacname WebMethod)
- txtntnno → AutoComplete behavior (Searchacname WebMethod)
- Both fields trigger PostBack on change (server-side lookup)
- Label discrepancy: "CNIC" label maps to txtapproval input field

### 39.4 Cost_rate Calculation
**VERIFIED:** Cost_rate is a stored/calculated field:
- Appears in GridView columns only (no input field)
- Differs from Purchase_Rate (e.g., Purchase_Rate=184.90 vs Cost_rate=190.08)
- Likely calculated as weighted average or moving average cost
- Used for COGS and stock valuation

### 39.5 Enhanced System Architecture
**UPDATED:** System architecture now includes:
- AJAX WebMethods for real-time search
- PostBack triggers for dynamic calculations
- AutoCompleteExtender for account/item lookup
- Server-side calculation engine for taxes and totals
