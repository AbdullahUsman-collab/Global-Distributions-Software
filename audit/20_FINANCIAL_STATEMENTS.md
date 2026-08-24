# 20 — FINANCIAL STATEMENTS

## Trial Balance (TrailBalance.aspx)
**Purpose:** Verify that total debits = total credits
**Filters:** Account range, Date range, Main Head
**Output:** All accounts with opening balance, debits, credits, closing balance
**Formula:** Closing = Opening + Debits - Credits

## Trial Balance With Activity (TrailBWA.aspx)
**Purpose:** Detailed trial balance showing all transactions
**Filters:** Same as Trial Balance
**Output:** Each account with individual transactions

## Balance Sheet (BalanceSheet.aspx - Balance Sheet mode)
**Purpose:** Show financial position (Assets = Liabilities + Equity)
**Filters:** Account range, Date range
**Output:**
```
ASSETS (100)
FIX ASSETS (250)
= Total Assets

CAPITAL (200)
= Total Equity

DEBITORS (500) less CUSTOMERS
BUSINESS PARTIES (8000) - SUPPLIERS
CASH AND BANK (1)
= Total Liabilities
```

## Profit & Loss (BalanceSheet.aspx - P&L mode)
**Purpose:** Show profitability (Income - Expenses)
**Filters:** Account range, Date range
**Output:**
```
INCOME (1600)
= Total Income

EXPENSES (1500)
= Total Expenses

Gross Profit = Income - Expenses
```

## General Ledger (Ledger.aspx)
**Purpose:** Detailed transaction history for any account
**Filters:** Account, Type, Date range
**Output:** All transactions with running balance

## Cash Book
**Purpose:** Cash transaction history
**Entry Point:** Cash_Book.aspx
**Output:** Opening balance, all transactions, closing balance

## Stock Valuation
**Purpose:** Value of inventory at cost
**Reports:** StockBalance.aspx, StockBWA.aspx
**Formula:** Stock Value = Quantity × Cost_Rate

## Sales Analysis
**NOT SEPARATELY OBSERVED** — May be derived from bill list and ledger reports.

## Purchase Analysis
**NOT SEPARATELY OBSERVED** — May be derived from bill list and ledger reports.

## Areas NOT VERIFIED
- Whether comparative periods are shown
- Whether budgets are tracked
- Whether cash flow statement exists
- Whether ratio analysis exists
- Whether branch-wise reports exist
