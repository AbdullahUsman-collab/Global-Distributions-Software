# 24 — TRANSACTION DEPENDENCY MAP

## Sale Invoice (SV)
```
SALE INVOICE (Bills)
    ├── INVOICE LINES (Bill_Lines)
    │   ├── ITEM SELECTION → Price resolution
    │   ├── QUANTITY × RATE → Line Amount
    │   ├── TRADE DISCOUNT → Discount Amount
    │   └── TAX CALCULATIONS → Tax Amounts
    │
    ├── INVENTORY EFFECT
    │   ├── Stock DECREASED by sold quantity
    │   └── Stock Value DECREASED by cost
    │
    ├── CUSTOMER EFFECT
    │   ├── Customer Receivable INCREASED
    │   └── Customer Ledger UPDATED
    │
    ├── ACCOUNTING ENTRIES (Inferred)
    │   ├── DEBIT: Customer Account (500 DEBITORS)
    │   ├── CREDIT: Sales Income (1600 INCOME)
    │   ├── CREDIT: Tax Payable
    │   ├── DEBIT: COGS (1500 EXPENSES)
    │   └── CREDIT: Inventory
    │
    └── REPORTS AFFECTED
        ├── Ledger
        ├── Trial Balance
        ├── Balance Sheet
        ├── P&L
        ├── Aging
        ├── Stock Balance
        └── Bill List
```

## Purchase Invoice (PV)
```
PURCHASE INVOICE (Bills)
    ├── INVOICE LINES (Bill_Lines)
    │   └── (Same line structure as sale)
    │
    ├── INVENTORY EFFECT
    │   └── Stock INCREASED
    │
    ├── SUPPLIER EFFECT
    │   └── Supplier Payable INCREASED
    │
    ├── ACCOUNTING ENTRIES (Inferred)
    │   ├── DEBIT: Inventory
    │   ├── DEBIT: Tax Input
    │   └── CREDIT: Supplier Account (8000)
    │
    └── REPORTS AFFECTED
        └── (Same as sale)
```

## Sale Return (SRV)
```
SALE RETURN (Bills)
    ├── RETURN LINES (Bill_Lines)
    │   └── (Same line structure)
    │
    ├── INVENTORY EFFECT
    │   └── Stock INCREASED
    │
    ├── CUSTOMER EFFECT
    │   └── Customer Receivable DECREASED
    │
    ├── ACCOUNTING ENTRIES (Inferred)
    │   ├── CREDIT: Customer Account
    │   ├── DEBIT: Sales Return
    │   ├── DEBIT: Tax Payable
    │   ├── DEBIT: Inventory
    │   └── CREDIT: COGS
    │
    └── REPORTS AFFECTED
        └── (Same as sale)
```

## Purchase Return (PRV)
```
PURCHASE RETURN (Bills)
    ├── RETURN LINES (Bill_Lines)
    │
    ├── INVENTORY EFFECT
    │   └── Stock DECREASED
    │
    ├── SUPPLIER EFFECT
    │   └── Supplier Payable DECREASED
    │
    ├── ACCOUNTING ENTRIES (Inferred)
    │   ├── DEBIT: Supplier Account
    │   ├── CREDIT: Inventory
    │   ├── CREDIT: Tax Input
    │   └── (Other adjustments)
    │
    └── REPORTS AFFECTED
        └── (Same as purchase)
```

## Cash Receipt (CR)
```
CASH RECEIPT (Voucher)
    ├── ACCOUNTING ENTRIES
    │   ├── DEBIT: Cash Account
    │   └── CREDIT: Customer Account
    │
    ├── CUSTOMER EFFECT
    │   └── Customer Receivable DECREASED
    │
    ├── CASH EFFECT
    │   └── Cash Balance INCREASED
    │
    └── REPORTS AFFECTED
        ├── Ledger
        ├── Cash Book
        ├── Customer Aging
        └── Trial Balance
```

## Cash Payment (CP)
```
CASH PAYMENT (Voucher)
    ├── ACCOUNTING ENTRIES
    │   ├── DEBIT: Supplier/Expense Account
    │   └── CREDIT: Cash Account
    │
    ├── SUPPLIER EFFECT
    │   └── Supplier Payable DECREASED
    │
    ├── CASH EFFECT
    │   └── Cash Balance DECREASED
    │
    └── REPORTS AFFECTED
        ├── Ledger
        ├── Cash Book
        ├── Supplier Aging
        └── Trial Balance
```

## Journal Voucher (JV)
```
JOURNAL VOUCHER
    ├── ACCOUNTING ENTRIES
    │   ├── DEBIT: Account A
    │   └── CREDIT: Account B
    │
    ├── EFFECTS
    │   ├── Account A balance changes
    │   └── Account B balance changes
    │
    └── REPORTS AFFECTED
        ├── Ledger (both accounts)
        └── Trial Balance
```

## Second-Pass Verified Dependencies

### AJAX AutoComplete Dependencies
**VERIFIED:** System uses AJAX autocomplete for real-time account/item search:
- `Searchacname` WebMethod → Account name search (TxtAcName, txtntnno, txtcnic)
- `SearchRefacname` WebMethod → Reference account search (TxtRefaceName)
- `SearchCustomers` WebMethod → Customer search (TxtItemName)
- Minimum prefix length = 1 character (instant search)
- AutoComplete triggers server-side lookup on each keystroke

### PostBack Calculation Dependencies
**VERIFIED:** Multiple fields trigger server-side calculations on change:
- **Sale_Purchase.aspx:**
  - `txtvno` → Load existing voucher
  - `TxtAcName` → Load account details (NTN, CNIC, address, balance)
  - `txtntnno` → Load account by NTN
  - `txtcnic` → Load account by CNIC
  - `TxtRefaceName` → Load reference account
  - `TxtItemName` → Load item details (packs, rate, cost, tax)
  - `txtItemNo` → Load item by number
  - `txtgsttype` → Recalculate tax
  - `txthscode` → Load HS code details
  - `txtTotalAmount` → Recalculate totals
  - `txtToAmt` → Recalculate "To Amount"
  - `txtSTAmt` → Recalculate Sales Tax
  - `txtFTAmt` → Recalculate Further Tax
  - `txtFEDAmt` → Recalculate FED
  - `txtADVTAmt` → Recalculate Advance Tax
  - `txtTotalAmtInclSt` → Recalculate total with tax
  - `txtPrevBal` → Include previous balance

### Cost_rate Dependency
**VERIFIED:** Cost_rate is a stored calculated field (NOT an input):
- Appears in GridView columns only
- Differs from Purchase_Rate (weighted average or moving average)
- Used for COGS and stock valuation calculations
