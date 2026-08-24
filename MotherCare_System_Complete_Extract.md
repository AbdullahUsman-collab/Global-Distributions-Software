# GLOBAL DISTRIBUTION SERVICES (MOTHERCARE) - COMPLETE SYSTEM EXTRACTION
## Wholesale Distribution Management System

---

## SYSTEM OVERVIEW
- **Company:** Global Distribution Services (MotherCare) - Mothercare Distributors
- **Technology:** ASP.NET WebForms (.NET Framework 4.x), SQL Server, SSRS Report Viewer 12.0
- **Architecture:** Classic 3-tier ASP.NET WebForms with GridView controls, SSRS reports
- **Session:** Server-side session (ASP.NET Session State)

---

## 1. LOGIN PAGE (`Default.aspx`)

### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `TxtUserName` | text | Login Name | Username input |
| `txtPassWord` | password | Password | Password input |
| `ImageButton1` | image (submit) | Login Button | Submits login form |

### Hidden Fields
- `__VIEWSTATE` - ASP.NET viewstate
- `__VIEWSTATEGENERATOR` - Viewstate generator
- `__EVENTVALIDATION` - Event validation

### Labels
- `lblmessage` - Error message display (Red, X-Large font)

### Login Logic
- POST to `./` (self)
- On success -> redirects to `MainPage.aspx`
- On failure -> shows error in `lblmessage`
- Background color: `#E6E6FA` (Lavender)

---

## 2. MAIN PAGE (`MainPage.aspx`)

### Display Elements
| Field ID | Type | Description |
|----------|------|-------------|
| `MainContent_lbluser` | Label | Displays logged-in username (e.g., "Administrator") |
| `MainContent_lblcompany` | Label | Displays company scope (e.g., "All") |

### Images
- Banner: `images/New Banner2.jpg` (600px height, 100% width)

### Navigation Menu Structure
```
Menu ID: NavigationMenu (Horizontal, CSS-based)

1. ADD (href="About.aspx") - Popout menu
   ├── Accounts Main Head (MainHeads.aspx)
   ├── Accounts (Accounts.aspx)
   ├── Item Super Heads (ItemSuperHead.aspx)
   ├── Items Main Head (ItemMainHeads.aspx)
   ├── Items (Items.aspx)
   ├── Sale Man (Sale_Man.aspx)
   ├── Delete Item and Transfer Data to New Item no (DelItem.aspx)
   ├── Delete A/c and Shift Data to Other A/c (DelAccount.aspx)
   └── Change Area of a Party (AcTransfer.aspx)

2. ENTRIES - Popout menu (PostBack triggered)
   ├── Journal Entry (Journal.aspx)
   ├── Cash Book (Cash_Book.aspx)
   └── Entries List (JournalEntriesList.aspx)

3. REPORTS - Popout menu (PostBack triggered)
   ├── Ledger (Ledger.aspx)
   ├── Trail Balance (TrailBalance.aspx)
   ├── Trail Balance With Activity (TrailBWA.aspx)
   ├── Balance Sheet / Profit and Loss (BalanceSheet.aspx)
   └── Aging Report (Aging.aspx)

4. BILLS - Popout menu (PostBack triggered)
   ├── Sale/Purchase Bill (Sale_Purchase.aspx)
   └── List of Bills (ListofBills.aspx)

5. STOCK - Popout menu (PostBack triggered)
   ├── Item Ledger (ItemLedger.aspx)
   ├── Stock Balance (StockBalance.aspx)
   └── Stock Balance With Activity (StockBWA.aspx)

6. UTILITIES - Popout menu (PostBack triggered)
   ├── Create New User (PostBack: "Utilities\Create New User")
   ├── Change Password (ChangePassword.aspx)
   └── Log out (Default.aspx)
```

### Menu Behavior
- `disappearAfter: 500` (500ms delay before menu disappears)
- Orientation: horizontal
- tabIndex: 0
- Entries/Reports/Bills/Stock/Utilities use `__doPostBack` (server-side event)

---

## 3. MASTER DATA MODULE (ADD)

---

### 3.1 ACCOUNTS MAIN HEAD (`MainHeads.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtmhno` | text | Main Head # | Numeric code, 56px width, has `onchange` PostBack |
| `MainContent_txtmhname` | text | Main Head Name | Text, 152px width |
| `MainContent_txtSmno` | text | Sale Man # | Disabled (read-only), 56px width, has `onchange` PostBack |
| `MainContent_DDLEffect` | select | Effect | Options: Balance Sheet, Profit and Loss, Both |
| `MainContent_cmbacname` | select | Sale Man | Options: -Select Sale Man-, SHAHID IQBAL, AMEER HAMZA, SHAHZAD AMIR, ASIF RIAZ |
| `MainContent_cmbDay` | select | Day | Options: -Select-, Friday, Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday |

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_bttnsave` | submit | Save | Saves main head |
| `MainContent_bttndelete` | submit | Delete | Deletes main head |
| `MainContent_bttnback` | submit | Back | Navigates to MainPage.aspx |

#### GridView Columns
| Column | Field | Description |
|--------|-------|-------------|
| Select | Radio/Button | Row selection |
| Main_Head_No | Hidden field | Unique code |
| Main_Head_Name | Hidden field | Name |
| Effect | Hidden field | Balance Sheet / Profit and Loss / Both |
| SP_ID | Hidden field | Sale Man ID |
| SP_Name | Hidden field | Sale Man Name |
| Day | Hidden field | Day assignment |

#### Existing Main Heads Data
| Code | Name | Effect | SP_ID | Day |
|------|------|--------|-------|-----|
| 1 | CASH AND BANK | Balance Sheet | 0 | -Select- |
| 100 | ASSETS | Balance Sheet | 0 | -Select- |
| 200 | CAPITAL | Balance Sheet | 0 | -Select- |
| 250 | FIX ASSET | Balance Sheet | 0 | -Select- |
| 400 | STAFF ACCOUNTS | Balance Sheet | 0 | -Select- |
| 500 | DEBITORS | Balance Sheet | 0 | -Select- |
| 1000 | INTERNATIONAL CONSUMER PRODUCTS | Balance Sheet | 0 | -Select- |
| 1500 | EXPENSES | Profit and Loss | 0 | -Select- |
| 1600 | INCOME | Profit and Loss | 0 | -Select- |
| 8000 | BUSINESS PARTIES | Balance Sheet | 0 | -Select- |

---

### 3.2 ACCOUNTS (`Accounts.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtCode` | text | Code | Search/code field |
| `MainContent_cmbMainHead` | select | Main Head | Dropdown of Main Heads |
| `MainContent_txtacno` | text | Account # | Auto-generated or manual |
| `MainContent_txtacname` | text | Account Name | Party/account name |
| `MainContent_txtaddress` | text | Address | Party address |
| `MainContent_txtOwnerName` | text | Owner Name | Owner name |
| `MainContent_txtMobile` | text | Mobile | Phone number |
| `MainContent_txtStn` | text | STN | Sales Tax Number |
| `MainContent_txtNtn` | text | NTN | National Tax Number |
| `MainContent_txtapproval` | text | Approval | Approval code |

#### Main Head Dropdown Options
```
CASH AND BANK | ASSETS | CAPITAL | FIX ASSET | STAFF ACCOUNTS | 
DEBITORS | INTERNATIONAL CONSUMER PRODUCTS | EXPENSES | INCOME | 
BUSINESS PARTIES
```

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_bttnSave` | submit | Save | Saves account |
| `MainContent_bttnDelete` | submit | Delete | Deletes account |
| `MainContent_bttnPrint` | submit | Print | Prints account list |
| `MainContent_bttnBack` | submit | Back | Navigates to MainPage.aspx |

#### GridView Columns
| Column | Field | Description |
|--------|-------|-------------|
| Select | Radio/Button | Row selection |
| Ac_No | Numeric | Account number (e.g., 10) |
| Ac_Name | Text | Account name (e.g., CASH IN HAND) |
| Address | Text | Address |
| owner_name | Text | Owner name |
| phone | Text | Phone |
| STN | Text | Sales Tax Number |
| NTN | Text | National Tax Number |
| CNIC | Text | CNIC |
| Main_HeadNo | Numeric | Foreign key to Main Heads |

---

### 3.3 ITEM SUPER HEADS (`ItemSuperHead.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtSHNo` | text | Super Head # | Numeric code |
| `MainContent_txtSHName` | text | Super Head Name | Name |

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_bttnsave` | submit | Save | Saves super head |
| `MainContent_bttndelete` | submit | Delete | Deletes super head |
| `MainContent_bttnback` | submit | Back | Back to MainPage |
| `MainContent_Button1` | submit | Edit | Edits super head |

#### GridView Columns
| Column | Field |
|--------|-------|
| Select | Row selection |
| SH_No | Super Head number |
| SH_Name | Super Head name |

#### Existing Data
| SH_No | SH_Name |
|-------|---------|
| 1 | Mother Care |

---

### 3.4 ITEM MAIN HEADS (`ItemMainHeads.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtCode` | text | Code | Search code |
| `MainContent_CmbItemSuperHeads` | select | Super Head | Dropdown of super heads |
| `MainContent_txtITHNo` | text | Main Head # | Numeric code |
| `MainContent_txtITHName` | text | Main Head Name | Name |

#### Buttons
| Button ID | Type | Text |
|-----------|------|------|
| `MainContent_bttnsave` | submit | Save |
| `MainContent_bttndelete` | submit | Delete |
| `MainContent_bttnback` | submit | Back |
| `MainContent_bttnPrint` | submit | Print |

#### GridView Columns
| Column | Field |
|--------|-------|
| Select | Row selection |
| Item_MainHeadNo | Main Head number |
| Item_MainHeadName | Main Head name |
| SH_No | Super Head foreign key |

#### Existing Data
| Item_MainHeadNo | Item_MainHeadName | SH_No |
|-----------------|-------------------|-------|
| 1 | Powder | 1 |
| 50 | Lotion | 1 |
| 100 | Gift Box | 1 |
| 150 | Shampoo | 1 |
| 190 | Pouch | 1 |
| 200 | Soap | 1 |
| 250 | OIL | 1 |
| 300 | Wipes | 1 |
| 400 | NEW SKUs | 1 |

---

### 3.5 ITEMS (`Items.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtItemMHNo` | text | Main Head # | Auto-populated main head |
| `MainContent_CmbItemMHeads` | select | Item Main Head | Dropdown (Powder, Lotion, etc.) |
| `MainContent_txtIemNo` | text | Item # | Unique item number |
| `MainContent_txtItemName` | text | Item Name | Full item name |
| `MainContent_cmbunits` | text | Units | Unit of measure (e.g., 1) |
| `MainContent_txtltrperpack` | text | Pcs per Ctn | Pieces per carton |
| `MainContent_txtretailprice` | text | Retail Price | MRP/Retail price |
| `MainContent_txtitempurchaserate` | text | Purchase Rate | Cost/purchase price |
| `MainContent_txtitemsalerate` | text | Sale Rate | Selling price |
| `MainContent_txtDis` | text | Trade Discount | Trade discount % |
| `MainContent_txtTO` | text | Trade Offer | Trade offer (TO) |
| `MainContent_txtMinQty` | text | Min Qty | Minimum quantity |
| `MainContent_txtHSCode` | text | HS Code | Harmonized System code |
| `MainContent_DDTaxtype` | select | GST Type | Options: VAT, 3RD, 8TH |
| `MainContent_txtGST` | text | GST % | GST percentage |
| `MainContent_txtFED` | text | FED % | Federal Excise Duty % |
| `MainContent_txtAdvTax_Pur` | text | ADV Tax Purchase | Advance tax on purchase % |
| `MainContent_txtAdvTax_Sale` | text | ADV Tax Sale | Advance tax on sale % |

#### Buttons
| Button ID | Type | Text |
|-----------|------|------|
| `MainContent_bttnsave` | submit | Save |
| `MainContent_bttndelete` | submit | Delete |
| `MainContent_bttnback` | submit | Back |
| `MainContent_bttnPrint` | submit | Print |

#### GridView Columns
| Column | Field | Description |
|--------|-------|-------------|
| Select | Radio/Button | Row selection |
| Item_No | Numeric | Unique item number |
| Item_Name | Text | Full item name |
| Item_MainHeadNo | Numeric | FK to Item Main Heads |
| Units | Numeric | Unit code |
| Pcs_PerCtn | Numeric | Pieces per carton |
| Sale_Rate | Decimal | Sale rate |
| Purchase_Rate | Decimal | Purchase rate |
| Retail_Price | Decimal | Retail/MRP price |
| Trade_Disc | Decimal | Trade discount |
| T_O | Numeric | Trade offer |
| Min_Qty | Numeric | Minimum order quantity |
| hs_code | Text | HS Code |
| gst_type | Text | GST type (3RD, VAT, 8TH) |
| gst | Numeric | GST % |
| fed | Numeric | FED % |
| adv_tax_purchase | Numeric | Advance tax purchase % |
| adv_tax_sale | Numeric | Advance tax sale % |
| Cost_rate | Decimal | Calculated cost rate |

#### Sample Items Data
| # | Item_Name | Pcs/Ctn | Sale_Rate | Purchase_Rate | Retail_Price | Trade_Disc | T_O | GST_Type | GST% | Cost_Rate |
|---|-----------|---------|-----------|---------------|-------------|------------|-----|----------|------|-----------|
| 2 | Baby Powder (Pink) 90 GM | 96 | 184.90 | 184.90 | 203.39 | 0 | 0 | 3RD | 18 | 190.08 |
| 3 | Baby Powder (Pink) 130 GM | 96 | 231.12 | 231.12 | 254.24 | 0 | 0 | 3RD | 18 | 237.59 |
| 4 | GO RASH POWDER 250 GM | 48 | 365.95 | 365.95 | 402.54 | 0 | 0 | 3RD | 18 | 376.20 |
| 5 | GO RASH POWDER 150 GM | 72 | 277.35 | 277.35 | 305.08 | 0 | 0 | 3RD | 18 | 284.18 |
| 6 | FRENCH POWER 90 GM | 96 | 184.90 | 184.90 | 203.39 | 0 | 0 | 3RD | 18 | 190.08 |
| 7 | FRENCH POWER 130 GM | 96 | 231.12 | 231.12 | 254.24 | 0 | 0 | 3RD | 18 | 237.59 |
| 8 | FRENCH POWER 385 GM | 24 | 385.21 | 385.21 | 423.73 | 0 | 0 | 3RD | 18 | 395.03 |
| 9 | FRENCH POWER 215 GM | 48 | 288.91 | 288.91 | 317.80 | 0 | 0 | 3RD | 18 | 296.00 |
| 10 | Prickly Heat Powder 150 GM | 72 | 277.35 | 277.35 | 305.08 | 0 | 0 | 3RD | 18 | 284.18 |
| 11 | Prickly Heat Powder 250 GM | 48 | 365.95 | 365.95 | 402.54 | 0 | 0 | 3RD | 18 | 376.20 |
| 12 | GO RASCH 150 GM NEW | 72 | 308.17 | 308.17 | 338.98 | 0 | 0 | 3RD | 18 | 316.11 |
| 13 | ECG GO RASCH 250 GM | 48 | 423.73 | 423.73 | 466.01 | 0 | 0 | 3RD | 18 | 434.23 |
| 14 | MC POWER PINK 215 GM | 48 | 351.48 | 351.48 | 381.36 | 0 | 0 | 3RD | 18 | 360.15 |
| 15 | SC POWER 130 GM PINK | 96 | 269.65 | 269.65 | 296.61 | 0 | 0 | 3RD | 18 | 276.50 |
| 16 | MC POWER 90 GM PINK | 96 | 199.93 | 199.93 | 220.73 | 0 | 0 | 3RD | 18 | 205.54 |
| 17 | GO RASCH 150 GM | 72 | 308.17 | 308.17 | 338.98 | 0 | 0 | 3RD | 18 | 316.11 |
| 18 | GO RASCH 250 GM | 48 | 423.73 | 423.73 | 466.01 | 0 | 0 | 3RD | 18 | 434.23 |
| 19 | SC POWER 130 GM PINK | 96 | 269.65 | 269.65 | 296.61 | 0 | 0 | 3RD | 18 | 276.50 |
| 20 | MC POWER 90 GM PINK | 96 | 199.93 | 199.93 | 220.73 | 0 | 0 | 3RD | 18 | 205.54 |

---

### 3.6 SALE MAN (`Sale_Man.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtmhno` | text | Sale Man # | Numeric ID |
| `MainContent_txtmhname` | text | Sale Man Name | Full name |

#### Buttons
| Button ID | Type | Text |
|-----------|------|------|
| `MainContent_bttnsave` | submit | Save |
| `MainContent_bttndelete` | submit | Delete |
| `MainContent_bttnback` | submit | Back |

#### Existing Data
| Sale_Man_ID | Name |
|-------------|------|
| 6 | SHAHID IQBAL |
| 7 | AMEER HAMZA |
| 8 | SHAHZAD AMIR |
| 9 | ASIF RIAZ |

---

### 3.7 DELETE ITEM & TRANSFER DATA (`DelItem.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_TxtItemName` | text | Old Item Name | Search old item |
| `MainContent_txtitemno1` | text | Old Item # | Old item number |
| `MainContent_TxtItemName2` | text | New Item Name | Target item name |
| `MainContent_txtItemno2` | text | New Item # | Target item number |

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_Button1` | submit | Transfer | Transfers data from old item to new item |
| `MainContent_Button2` | submit | Delete | Deletes old item |

#### Logic
- Enter old item number and name
- Enter new item number and name (destination)
- Button1: Transfers all data (transactions, stock) from old item to new item
- Button2: Deletes the old item record

---

### 3.8 DELETE ACCOUNT & SHIFT DATA (`DelAccount.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_TxtAcName` | text | Old Account Name | Search old account |
| `MainContent_txtacno` | text | Old Account # | Old account number |
| `MainContent_TxtRefaceName` | text | New Account Name | Target account name |
| `MainContent_txtrefacno` | text | New Account # | Target account number |

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_Button1` | submit | Transfer | Transfers all data from old A/c to new A/c |
| `MainContent_Button2` | submit | Delete | Deletes old account |

---

### 3.9 CHANGE AREA OF A PARTY (`AcTransfer.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_TxtAcName` | text | Party Name | Current party name |
| `MainContent_txtacno` | text | Party Account # | Current account number |
| `MainContent_cmbMainHead` | text | Current Main Head | Current main head code |
| `MainContent_txtCode` | text | Current Code | Current area code |
| `MainContent_cmbMainHead2` | select | New Main Head | New main head dropdown |
| `MainContent_txtCode2` | text | New Code | New area code |
| `MainContent_txtacno2` | text | New Account # | New account number |
| `MainContent_TxtAcName2` | text | New Party Name | New party name |

#### New Main Head Dropdown Options
```
CASH AND BANK | ASSETS | CAPITAL | FIX ASSET | STAFF ACCOUNTS | 
DEBITORS | INTERNATIONAL CONSUMER PRODUCTS | EXPENSES | INCOME | 
BUSINESS PARTIES
```

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_Button1` | submit | Transfer | Changes the area/main head of the party |
| `MainContent_Button2` | submit | Cancel | Cancels operation |

---

## 4. ENTRIES MODULE

---

### 4.1 JOURNAL ENTRY (`Journal.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_cmbvtype` | select | Voucher Type | Options: JV, CV, PV, CP, CR |
| `MainContent_txtvno` | text | Voucher # | Auto-generated voucher number |
| `MainContent_txtdate` | text | Date | Transaction date |
| `MainContent_Button2` | submit | (Date Picker) | Opens date picker |
| `MainContent_txtsno` | text | Stock Item # | Stock item reference (for inventory vouchers) |
| `MainContent_TxtAcName` | text | Account Name | Account name (autocomplete/search) |
| `MainContent_txtacno` | text | Account # | Account number |
| `MainContent_txtdescription` | text | Description | Transaction description/narration |
| `MainContent_TxtRefaceName` | text | Reference Account Name | contra account name |
| `MainContent_txtrefacno` | text | Reference Account # | contra account number |
| `MainContent_txtdebit` | text | Debit Amount | Debit amount |
| `MainContent_txtcredit` | text | Credit Amount | Credit amount |

#### Totals Section
| Field ID | Type | Description |
|----------|------|-------------|
| `MainContent_txttotaldebit` | text | Total debit sum |
| `MainContent_txttotalcredit` | text | Total credit sum |
| `MainContent_txtbalance` | text | Balance (Debit - Credit) |

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_Button1` | submit | Add Line | Adds current line to voucher |
| `MainContent_bttndelentry` | submit | Delete Entry | Deletes selected line entry |
| `MainContent_bttnNewVoucher` | submit | New Voucher | Creates new voucher |
| `MainContent_bttnDelVoucher` | submit | Delete Voucher | Deletes entire voucher |
| `MainContent_bttnPrint` | submit | Print | Prints voucher |
| `MainContent_bttnBack` | submit | Back | Returns to MainPage |

#### Voucher Types
| Code | Name | Purpose |
|------|------|---------|
| JV | Journal Voucher | General journal entries |
| CV | Cash Voucher | Cash receipt/disbursement |
| PV | Payment Voucher | Bank payment |
| CP | Cash Payment | Cash payment out |
| CR | Cash Receipt | Cash receipt in |

#### GridView Columns (Voucher Lines)
| Column | Field | Description |
|--------|-------|-------------|
| Voucher_No | Numeric | Voucher number |
| Voucher_Type | Text | JV/CV/PV/CP/CR |
| E_Date | Date | Entry date |
| S_No | Numeric | Stock item number (if applicable) |
| Acc_No | Numeric | Account number |
| Acc_Name | Text | Account name |
| Description | Text | Narration/description |
| Debit | Decimal | Debit amount |
| Credit | Decimal | Credit amount |
| Balance | Decimal | Running balance |
| Acc_No2 | Numeric | Reference/contra account |
| Acc_Name2 | Text | Reference account name |
| T_Balance | Decimal | Total balance |
| UserName | Text | Entered by |
| ST_InvNo | Text | Sales Tax Invoice # |
| ST_Rate | Decimal | ST Rate |
| ST_Amount | Decimal | ST Amount |
| Amt_Excl_Std | Decimal | Amount excluding ST |

#### Entry Logic
1. Select voucher type from dropdown
2. Click "New Voucher" to get new voucher number
3. Enter date
4. For each line: enter account, description, debit OR credit amount
5. Click "Add Line" to add line to voucher grid
6. Totals auto-calculate (Total Debit, Total Credit, Balance)
7. Debit must equal Credit for balanced entry
8. Save happens with each line addition
9. "Delete Entry" removes selected line
10. "Delete Voucher" removes entire voucher and all lines

---

### 4.2 CASH BOOK (`Cash_Book.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_cmbvtype` | select | Voucher Type | Options: CV, CP, CR |
| `MainContent_txtvno` | text | Voucher # | Auto-generated |
| `MainContent_txtdate` | text | Date | Transaction date |
| `MainContent_txtacno` | text | Cash Account # | Cash account number |
| `MainContent_TxtAcName` | text | Cash Account Name | Cash account name |
| `MainContent_txtopeningbal` | text | Opening Balance | Opening balance display |
| `MainContent_txtrefacno` | text | Reference Account # | Party/account |
| `MainContent_TxtRefaceName` | text | Reference Account Name | Party name |
| `MainContent_txtdescription` | text | Description | Narration |
| `MainContent_txtdebit` | text | Receive (Db) | Amount received (debit) |
| `MainContent_txtcredit` | text | Payment (Cr) | Amount paid (credit) |

#### Totals Section
| Field ID | Type | Description |
|----------|------|-------------|
| `MainContent_txttotaldebit` | text | Total Debit |
| `MainContent_txttotalcredit` | text | Total Credit |
| `MainContent_txtclosingbal` | text | Closing Balance |

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_Button2` | submit | (Date Picker) | Opens date picker |
| `MainContent_bttnBack0` | submit | (Back 0) | Back action |
| `MainContent_bttnBack1` | submit | (Back 1) | Back action |
| `MainContent_bttnSave` | submit | Save | Saves cash book entry |
| `MainContent_bttnDelete` | submit | Delete | Deletes entry |
| `MainContent_bttnPrint` | submit | Print | Prints cash book |
| `MainContent_bttnReset` | submit | Reset | Resets form |
| `MainContent_bttnBack` | submit | Back | Returns to MainPage |

#### Voucher Types
| Code | Name | Purpose |
|------|------|---------|
| CV | Cash Voucher | General cash transaction |
| CP | Cash Payment | Cash payment out |
| CR | Cash Receipt | Cash receipt in |

#### GridView Columns
| Column | Field | Description |
|--------|-------|-------------|
| Ac # | Numeric | Account number |
| Ac Name | Text | Account name |
| Description | Text | Narration |
| Receive (Db) | Decimal | Debit amount |
| Payment (Cr) | Decimal | Credit amount |
| All Entries | - | All entries flag |

#### Cash Book Logic
1. Select voucher type (CV/CP/CR)
2. Enter/select cash account (shows opening balance)
3. Enter date
4. For each entry: enter party account, description, amount
5. Click Save to save entry
6. Opening Balance + Total Debit - Total Credit = Closing Balance

---

### 4.3 ENTRIES LIST (`JournalEntriesList.aspx`)

#### Filter Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_cmbvtype` | select | Voucher Type | Options: All, JV, CV, PV, SV, CP, CR, PRV, SRV |
| `MainContent_txtDate1` | text | From Date | Start date |
| `MainContent_txtDate2` | text | To Date | End date |

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_bttnRefresh` | submit | Refresh | Loads/refreshes report |
| `MainContent_bttnBack` | submit | Back | Returns to MainPage |

#### Report
- Uses SSRS ReportViewer control (`ReportViewer1`)
- Report pagination: First, Previous, Next, Last, Current Page
- Export: Excel, PDF, Word (via SSRS toolbar)
- Find/Next search functionality
- Report parameter panel toggle

---

## 5. REPORTS MODULE

---

### 5.1 LEDGER (`Ledger.aspx`)

#### Filter Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_TxtAcName` | text | Account Name | Party/account name search |
| `MainContent_txtacno` | text | Account # | Account number |
| `MainContent_DDLType` | select | Type | Options: Normal, Sales Tax |
| `MainContent_txtDate1` | text | From Date | Start date |
| `MainContent_txtDate2` | text | To Date | End date |
| `MainContent_txtacno2` | text | Search By A/c# | Additional search field |

#### Buttons
| Button ID | Type | Text |
|-----------|------|------|
| `MainContent_bttnRefresh` | submit | Refresh |
| `MainContent_bttnBack` | submit | Back |
| `MainContent_Button1` | submit | (Search button) |

#### Report Output (SSRS)
- Account ledger with all transactions
- Running balance
- Debit/Credit columns
- Export: Excel, PDF, Word

---

### 5.2 TRIAL BALANCE (`TrailBalance.aspx`)

#### Filter Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtAcNo1` | text | From A/c# | Starting account |
| `MainContent_TxtAcNo2` | text | To A/c# | Ending account |
| `MainContent_txtDate1` | text | From Date | Start date |
| `MainContent_txtDate2` | text | To Date | End date |
| `MainContent_cmbacname` | select | Main Head | Options: All main heads + "-Select Main Head-" |
| `MainContent_txtMHNo` | text | Main Head # | Hidden/calculated field |

#### Buttons
| Button ID | Type | Text |
|-----------|------|------|
| `MainContent_bttnRefresh` | submit | Refresh |
| `MainContent_bttnBack` | submit | Back |

---

### 5.3 TRIAL BALANCE WITH ACTIVITY (`TrailBWA.aspx`)

#### Filter Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtAcNo1` | text | From A/c# | Starting account |
| `MainContent_TxtAcNo2` | text | To A/c# | Ending account |
| `MainContent_txtDate1` | text | From Date | Start date |
| `MainContent_txtDate2` | text | To Date | End date |
| `MainContent_cmbacname` | select | Main Head | Same options as Trial Balance |
| `MainContent_txtMHNo` | text | Main Head # | Hidden field |

#### Buttons
| Button ID | Type | Text |
|-----------|------|------|
| `MainContent_bttnRefresh` | submit | Refresh |
| `MainContent_bttnBack` | submit | Back |

---

### 5.4 BALANCE SHEET / PROFIT & LOSS (`BalanceSheet.aspx`)

#### Filter Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtAcNo1` | text | From A/c# | Starting account |
| `MainContent_TxtAcNo2` | text | To A/c# | Ending account |
| `MainContent_txtDate1` | text | From Date | Start date |
| `MainContent_txtDate2` | text | To Date | End date |

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_bttnRefresh` | submit | Refresh | Shows Balance Sheet |
| `MainContent_bttnProfitLoss` | submit | Profit & Loss | Shows P&L statement |
| `MainContent_bttnBack` | submit | Back | Returns to MainPage |

---

### 5.5 AGING REPORT (`Aging.aspx`)

#### Filter Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtAcNo1` | text | From A/c# | Starting account |
| `MainContent_TxtAcNo2` | text | To A/c# | Ending account |
| `MainContent_txtDate1` | text | To Date | As of date |
| `MainContent_cmbacname` | select | Main Head | Same main head options |
| `MainContent_txtMHNo` | text | Main Head # | Hidden field |

#### Buttons
| Button ID | Type | Text |
|-----------|------|------|
| `MainContent_bttnRefresh` | submit | Refresh |
| `MainContent_bttnBack` | submit | Back |

---

## 6. BILLS MODULE

---

### 6.1 SALE/PURCHASE BILL (`Sale_Purchase.aspx`)

#### BILL HEADER FIELDS
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_cmbvtype` | select | Voucher Type | **SV** (Sale), **PV** (Purchase), **SRV** (Sale Return), **PRV** (Purchase Return) |
| `MainContent_txtvno` | text | Voucher # | Auto-generated bill number |
| `MainContent_Button2` | submit | (< prev) | Previous bill |
| `MainContent_Button3` | submit | (> next) | Next bill |
| `MainContent_Button4` | submit | (> SRV) | Jump to SRV |
| `MainContent_Button5` | submit | (> PRV) | Jump to PRV |
| `MainContent_txtdate` | text | Date | Bill date |
| `MainContent_cmbacname` | select | Sale Man | Options: -Select Sale Man-, SHAHID IQBAL, AMEER HAMZA, SHAHZAD AMIR, ASIF RIAZ |
| `MainContent_txtSmno` | text | Sale Man # | Auto-populated from dropdown |
| `MainContent_cmbDay` | select | Day | Options: -Select-, Friday, Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday |
| `MainContent_txtMHNo` | text | Main Head # | Auto-populated |
| `MainContent_TxtAcName` | text | Party / Cash A/c Name | Party name (autocomplete) |
| `MainContent_txtacno` | text | Party / Cash A/c # | Account number |
| `MainContent_txtApproval` | text | Approval | Approval reference |
| `MainContent_txtntnno` | text | NTN | NTN number |
| `MainContent_txtcnic` | text | CNIC | CNIC number |
| `MainContent_TxtRefaceName` | text | Stock A/c Name | Stock account name |
| `MainContent_txtrefacno` | text | Stock A/c # | Stock account number |
| `MainContent_txtdescription` | text | Description | Bill description/narration |

#### BILL LINE ITEM FIELDS
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtsno` | text | Sr # | Serial/line number |
| `MainContent_TxtItemName` | text | Item Name | Item name (autocomplete) |
| `MainContent_txtItemNo` | text | Item # | Item number |
| `MainContent_txtCartons` | text | Cartons | Number of cartons |
| `MainContent_txtPacks` | text | Packs | Number of packs/units |
| `MainContent_txtRP` | text | R.P | Retail Price (auto-filled from item) |
| `MainContent_txtSaleRate` | text | Rate | Sale rate (auto-filled, editable) |
| `MainContent_txtDisc` | text | Trade Disc % | Trade discount percentage |
| `MainContent_txtTO` | text | TO | Trade Offer |
| `MainContent_txtSTPercentage` | text | ST% | Sales Tax percentage |
| `MainContent_txtFTPercentage` | text | F-ST% | Further ST percentage |
| `MainContent_txtFEDPercentage` | text | FED% | Federal Excise Duty % |
| `MainContent_txtADVPercentage` | text | ADV.% | Advance Tax % |
| `MainContent_txtgsttype` | text | GST Type | GST type (auto-filled) |
| `MainContent_txthscode` | text | HS Code | HS code (auto-filled) |
| `MainContent_txtPcsPerCtn` | text | Pcs/Ctn | Pieces per carton (auto-filled) |
| `MainContent_txtBalQty` | text | Bal.Qty | Balance quantity |

#### LINE ITEM BUTTONS
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_bttnSaveEntry` | submit | Save Entry | Saves current line item to bill |
| `MainContent_bttnDeleteEntry` | submit | Delete Entry | Deletes selected line item |

#### BILL TOTALS SECTION
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtTotalCtns` | text | Total Ctns | Sum of all cartons |
| `MainContent_txtTotalPcs` | text | Total Pcs | Sum of all pieces |
| `MainContent_txtTotalAmount` | text | Total Amount | Sum of line amounts |
| `MainContent_txtdisamount` | text | Disc. Amt | Total discount amount |
| `MainContent_txtToAmt` | text | To.Amt | Amount after trade offer |
| `MainContent_txtSTAmt` | text | GST | GST amount |
| `MainContent_txtFTAmt` | text | F.Tax | Further tax amount |
| `MainContent_txtFEDAmt` | text | FED | FED amount |
| `MainContent_txtADVTAmt` | text | ADV.Tax | Advance tax amount |
| `MainContent_txtTotalAmtInclSt` | text | Net.Amt | Net amount including all taxes |
| `MainContent_txtPrevBal` | text | Prev. Balance | Previous balance of the party |

#### BILL ACTION BUTTONS
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_bttnNewBill` | submit | New Bill | Creates new blank bill |
| `MainContent_bttnDeleteBill` | submit | Delete Bill | Deletes entire bill |
| `MainContent_bttnUpdateBill` | submit | Update Bill | Updates/saves entire bill |
| `MainContent_bttnPrint` | submit | Print | Prints the bill |
| `MainContent_bttnBack` | submit | Back | Returns to MainPage |

#### BILL LINE ITEM CALCULATION LOGIC
```
For each line item:
  Amount = Packs * Rate
  Discount Amount = Amount * (Trade_Disc / 100)
  After TO = Amount - Discount_Amount
  ST Amount = After_TO * (ST% / 100)
  FT Amount = After_TO * (F-ST% / 100)
  FED Amount = After_TO * (FED% / 100)
  ADV Tax = After_TO * (ADV% / 100)
  Net Amount = After_TO + ST + FT + FED + ADV_Tax

Bill Totals:
  Total Ctns = SUM(Line_Cartons)
  Total Pcs = SUM(Line_Packs)
  Total Amount = SUM(Line_Amounts)
  Total Discount = SUM(Line_Discounts)
  Total After TO = SUM(Line_After_TO)
  Total ST = SUM(Line_ST)
  Total FT = SUM(Line_FT)
  Total FED = SUM(Line_FED)
  Total ADV = SUM(Line_ADV)
  Net Bill Amount = Total_After_TO + Total_ST + Total_FT + Total_FED + Total_ADV
  Final Net = Net_Bill_Amount + Prev_Balance
```

#### BILL GridView (Line Items)
| Column | Field | Description |
|--------|-------|-------------|
| Sr # | Numeric | Serial number |
| Item | Text | Item name |
| Item # | Numeric | Item number |
| Cartons | Numeric | Cartons |
| Packs | Numeric | Pieces/units |
| R.P | Decimal | Retail price |
| Rate | Decimal | Sale rate |
| Trade.Disc | Decimal | Trade discount % |
| TO | Numeric | Trade offer |
| ST% | Decimal | Sales tax % |
| F-ST% | Decimal | Further ST % |
| FED% | Decimal | FED % |
| Adv.% | Decimal | Advance tax % |
| GST Type | Text | GST type |
| HS Code | Text | HS code |
| Pcs/Ctn | Numeric | Pieces per carton |
| Bal.Qty | Numeric | Balance quantity |
| Amount | Decimal | Line amount |
| Disc. Amt | Decimal | Discount amount |
| To.Amt | Decimal | After trade offer |
| GST | Decimal | GST amount |
| F.Tax | Decimal | Further tax |
| FED | Decimal | FED amount |
| ADV.Tax | Decimal | Advance tax |
| Net.Amt | Decimal | Net amount |

#### Voucher Type Behavior
| Type | Name | Effect on Stock | Effect on Accounts |
|------|------|-----------------|-------------------|
| SV | Sale Voucher | Decreases stock | Creates receivable |
| PV | Purchase Voucher | Increases stock | Creates payable |
| SRV | Sale Return Voucher | Increases stock | Reduces receivable |
| PRV | Purchase Return Voucher | Decreases stock | Reduces payable |

---

### 6.2 LIST OF BILLS (`ListofBills.aspx`)

#### Filter Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_cmbvtype` | select | Voucher Type | Options: SV, PV, SRV, PRV |
| `MainContent_txtDate1` | text | From Date | Start date |
| `MainContent_txtDate2` | text | To Date | End date |
| `MainContent_TxtAcName` | text | Party Name | Party name search |
| `MainContent_txtacno` | text | Party A/c # | Account number |
| `MainContent_TxtItemName` | text | Item Name | Item search |
| `MainContent_txtItemNo` | text | Item # | Item number |
| `MainContent_cmbacname` | select | Sale Man | Options: -Select Sale Man-, SHAHID IQBAL, AMEER HAMZA, SHAHZAD AMIR, ASIF RIAZ |
| `MainContent_txtSmno` | text | Sale Man # | Hidden field |

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `MainContent_bttnRefresh` | submit | Refresh | Loads report |
| `MainContent_bttnRefresh4` | submit | Refresh4 | Refresh variant |
| `MainContent_bttnRefresh3` | submit | Refresh3 | Refresh variant |
| `MainContent_Button2` | submit | Button2 | Additional filter |
| `MainContent_Button5` | submit | Button5 | Additional filter |
| `MainContent_bttnBack` | submit | Back | Returns to MainPage |

---

## 7. STOCK MODULE

---

### 7.1 ITEM LEDGER (`ItemLedger.aspx`)

#### Filter Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtDate1` | text | From Date | Start date |
| `MainContent_txtDate2` | text | To Date | End date |
| `MainContent_TxtItemName` | text | Item Name | Item name search |
| `MainContent_txtItemNo` | text | Item # | Item number |

#### Buttons
| Button ID | Type | Text |
|-----------|------|------|
| `MainContent_bttnRefresh` | submit | Refresh |
| `MainContent_bttnBack` | submit | Back |

---

### 7.2 STOCK BALANCE (`StockBalance.aspx`)

#### Filter Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtItemNo1` | text | From Item# | Starting item |
| `MainContent_TxtItemNo2` | text | To Item# | Ending item |
| `MainContent_txtDate1` | text | From Date | Start date |
| `MainContent_txtDate2` | text | To Date | End date |

#### Buttons
| Button ID | Type | Text |
|-----------|------|------|
| `MainContent_bttnRefresh` | submit | Refresh |
| `MainContent_Button1` | submit | Button1 |
| `MainContent_Button2` | submit | Button2 |
| `MainContent_PrintButton` | submit | Print |
| `MainContent_bttnBack` | submit | Back |

---

### 7.3 STOCK BALANCE WITH ACTIVITY (`StockBWA.aspx`)

#### Filter Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `MainContent_txtItemNo1` | text | From Item# | Starting item |
| `MainContent_TxtItemNo2` | text | To Item# | Ending item |
| `MainContent_txtDate1` | text | From Date | Start date |
| `MainContent_txtDate2` | text | To Date | End date |

#### Buttons
| Button ID | Type | Text |
|-----------|------|------|
| `MainContent_Button1` | submit | Refresh |
| `MainContent_Button2` | submit | Back |

---

## 8. UTILITIES MODULE

---

### 8.1 CHANGE PASSWORD (`ChangePassword.aspx`)

#### Form Fields
| Field ID | Type | Name | Description |
|----------|------|------|-------------|
| `TxtUserName` | text | Username | Current username |
| `txtOldPassword` | text | Old Password | Current password |
| `txtNewPassword` | text | New Password | New password |
| `txtConfirmNewPassword` | text | Confirm Password | Confirm new password |

#### Buttons
| Button ID | Type | Text | Behavior |
|-----------|------|------|----------|
| `ImageButton1` | image (submit) | Save | Saves new password |
| `ImageButton2` | image (submit) | Cancel | Cancels operation |

---

### 8.2 CREATE NEW USER
- Triggered via PostBack: `"Utilities\Create New User"`
- Creates new user accounts in the system

---

## 9. COMMON PATTERNS & BEHAVIORS

### 9.1 Autocomplete/Search Pattern
- Text fields like `TxtAcName`, `TxtItemName` use autocomplete
- Typing triggers a PostBack or JavaScript lookup
- Associated hidden/linked fields: `txtacno`, `txtItemNo`
- Pattern: Name field triggers lookup -> populates Number field

### 9.2 GridView Row Selection
- Each row has a "Select" button/link
- Clicking populates the form fields above
- Hidden fields carry the full row data

### 9.3 Date Picker
- Date fields use `Button2` (image button) for date picker
- Date format: DD/MM/YYYY or system default

### 9.4 Voucher Number Auto-Generation
- Voucher numbers are auto-generated on PostBack
- Pattern: txtvno field gets populated after button click

### 9.5 Form Navigation Pattern
- Save button: saves current record
- Delete button: deletes current record
- Back button: navigates to MainPage.aspx
- Print button: opens print dialog/report

### 9.6 PostBack Navigation
- Menu items use `__doPostBack('ctl00$NavigationMenu', 'Entries')` style
- The event argument specifies the menu section
- Server processes the postback and renders the appropriate page

---

## 10. DATABASE SCHEMA (INFERRED)

### Tables
1. **Main_Heads** - Account main head categories
2. **Accounts** - Chart of accounts / parties
3. **Item_Super_Heads** - Item super categories
4. **Item_Main_Heads** - Item main categories
5. **Items** - Product/item master
6. **Sale_Men** - Salesman master
7. **Vouchers** - Journal/Cash book vouchers
8. **Voucher_Lines** - Voucher line items
9. **Bills** - Sale/Purchase bill headers
10. **Bill_Lines** - Sale/Purchase bill line items
11. **Users** - System users
12. **Stock_Transactions** - Stock movement records

### Key Relationships
```
Main_Heads (1) -> (Many) Accounts
Item_Super_Heads (1) -> (Many) Item_Main_Heads
Item_Main_Heads (1) -> (Many) Items
Sale_Men (1) -> (Many) Bills
Accounts (1) -> (Many) Vouchers
Accounts (1) -> (Many) Bills
Items (1) -> (Many) Bill_Lines
Vouchers (1) -> (Many) Voucher_Lines
Bills (1) -> (Many) Bill_Lines
```

---

## 11. TAX CALCULATION FORMULAS

### Pakistan Sales Tax (ST)
```
ST Amount = (Amount after discount) * (ST% / 100)
```

### Federal Excise Duty (FED)
```
FED Amount = (Amount after discount) * (FED% / 100)
```

### Advance Tax (ADV)
```
ADV Tax = (Amount after discount) * (ADV% / 100)
```

### Further Sales Tax (F-ST)
```
FT Amount = (Amount after discount) * (F-ST% / 100)
```

### Net Amount Calculation
```
Base Amount = Quantity * Rate
Discount = Base Amount * (Trade Disc% / 100)
After Discount = Base Amount - Discount
GST = After Discount * (GST% / 100)
ST = After Discount * (ST% / 100)
FT = After Discount * (F-ST% / 100)
FED = After Discount * (FED% / 100)
ADV = After Discount * (ADV% / 100)
Net Amount = After Discount + ST + FT + FED + ADV
```

---

*Extracted from Global Distribution Services (MotherCare) - http://38.92.47.89:8026/*
*Complete system logic for wholesale distribution software development*
