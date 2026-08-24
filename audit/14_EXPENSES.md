# 14 — EXPENSES

## Expense Accounts
**Source:** Accounts table where Main_HeadNo = 1500 (EXPENSES)

## Expense Recording Method
**OBSERVED:** Expenses are recorded via:
1. **Journal Entry (Journal.aspx)** — CP or CR voucher types
2. **Cash Book (Cash_Book.aspx)** — Payment entries

## Expense Workflow (Inferred)
1. Create account under EXPENSES (1500) main head
2. Record cash/bank payment via Journal or Cash Book
3. Debit: Expense Account
4. Credit: Cash/Bank Account

## Expense Categories
Determined by the account structure under EXPENSES (1500). No separate expense category master observed.

## Expense Reports
- Ledger.aspx — View expense account transactions
- TrailBalance.aspx — See total expenses
- BalanceSheet.aspx / Profit and Loss — Expense totals in P&L

## Areas NOT VERIFIED
- Whether expense approval exists
- Whether expense budgets exist
- Whether recurring expenses are supported
- Whether expense claims exist
- Whether expense categories have separate management
