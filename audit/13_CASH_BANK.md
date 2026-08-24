# 13 — CASH AND BANK

## Cash Book (Cash_Book.aspx)

### Voucher Types
| Code | Name | Purpose |
|------|------|---------|
| CV | Cash Voucher | General cash transaction |
| CP | Cash Payment | Cash paid out |
| CR | Cash Receipt | Cash received |

### Fields
| Field | Description |
|-------|-------------|
| Cash Account # | The cash account being affected |
| Cash Account Name | Display name |
| Opening Balance | Read-only, system-calculated |
| Ref Account # | Party/account for the other side |
| Description | Narration |
| Receive (Db) | Cash inflow |
| Payment (Cr) | Cash outflow |

### Cash Book Calculation
```
Closing Balance = Opening Balance + Total Receipts (Debit) - Total Payments (Credit)
```

### Cash Receipt Accounting
```
DEBIT: Cash Account — Amount
CREDIT: Customer Account — Amount
```

### Cash Payment Accounting
```
DEBIT: Supplier/Expense Account — Amount
CREDIT: Cash Account — Amount
```

## Bank Transactions
**NOT SEPARATELY OBSERVED** — No dedicated bank book screen.

**INFERRED:** Bank transactions handled via Journal.aspx:
- PV (Payment Voucher) for bank payments
- CP (Cash Payment) may also apply to bank accounts
- No cheque management observed
- No bank reconciliation observed

## Contra Entry
**NOT OBSERVED** — No contra entry function. Cash-to-bank or bank-to-cash transfers may be done via journal entries.

## Areas NOT VERIFIED
- Whether multiple cash/bank accounts are supported
- Whether bank reconciliation exists
- Whether cheque management exists
- Whether petty cash is tracked separately
- Whether opening balances are entered via system or journal
