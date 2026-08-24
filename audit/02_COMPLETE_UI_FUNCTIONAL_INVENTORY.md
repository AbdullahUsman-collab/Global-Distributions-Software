# 02 — COMPLETE UI FUNCTIONAL INVENTORY

## Screen-by-Screen Functional Audit

---

### SCREEN 01: LOGIN (Default.aspx)
**Purpose:** Authentication gateway
**Route:** Default.aspx (root)
**Parent Module:** System

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| TxtUserName | text | Yes | Login username |
| txtPassWord | password | Yes | Login password |

**Buttons:**
| Button | Type | Action | Result |
|--------|------|--------|--------|
| ImageButton1 | image submit | POST credentials | On success → MainPage.aspx; On failure → error in lblmessage |

**Labels:**
| Label | Purpose |
|-------|---------|
| lblmessage | Displays authentication error (Red, X-Large font) |

**Behavior:**
- POST form data to self
- Session created on successful auth
- ViewState/EventValidation regenerated
- No CAPTCHA observed
- No rate limiting observed
- No "Remember me" option
- No "Forgot password" link

---

### SCREEN 02: HOME PAGE (MainPage.aspx)
**Purpose:** Dashboard / navigation hub
**Route:** MainPage.aspx
**Parent Module:** System

**Display Fields:**
| Field | Type | Description |
|-------|------|-------------|
| MainContent_lbluser | Label | Logged-in username |
| MainContent_lblcompany | Label | Company scope (e.g., "All") |

**Navigation:** Horizontal CSS menu with 6 modules (see 01_COMPLETE_NAVIGATION.md)

---

### SCREEN 03: ACCOUNTS MAIN HEAD (MainHeads.aspx)
**Purpose:** Create/edit/delete account main head categories
**Route:** MainHeads.aspx
**Parent Module:** Add → Financial Masters

**Fields:**
| Field | ID | Type | Required | Description |
|-------|----|------|----------|-------------|
| Head # | MainContent_txtmhno | text | Yes | Numeric code (e.g., 1, 100, 200). Has onchange PostBack |
| Main Head Name | MainContent_txtmhname | text | Yes | Category name |
| Sale Man # | MainContent_txtSmno | text | No | Auto-populated, disabled/read-only |
| Effect | MainContent_DDLEffect | select | Yes | Options: Balance Sheet, Profit and Loss, Both |
| Sale Man | MainContent_cmbacname | select | No | Options: -Select Sale Man-, [salesman list] |
| Day | MainContent_cmbDay | select | No | Options: -Select-, Friday through Thursday |

**Buttons:**
| Button | Action | Behavior |
|--------|--------|----------|
| bttnsave | Save | Saves/updates main head record |
| bttndelete | Delete | Deletes selected main head record |
| bttnback | Back | Navigate to MainPage.aspx |

**GridView:**
| Column | Field | Description |
|--------|-------|-------------|
| Select | Button | Row selection — populates form fields |
| Main_Head_No | Numeric | Unique code |
| Main_Head_Name | Text | Category name |
| Effect | Text | Balance Sheet / Profit and Loss / Both |
| SP_ID | Numeric | Sale Man ID (0 = none) |
| SP_Name | Text | Sale Man name |
| Day | Text | Day assignment |

**Logic:**
- txtmhno has onchange PostBack — likely validates uniqueness on change
- txtSmno is disabled — auto-populated when cmbacname changes
- GridView rows are clickable — selecting a row populates all form fields
- Save performs INSERT or UPDATE depending on whether record exists
- Delete removes the record (may be blocked if referenced by Accounts)

---

### SCREEN 04: ACCOUNTS (Accounts.aspx)
**Purpose:** Create/edit/delete account (party) records
**Route:** Accounts.aspx
**Parent Module:** Add → Financial Masters

**Fields:**
| Field | ID | Type | Required | Description |
|-------|----|------|----------|-------------|
| Main Head | MainContent_cmbMainHead | select | Yes | Dropdown of all Main Heads |
| Code | MainContent_txtCode | text | No | Search/lookup code |
| Account # | MainContent_txtacno | text | Yes | Unique account number |
| Account Name | MainContent_txtacname | text | Yes | Party/account name |
| Address | MainContent_txtaddress | text | No | Physical address |
| Owner Name | MainContent_txtOwnerName | text | No | Owner/contact name |
| Mobile | MainContent_txtMobile | text | No | Phone number |
| STN | MainContent_txtStn | text | No | Sales Tax Number |
| NTN | MainContent_txtNtn | text | No | National Tax Number |
| CNIC | (inferred) | text | No | CNIC (from GridView) |
| Approval | MainContent_txtapproval | text | No | Approval reference |

**Buttons:**
| Button | Action | Behavior |
|--------|--------|----------|
| bttnSave | Save | Saves/updates account |
| bttnDelete | Delete | Deletes account |
| bttnPrint | Print | Prints account list |
| bttnBack | Back | Navigate to MainPage.aspx |

**GridView Columns:**
Select, Ac_No, Ac_Name, Address, owner_name, phone, STN, NTN, CNIC, Main_HeadNo

**Logic:**
- cmbMainHead determines the account category
- txtCode enables search by code
- GridView row click populates all fields
- Account number appears auto-generated or manually entered
- CNIC field visible in grid but not in form (may be hidden or inherited)

---

### SCREEN 05: ITEM SUPER HEADS (ItemSuperHead.aspx)
**Purpose:** Manage item super-category hierarchy
**Route:** ItemSuperHead.aspx
**Parent Module:** Add → Product Masters

**Fields:**
| Field | ID | Type | Required |
|-------|----|------|----------|
| Super Head # | MainContent_txtSHNo | text | Yes |
| Super Head Name | MainContent_txtSHName | text | Yes |

**Buttons:** Save, Delete, Back, Edit (Button1)

**GridView:** Select, SH_No, SH_Name

---

### SCREEN 06: ITEM MAIN HEADS (ItemMainHeads.aspx)
**Purpose:** Manage item main-category hierarchy (under Super Heads)
**Route:** ItemMainHeads.aspx
**Parent Module:** Add → Product Masters

**Fields:**
| Field | ID | Type | Required |
|-------|----|------|----------|
| Super Head | MainContent_CmbItemSuperHeads | select | Yes |
| Code | MainContent_txtCode | text | No (search) |
| Main Head # | MainContent_txtITHNo | text | Yes |
| Main Head Name | MainContent_txtITHName | text | Yes |

**Buttons:** Save, Delete, Back, Print

**GridView:** Select, Item_MainHeadNo, Item_MainHeadName, SH_No

---

### SCREEN 07: ITEMS (Items.aspx)
**Purpose:** Create/edit/delete product items
**Route:** Items.aspx
**Parent Module:** Add → Product Masters

**Fields:**
| Field | ID | Type | Required | Description |
|-------|----|------|----------|-------------|
| Main Head # | MainContent_txtItemMHNo | text | Yes | Auto-populated from dropdown |
| Item Main Head | MainContent_CmbItemMHeads | select | Yes | Category dropdown |
| Item # | MainContent_txtIemNo | text | Yes | Unique item number |
| Item Name | MainContent_txtItemName | text | Yes | Full product name |
| Units | MainContent_cmbunits | text | Yes | Unit of measure |
| Pcs per Ctn | MainContent_txtltrperpack | text | Yes | Pieces per carton |
| Retail Price | MainContent_txtretailprice | text | Yes | MRP/retail price |
| Purchase Rate | MainContent_txtitempurchaserate | text | Yes | Cost/purchase price |
| Sale Rate | MainContent_txtitemsalerate | text | Yes | Selling price |
| Trade Discount % | MainContent_txtDis | text | No | Default trade discount |
| Trade Offer | MainContent_txtTO | text | No | Trade offer code/qty |
| Min Qty | MainContent_txtMinQty | text | No | Minimum order quantity |
| HS Code | MainContent_txtHSCode | text | No | Harmonized System code |
| GST Type | MainContent_DDTaxtype | select | No | Options: VAT, 3RD, 8TH |
| GST % | MainContent_txtGST | text | No | GST percentage |
| FED % | MainContent_txtFED | text | No | Federal Excise Duty % |
| ADV Tax Purchase % | MainContent_txtAdvTax_Pur | text | No | Advance tax on purchase |
| ADV Tax Sale % | MainContent_txtAdvTax_Sale | text | No | Advance tax on sale |

**Buttons:** Save, Delete, Back, Print

**GridView Columns:** Select, Item_No, Item_Name, Item_MainHeadNo, Units, Pcs_PerCtn, Sale_Rate, Purchase_Rate, Retail_Price, Trade_Disc, T_O, Min_Qty, hs_code, gst_type, gst, fed, adv_tax_purchase, adv_tax_sale, Cost_rate

**Logic:**
- Cost_rate is a calculated field (appears in grid but not in form)
- GST Type determines which tax structure applies
- Trade Disc and TO affect billing calculations
- Pcs_PerCtn is used for carton-to-piece conversion in bills

---

### SCREEN 08: SALE MAN (Sale_Man.aspx)
**Purpose:** Manage salesman records
**Route:** Sale_Man.aspx
**Parent Module:** Add → Distribution Masters

**Fields:**
| Field | ID | Type | Required |
|-------|----|------|----------|
| Sale Man # | MainContent_txtmhno | text | Yes |
| Sale Man Name | MainContent_txtmhname | text | Yes |

**Buttons:** Save, Delete, Back

**GridView:** Select, [Sale_Man_ID], [Name]

---

### SCREEN 09: DELETE ITEM & TRANSFER (DelItem.aspx)
**Purpose:** Transfer all data from one item to another, then delete old item
**Route:** DelItem.aspx
**Parent Module:** Add → Data Maintenance

**Fields:**
| Field | ID | Type | Required | Description |
|-------|----|------|----------|-------------|
| Old Item Name | MainContent_TxtItemName | text | Yes | Source item name |
| Old Item # | MainContent_txtitemno1 | text | Yes | Source item number |
| New Item Name | MainContent_TxtItemName2 | text | Yes | Target item name |
| New Item # | MainContent_txtItemno2 | text | Yes | Target item number |

**Buttons:**
| Button | Action |
|--------|--------|
| Button1 | Transfer data from old item to new item |
| Button2 | Delete old item |

**Logic:**
- Transfers: bill lines, stock transactions, ledger entries from old item to new
- Delete: removes old item master record
- NOT VERIFIED — requires write action to confirm exact transfer scope

---

### SCREEN 10: DELETE ACCOUNT & SHIFT (DelAccount.aspx)
**Purpose:** Transfer all data from one account to another, then delete old account
**Route:** DelAccount.aspx
**Parent Module:** Add → Data Maintenance

**Fields:**
| Field | ID | Type | Required |
|-------|----|------|----------|
| Old Account Name | MainContent_TxtAcName | text | Yes |
| Old Account # | MainContent_txtacno | text | Yes |
| New Account Name | MainContent_TxtRefaceName | text | Yes |
| New Account # | MainContent_txtrefacno | text | Yes |

**Buttons:** Button1 (Transfer), Button2 (Delete)

---

### SCREEN 11: ACCOUNT TRANSFER (AcTransfer.aspx)
**Purpose:** Change the main-head category/area of an existing party
**Route:** AcTransfer.aspx
**Parent Module:** Add → Data Maintenance

**Fields:**
| Field | ID | Type | Required | Description |
|-------|----|------|----------|-------------|
| Party Name | MainContent_TxtAcName | text | Yes | Current party |
| Account # | MainContent_txtacno | text | Yes | Current account |
| Current Main Head | MainContent_cmbMainHead | text | Yes | Read-only current category |
| Current Code | MainContent_txtCode | text | Yes | Current area code |
| New Main Head | MainContent_cmbMainHead2 | select | Yes | Target category dropdown |
| New Code | MainContent_txtCode2 | text | Yes | New area code |
| New Account # | MainContent_txtacno2 | text | Yes | New account number |
| New Party Name | MainContent_TxtAcName2 | text | Yes | New name |

**Buttons:** Button1 (Transfer), Button2 (Cancel)

---

### SCREEN 12: JOURNAL ENTRY (Journal.aspx)
**Purpose:** Create/edit journal vouchers (JV, CV, PV, CP, CR)
**Route:** Journal.aspx
**Parent Module:** Entries

**Fields:**
| Field | ID | Type | Required | Description |
|-------|----|------|----------|-------------|
| Voucher Type | MainContent_cmbvtype | select | Yes | JV, CV, PV, CP, CR |
| Voucher # | MainContent_txtvno | text | Yes | Auto-generated |
| Date | MainContent_txtdate | text | Yes | Transaction date |
| Stock Item # | MainContent_txtsno | text | No | Stock reference |
| Account Name | MainContent_TxtAcName | text | Yes | Account (autocomplete) |
| Account # | MainContent_txtacno | text | Yes | Account number |
| Description | MainContent_txtdescription | text | No | Narration |
| Ref Account Name | MainContent_TxtRefaceName | text | Yes | Contra account |
| Ref Account # | MainContent_txtrefacno | text | Yes | Contra account # |
| Debit | MainContent_txtdebit | text | Yes* | Debit amount |
| Credit | MainContent_txtcredit | text | Yes* | Credit amount |

**Totals:**
| Field | Description |
|-------|-------------|
| txttotaldebit | Total debit sum |
| txttotalcredit | Total credit sum |
| txtbalance | Balance (should be 0 when balanced) |

**Buttons:**
| Button | Action |
|--------|--------|
| Button2 | Date picker trigger |
| Button1 | Add line to voucher |
| bttndelentry | Delete selected line |
| bttnNewVoucher | Create new voucher |
| bttnDelVoucher | Delete entire voucher |
| bttnPrint | Print voucher |
| bttnBack | Return to MainPage |

**Voucher Types:**
| Code | Name | Purpose |
|------|------|---------|
| JV | Journal Voucher | General double-entry |
| CV | Cash Voucher | Cash transactions |
| PV | Payment Voucher | Bank payments |
| CP | Cash Payment | Cash disbursement |
| CR | Cash Receipt | Cash receipt |

**Logic:**
- Select voucher type → click New Voucher → get voucher number
- Enter date, account, contra account, description, debit OR credit
- Click Button1 to add line
- Lines accumulate in grid
- Debits must equal Credits for balanced entry
- Balance field shows difference
- Delete Entry removes selected line
- Delete Voucher removes all lines and header

---

### SCREEN 13: CASH BOOK (Cash_Book.aspx)
**Purpose:** Cash receipt/payment entry
**Route:** Cash_Book.aspx
**Parent Module:** Entries

**Fields:**
| Field | ID | Type | Required | Description |
|-------|----|------|----------|-------------|
| Voucher Type | MainContent_cmbvtype | select | Yes | CV, CP, CR |
| Voucher # | MainContent_txtvno | text | Yes | Auto-generated |
| Date | MainContent_txtdate | text | Yes | Transaction date |
| Cash Account # | MainContent_txtacno | text | Yes | Cash account |
| Cash Account Name | MainContent_TxtAcName | text | Yes | Cash account name |
| Opening Balance | MainContent_txtopeningbal | text | Read-only | Display only |
| Ref Account # | MainContent_txtrefacno | text | Yes | Party account |
| Ref Account Name | MainContent_TxtRefaceName | text | Yes | Party name |
| Description | MainContent_txtdescription | text | No | Narration |
| Receive (Db) | MainContent_txtdebit | text | Yes* | Cash received |
| Payment (Cr) | MainContent_txtcredit | text | Yes* | Cash paid |

**Totals:**
| Field | Description |
|-------|-------------|
| txttotaldebit | Total receipts |
| txttotalcredit | Total payments |
| txtclosingbal | Closing balance |

**Buttons:**
| Button | Action |
|--------|--------|
| Button2 | Date picker |
| bttnBack0 | Back action |
| bttnBack1 | Back action |
| bttnSave | Save entry |
| bttnDelete | Delete entry |
| bttnPrint | Print cash book |
| bttnReset | Reset form |
| bttnBack | Return to MainPage |

**Logic:**
- Opening Balance is displayed (read-only) for the cash account
- Closing Balance = Opening Balance + Total Debit - Total Credit
- CV = General cash, CP = Cash Payment, CR = Cash Receipt

---

### SCREEN 14: ENTRIES LIST (JournalEntriesList.aspx)
**Purpose:** View/search all posted vouchers with SSRS report
**Route:** JournalEntriesList.aspx
**Parent Module:** Entries

**Filters:**
| Field | ID | Type | Options |
|-------|----|------|---------|
| Voucher Type | cmbvtype | select | All, JV, CV, PV, SV, CP, CR, PRV, SRV |
| From Date | txtDate1 | text | Date |
| To Date | txtDate2 | text | Date |

**Buttons:** Back, Refresh

**Report:** SSRS ReportViewer with pagination, export (Excel, PDF, Word), find/next

---

### SCREEN 15: SALE/PURCHASE BILL (Sale_Purchase.aspx)
**Purpose:** Create/edit/delete sale and purchase invoices
**Route:** Sale_Purchase.aspx
**Parent Module:** Bills

(See 10_SALES_ENGINE.md and 11_PURCHASE_ENGINE.md for complete details)

---

### SCREEN 16: LIST OF BILLS (ListofBills.aspx)
**Purpose:** Search and view posted bills with SSRS report
**Route:** ListofBills.aspx
**Parent Module:** Bills

**Filters:**
| Field | ID | Type | Options |
|-------|----|------|---------|
| Voucher Type | cmbvtype | select | SV, PV, SRV, PRV |
| From Date | txtDate1 | text | Date |
| To Date | txtDate2 | text | Date |
| Party Name | TxtAcName | text | Autocomplete |
| Party A/c # | txtacno | text | Account number |
| Item Name | TxtItemName | text | Autocomplete |
| Item # | txtItemNo | text | Item number |
| Sale Man | cmbacname | select | -Select Sale Man-, [list] |
| Sale Man # | txtSmno | text | Hidden |

**Buttons:** Back, Refresh, Refresh3, Refresh4, Button2, Button5

---

### SCREEN 17-21: REPORT SCREENS
(See 19_REPORT_ENGINE.md and 20_FINANCIAL_STATEMENTS.md)

---

### SCREEN 22-24: STOCK REPORT SCREENS
(See 07_INVENTORY_ENGINE.md)

---

### SCREEN 25: CHANGE PASSWORD (ChangePassword.aspx)
**Purpose:** Change user password
**Route:** ChangePassword.aspx
**Parent Module:** Utilities

**Fields:**
| Field | ID | Type | Required |
|-------|----|------|----------|
| Username | TxtUserName | text | Yes |
| Old Password | txtOldPassword | text | Yes |
| New Password | txtNewPassword | text | Yes |
| Confirm Password | txtConfirmNewPassword | text | Yes |

**Buttons:** ImageButton1 (Save), ImageButton2 (Cancel)

**Logic:**
- Username must match current session
- Old password verified against database
- New password must match confirmation
- NOT VERIFIED — requires write action
