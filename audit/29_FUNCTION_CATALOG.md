# 29 — FUNCTION CATALOG

## Master Data Functions

### CREATE_MAIN_HEAD
- **Purpose:** Create account main head category
- **Inputs:** Code (numeric), Name, Effect (BS/P&L/Both), Sale Man (optional), Day (optional)
- **Required:** Code, Name, Effect
- **Preconditions:** User logged in
- **Validation:** Code must be unique
- **Result:** New main head record created
- **Accounting Effect:** None
- **Inventory Effect:** None
- **Permissions:** Administrator

### CREATE_ACCOUNT
- **Purpose:** Create party/account record
- **Inputs:** Main Head, Account #, Name, Address, Owner, Phone, STN, NTN, CNIC
- **Required:** Main Head, Account #, Name
- **Preconditions:** Main Head exists
- **Validation:** Account # must be unique
- **Result:** New account record created
- **Accounting Effect:** None (opening balance set separately)
- **Inventory Effect:** None
- **Permissions:** Administrator

### CREATE_ITEM_SUPER_HEAD
- **Purpose:** Create product super-category
- **Inputs:** Code, Name
- **Required:** Code, Name
- **Result:** New super head record

### CREATE_ITEM_MAIN_HEAD
- **Purpose:** Create product main-category
- **Inputs:** Super Head, Code, Name
- **Required:** Super Head, Code, Name
- **Result:** New main head record linked to super head

### CREATE_ITEM
- **Purpose:** Create product item
- **Inputs:** Main Head #, Item #, Name, Units, Pcs/Ctn, Retail Price, Purchase Rate, Sale Rate, Trade Disc, TO, Min Qty, HS Code, GST Type, GST%, FED%, ADV Tax Purchase%, ADV Tax Sale%
- **Required:** Main Head, Item #, Name, Units, Pcs/Ctn, Rates
- **Result:** New item record with pricing and tax configuration
- **Accounting Effect:** None
- **Inventory Effect:** None (opening stock set separately)

### CREATE_SALE_MAN
- **Purpose:** Create salesman record
- **Inputs:** ID, Name
- **Required:** ID, Name
- **Result:** New salesman record

---

## Transaction Functions

### NEW_JOURNAL_VOUCHER
- **Purpose:** Create new journal voucher
- **Inputs:** Voucher Type (JV/CV/PV/CP/CR), Date
- **Required:** Voucher Type, Date
- **Result:** New voucher header with auto-generated number
- **Accounting Effect:** None until lines added

### ADD_JOURNAL_LINE
- **Purpose:** Add line to journal voucher
- **Inputs:** Account, Description, Reference Account, Debit OR Credit
- **Required:** Account, (Debit OR Credit)
- **Result:** Line added to voucher grid
- **Accounting Effect:** Pending (saved when voucher saved)
- **Validation:** Debit and Credit cannot both be non-zero on same line

### DELETE_JOURNAL_LINE
- **Purpose:** Remove line from voucher
- **Inputs:** Line number/selection
- **Result:** Line removed from grid

### DELETE_JOURNAL_VOUCHER
- **Purpose:** Delete entire voucher and all lines
- **Inputs:** Voucher number
- **Result:** Voucher and all lines deleted
- **Accounting Effect:** Reverses all entries (if posted)

### NEW_CASH_BOOK_ENTRY
- **Purpose:** Create cash book entry
- **Inputs:** Voucher Type (CV/CP/CR), Date, Cash Account, Party Account, Description, Amount (Debit or Credit)
- **Required:** Cash Account, Date, Amount
- **Result:** Cash entry saved
- **Accounting Effect:** Cash balance updated, Party balance updated

### NEW_SALE_BILL
- **Purpose:** Create new sale invoice
- **Inputs:** Date, Sale Man, Day, Party Account, Stock Account, Description
- **Required:** Date, Party Account, Stock Account
- **Result:** New bill with auto-generated number

### ADD_BILL_LINE
- **Purpose:** Add item line to bill
- **Inputs:** Item, Cartons, Packs, Rate, Trade Disc%, Tax percentages
- **Required:** Item, Quantity, Rate
- **Result:** Line added to bill with calculated amounts
- **Calculation:** Amount = Packs x Rate, Discount, Tax, Net

### SAVE_BILL
- **Purpose:** Save/commit entire bill
- **Inputs:** All header and line data
- **Result:** Bill saved to database
- **Accounting Effect:**
  - Customer/Supplier balance updated
  - Stock quantity updated
  - Accounting entries created
  - Ledger entries created

### DELETE_BILL
- **Purpose:** Delete entire bill
- **Inputs:** Bill number
- **Result:** Bill and all lines deleted
- **Accounting Effect:** All effects reversed

### NEW_PURCHASE_BILL
- **Purpose:** Create new purchase invoice
- **Same as sale bill** with voucher type = PV
- **Accounting Effect:** Stock increases, Supplier payable increases

### RETURN_SALE
- **Purpose:** Process customer return
- **Inputs:** Same as sale bill with voucher type = SRV
- **Accounting Effect:** Stock increases, Customer receivable decreases

### RETURN_PURCHASE
- **Purpose:** Process return to supplier
- **Inputs:** Same as purchase bill with voucher type = PRV
- **Accounting Effect:** Stock decreases, Supplier payable decreases

---

## Data Maintenance Functions

### DELETE_ITEM_TRANSFER
- **Purpose:** Transfer all data from old item to new item then delete old
- **Inputs:** Old Item #, Old Item Name, New Item #, New Name
- **Result:** All transactions transferred, old item deleted

### DELETE_ACCOUNT_TRANSFER
- **Purpose:** Transfer all data from old account to new account then delete old
- **Inputs:** Old Account #, Old Name, New Account #, New Name
- **Result:** All transactions transferred, old account deleted

### CHANGE_PARTY_AREA
- **Purpose:** Change the main head/area of a party
- **Inputs:** Party Account #, New Main Head, New Code, New Account #, New Name
- **Result:** Account moved to new category

---

## Report Functions

### VIEW_LEDGER
- **Purpose:** View account transaction history
- **Inputs:** Account #, Type (Normal/Sales Tax), Date Range
- **Output:** Transaction list with running balance

### VIEW_TRIAL_BALANCE
- **Purpose:** View debit/credit totals
- **Inputs:** Account Range, Date Range, Main Head
- **Output:** Account totals (must balance)

### VIEW_BALANCE_SHEET
- **Purpose:** View financial position
- **Inputs:** Account Range, Date Range
- **Output:** Assets = Liabilities + Equity

### VIEW_PROFIT_LOSS
- **Purpose:** View profitability
- **Inputs:** Account Range, Date Range
- **Output:** Income - Expenses = Profit/Loss

### VIEW_AGING
- **Purpose:** View outstanding by age
- **Inputs:** Account Range, Date, Main Head
- **Output:** Outstanding amounts by age buckets

### VIEW_ENTRIES_LIST
- **Purpose:** View all vouchers
- **Inputs:** Voucher Type, Date Range
- **Output:** List of all vouchers

### VIEW_BILLS_LIST
- **Purpose:** View all bills
- **Inputs:** Voucher Type, Date Range, Party, Item, Sale Man
- **Output:** List of all bills

### VIEW_ITEM_LEDGER
- **Purpose:** View item transaction history
- **Inputs:** Item, Date Range
- **Output:** Item transactions

### VIEW_STOCK_BALANCE
- **Purpose:** View current stock quantities
- **Inputs:** Item Range, Date Range
- **Output:** Stock quantities and values

---

## Utility Functions

### LOGIN
- **Purpose:** Authenticate user
- **Inputs:** Username, Password
- **Validation:** Credentials match database
- **Result:** Session created, redirect to home

### LOGOUT
- **Purpose:** End session
- **Result:** Session destroyed, redirect to login

### CHANGE_PASSWORD
- **Purpose:** Change user password
- **Inputs:** Username, Old Password, New Password, Confirm Password
- **Validation:** Old password matches, New = Confirm
- **Result:** Password updated

### CREATE_USER
- **Purpose:** Create new system user
- **Inputs:** Unknown (form not directly accessible)
- **Result:** New user account created

---

## Second-Pass Verified Functions

### SEARCH_ACCOUNT_BY_NAME
- **Purpose:** Search accounts by name (AJAX autocomplete)
- **Method:** Searchacname WebMethod (AJAX)
- **Inputs:** Search prefix (minimum 1 character)
- **Output:** Matching account names
- **Pages:** Sale_Purchase.aspx, Journal.aspx, Cash_Book.aspx

### SEARCH_ACCOUNT_BY_REF_NAME
- **Purpose:** Search reference/contra accounts (AJAX autocomplete)
- **Method:** SearchRefacname WebMethod (AJAX)
- **Inputs:** Search prefix (minimum 1 character)
- **Output:** Matching reference account names
- **Pages:** Sale_Purchase.aspx

### SEARCH_CUSTOMERS
- **Purpose:** Search customers (AJAX autocomplete)
- **Method:** SearchCustomers WebMethod (AJAX)
- **Inputs:** Search prefix (minimum 1 character)
- **Output:** Matching customer names
- **Pages:** Sale_Purchase.aspx

### LOAD_ACCOUNT_DETAILS
- **Purpose:** Load account details on selection
- **Trigger:** PostBack on TxtAcName, txtntnno, txtcnic change
- **Inputs:** Account name, NTN, or CNIC
- **Output:** Account details (NTN, CNIC, address, phone, email, previous balance)
- **Pages:** Sale_Purchase.aspx

### LOAD_ITEM_DETAILS
- **Purpose:** Load item details on selection
- **Trigger:** PostBack on TxtItemName, txtItemNo change
- **Inputs:** Item name or item number
- **Output:** Item details (packs, rate, cost, tax rates, HS code)
- **Pages:** Sale_Purchase.aspx

### CALCULATE_TOTAL_AMOUNT
- **Purpose:** Recalculate total amount on change
- **Trigger:** PostBack on txtTotalAmount change
- **Inputs:** Total amount value
- **Output:** Recalculated line items and totals
- **Pages:** Sale_Purchase.aspx

### CALCULATE_TAX_AMOUNTS
- **Purpose:** Recalculate tax amounts on change
- **Trigger:** PostBack on txtSTAmt, txtFTAmt, txtFEDAmt, txtADVTAmt change
- **Inputs:** Tax amounts
- **Output:** Recalculated tax totals
- **Pages:** Sale_Purchase.aspx

### CALCULATE_COST_RATE
- **Purpose:** Calculate cost rate (stored field)
- **Method:** Weighted average or moving average
- **Inputs:** Purchase history, quantities, rates
- **Output:** Cost_rate (stored in database)
- **Pages:** Items.aspx (GridView only, no input field)
