# 04 — ACCOUNTING ENGINE

## Accounting System Type
**VERIFIED:** Double-entry accounting system with voucher-based posting.

## Evidence of Double-Entry
- Journal.aspx has both Debit and Credit fields per line
- Balance field shows Debit - Credit difference
- Voucher lines accumulate until balanced
- Trial Balance report exists (must balance)

## AJAX/WebMethods (Second-Pass Discovery)
**VERIFIED:** System uses ASP.NET AJAX AutoCompleteExtender for account search:
- `Searchacname` WebMethod on Sale_Purchase.aspx, Journal.aspx, Cash_Book.aspx
- `SearchRefacname` WebMethod for reference/contra account search
- `SearchCustomers` WebMethod for customer search
- Minimum prefix length = 1 character (instant search)
- AutoComplete triggers on TxtAcName, txtntnno, txtcnic fields

## PostBack Triggers (Second-Pass Discovery)
**VERIFIED:** Multiple fields trigger server-side calculations on change:
- **Sale_Purchase.aspx:** txtvno, TxtAcName, txtntnno, txtcnic, TxtRefaceName, TxtItemName, txtItemNo, txtgsttype, txthscode, txtTotalAmount, txtToAmt, txtSTAmt, txtFTAmt, txtFEDAmt, txtADVTAmt, txtTotalAmtInclSt, txtPrevBal
- **Journal.aspx:** txtvno, TxtAcName, TxtRefaceName
- **Cash_Book.aspx:** txtvno, txtdate, txtacno, TxtAcName, TxtRefaceName
- **Accounts.aspx:** cmbMainHead, txtacno
- **MainHeads.txtmhno, DDLEffect, cmbacname, txtSmno, cmbDay
- **Items.aspx:** CmbItemMHeads

## CNIC/NTN Fields (Second-Pass Discovery)
**VERIFIED:** CNIC and NTN fields exist on Sale_Purchase.aspx with:
- AutoComplete behavior (Searchacname WebMethod)
- PostBack on change (triggers server-side lookup)
- Labeled as "CNIC" and "NTN" in UI but map to txtcnic and txtntnno server controls

## Voucher Types

| Code | Name | Debit Side | Credit Side | Purpose |
|------|------|------------|-------------|---------|
| JV | Journal Voucher | Any account | Any account | General adjustments, transfers |
| CV | Cash Voucher | Cash account | Any account OR vice versa | Cash transactions |
| PV | Payment Voucher | Any account | Bank account | Bank payments |
| CP | Cash Payment | Expense/Party | Cash account | Cash disbursements |
| CR | Cash Receipt | Cash account | Income/Party | Cash receipts |
| SV | Sale Voucher | Customer account | Sales income + Stock reduction | Sales invoice |
| PV | Purchase Voucher | Stock increase | Supplier account | Purchase invoice |
| SRV | Sale Return Voucher | Sales return | Customer account | Sales returns |
| PRV | Purchase Return Voucher | Supplier account | Stock reduction | Purchase returns |

## General Ledger Structure (Inferred)

### Account Balance Formula
```
Account Balance = Opening Balance + SUM(Debits) - SUM(Credits)
```

### Balance Types by Main Head
- **DEBITORS (500):** Debit balance = customer owes money
- **BUSINESS PARTIES (8000):** Credit balance = we owe supplier
- **CASH AND BANK (1):** Debit balance = cash available
- **EXPENSES (1500):** Debit balance = expenses incurred
- **INCOME (1600):** Credit balance = income earned
- **CAPITAL (200):** Credit balance = owner's equity
- **ASSETS (100):** Debit balance = asset value

## Voucher Entry Workflow (Journal.aspx)

1. Select voucher type (JV/CV/PV/CP/CR)
2. Click "New Voucher" → system generates voucher number
3. Enter date
4. For each line:
   a. Select account (TxtAcName autocomplete → populates txtacno)
   b. Enter description
   c. Select contra account (TxtRefaceName → txtrefacno)
   d. Enter Debit OR Credit amount
   e. Click "Add Line" (Button1)
5. Lines accumulate in GridView
6. System tracks total debit, total credit, balance
7. Save is implicit (each line addition is a save)
8. "Delete Entry" removes selected line
9. "Delete Voucher" removes entire voucher

## Cash Book Workflow (Cash_Book.aspx)

1. Select voucher type (CV/CP/CR)
2. Select cash account → system shows opening balance
3. Enter date
4. For each entry:
   a. Select party account
   b. Enter description
   c. Enter Receive (Debit) OR Payment (Credit)
   d. Click Save
5. System calculates: Closing = Opening + Total Debit - Total Credit

## Posting Behavior (Inferred)

### Sale Voucher (SV) Accounting Effect
```
DEBIT: Customer Account (DEBITORS 500) — Net amount
CREDIT: Sales Income (INCOME 1600) — Amount before tax
CREDIT: Tax Payable — Tax amount
DEBIT: Cost of Goods Sold — Cost amount
CREDIT: Inventory/Stock — Cost amount
```

### Purchase Voucher (PV) Accounting Effect
```
DEBIT: Inventory/Stock — Purchase amount
DEBIT: Tax Input — Input tax amount
CREDIT: Supplier Account (BUSINESS PARTIES 8000) — Net amount
```

### Cash Receipt (CR) Accounting Effect
```
DEBIT: Cash Account (CASH AND BANK 1) — Amount
CREDIT: Customer Account (DEBITORS 500) — Amount
```

### Cash Payment (CP) Accounting Effect
```
DEBIT: Supplier/Expense Account — Amount
CREDIT: Cash Account (CASH AND BANK 1) — Amount
```

## Ledger Report (Ledger.aspx)
**Filters:** Account, Type (Normal/Sales Tax), Date Range
**Output:** All transactions for selected account with running balance

## Trial Balance (TrailBalance.aspx)
**Filters:** Account range, Date range, Main Head filter
**Output:** All accounts with debit/credit totals — must balance

## Balance Sheet / P&L (BalanceSheet.aspx)
**Filters:** Account range, Date range
**Output:** Balance Sheet (assets = liabilities + equity) and P&L (income - expenses)

## Areas NOT Verified (Requires Write Access)
- Exact journal entry lines created by Sale/Purchase vouchers
- Whether vouchers are posted immediately or require approval
- Period closing/locking behavior
- Year-end closing procedure
- Opening balance entry method
- Reversal/correction procedures
