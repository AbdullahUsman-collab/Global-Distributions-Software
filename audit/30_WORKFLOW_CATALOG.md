# 30 — WORKFLOW CATALOG

## WORKFLOW: CREDIT SALE

1. User navigates to Sale/Purchase Bill
2. Select Voucher Type = SV (Sale Voucher)
3. Click "New Bill" — system generates bill number
4. Enter bill date
5. Select Sale Man from dropdown
6. Select Day of week
7. Enter/select Party (Customer) account — system shows customer name, mobile, NTN, CNIC
8. Enter/select Stock Account
9. Enter description (optional)
10. **For each item:**
    a. Enter/select Item — system auto-fills Rate, Pcs/Ctn, Tax%, GST Type, HS Code
    b. Enter Cartons and/or Packs (quantity)
    c. System calculates: Amount = Packs x Rate
    d. Enter Trade Discount % (if different from default)
    e. System calculates: Discount, After Discount, Tax amounts, Net Amount
    f. Click "Save Entry" — line added to grid
11. Review totals: Total Ctns, Total Pcs, Total Amount, Discounts, Taxes, Net Amount
12. Review Previous Balance displayed
13. Click "Update Bill" — bill saved
14. **System effects (INFERRED):**
    a. Customer receivable increased by Net Amount
    b. Stock decreased by sold quantity
    c. Sales income credited
    d. Tax payable credited
    e. COGS debited
    f. Inventory credited at cost
15. Click "Print" to generate invoice

## WORKFLOW: CASH SALE

Same as Credit Sale but:
- Party = Cash Account instead of customer
- No receivable tracking
- Cash receipt recorded simultaneously

## WORKFLOW: PURCHASE

1. Navigate to Sale/Purchase Bill
2. Select Voucher Type = PV (Purchase Voucher)
3. Click "New Bill"
4. Enter date, select Sale Man
5. Enter/select Supplier account
6. Enter Stock Account
7. Add items with quantities and rates
8. Click "Update Bill"
9. **System effects (INFERRED):**
    a. Stock increased by purchased quantity
    b. Supplier payable increased
    c. Purchase cost debited to inventory
    d. Tax input debited

## WORKFLOW: SALE RETURN

1. Navigate to Sale/Purchase Bill
2. Select Voucher Type = SRV (Sale Return Voucher)
3. Click "New Bill"
4. Enter date
5. Select original Customer account
6. Add returned items with quantities
7. Click "Update Bill"
8. **System effects (INFERRED):**
    a. Stock increased by returned quantity
    b. Customer receivable decreased
    c. Sales return debited
    d. Tax payable adjusted

## WORKFLOW: PURCHASE RETURN

1. Navigate to Sale/Purchase Bill
2. Select Voucher Type = PRV (Purchase Return Voucher)
3. Click "New Bill"
4. Enter date
5. Select original Supplier account
6. Add returned items
7. Click "Update Bill"
8. **System effects (INFERRED):**
    a. Stock decreased by returned quantity
    b. Supplier payable decreased

## WORKFLOW: CUSTOMER PAYMENT (CASH RECEIPT)

1. Navigate to Journal Entry or Cash Book
2. Select Voucher Type = CR (Cash Receipt)
3. Click "New Voucher" / enter new entry
4. Enter date
5. Select Cash Account (debit side)
6. Select Customer Account (credit side)
7. Enter amount in Credit field
8. Enter description
9. Click "Add Line" / "Save"
10. **System effects:**
    a. Cash balance increased
    b. Customer receivable decreased
    c. Customer ledger updated

## WORKFLOW: SUPPLIER PAYMENT (CASH PAYMENT)

1. Navigate to Journal Entry or Cash Book
2. Select Voucher Type = CP (Cash Payment)
3. Enter date
4. Select Supplier Account (debit side)
5. Select Cash Account (credit side)
6. Enter amount in Debit field
7. Enter description
8. Click "Save"
9. **System effects:**
    a. Cash balance decreased
    b. Supplier payable decreased

## WORKFLOW: JOURNAL ADJUSTMENT

1. Navigate to Journal Entry
2. Select Voucher Type = JV (Journal Voucher)
3. Click "New Voucher"
4. Enter date
5. **For each adjustment line:**
    a. Select Account A
    b. Enter Debit amount
    c. Select Contra Account B
    d. Click "Add Line"
6. Add corresponding Credit line
7. Verify Balance = 0
8. Voucher saved
9. **System effects:** Both account balances adjusted

## WORKFLOW: EXPENSE PAYMENT

1. Navigate to Journal Entry or Cash Book
2. Select Voucher Type = CP (Cash Payment)
3. Enter date
4. Select Expense Account (debit)
5. Select Cash Account (credit)
6. Enter amount and description
7. Click "Save"
8. **System effects:**
    a. Expense increased
    b. Cash decreased

## WORKFLOW: NEW PRODUCT CREATION

1. Navigate to Add -> Items
2. Select Item Main Head from dropdown
3. Enter Item # (unique)
4. Enter Item Name
5. Enter Units, Pcs per Carton
6. Enter Purchase Rate, Sale Rate, Retail Price
7. Configure Trade Discount, Trade Offer
8. Set HS Code, GST Type, Tax percentages
9. Click "Save"
10. Item available for billing

## WORKFLOW: NEW CUSTOMER CREATION

1. Navigate to Add -> Accounts
2. Select Main Head = DEBITORS (500)
3. Enter Account # (unique)
4. Enter Account Name
5. Enter Address, Owner Name, Phone
6. Enter STN, NTN, CNIC (optional)
7. Click "Save"
8. Customer available for billing

## WORKFLOW: FINANCIAL REPORTING

1. User navigates to Reports module
2. Select report type (Ledger/Trial Balance/Balance Sheet/P&L/Aging)
3. Enter filter criteria (account range, date range, main head)
4. Click "Refresh"
5. SSRS report renders with data
6. User can:
    a. Navigate pages
    b. Search within report
    c. Export to Excel/PDF/Word
    d. Print

## Second-Pass Verified Workflows

### WORKFLOW: AJAX ACCOUNT SEARCH (VERIFIED)
1. User types in TxtAcName field (account name)
2. AutoCompleteExtender triggers on each keystroke (minimum 1 character)
3. AJAX call to Searchacname WebMethod
4. Server returns matching account names
5. User selects from autocomplete dropdown
6. PostBack triggers, loading account details (NTN, CNIC, address, phone, email, previous balance)

### WORKFLOW: AJAX ITEM SEARCH (VERIFIED)
1. User types in TxtItemName field (item name)
2. AutoCompleteExtender triggers on each keystroke (minimum 1 character)
3. AJAX call to SearchCustomers WebMethod (despite name, searches items)
4. Server returns matching item names
5. User selects from autocomplete dropdown
6. PostBack triggers, loading item details (packs, rate, cost, tax rates, HS code)

### WORKFLOW: CNIC/NTN LOOKUP (VERIFIED)
1. User types in txtcnic or txtntnno field
2. AutoCompleteExtender triggers on each keystroke (minimum 1 character)
3. AJAX call to Searchacname WebMethod
4. Server returns matching accounts
5. User selects from autocomplete dropdown
6. PostBack triggers, loading account details

### WORKFLOW: DYNAMIC TAX RECALCULATION (VERIFIED)
1. User changes tax-related field (txtSTAmt, txtFTAmt, txtFEDAmt, txtADVTAmt)
2. PostBack triggers server-side calculation
3. Server recalculates tax amounts and updates totals
4. Updated values displayed in GridView and summary fields

### WORKFLOW: COST_RATE CALCULATION (VERIFIED)
1. Purchase bill is saved
2. System calculates Cost_rate (weighted average or moving average)
3. Cost_rate stored in Items table
4. Cost_rate used for COGS and stock valuation
5. Cost_rate appears in GridView but has no input field
