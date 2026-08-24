# 06 — SUPPLIER ACCOUNTING

## Supplier Entity
**Source:** Accounts table where Main_HeadNo = 8000 (BUSINESS PARTIES)

## Supplier Fields (from Accounts.aspx)
Same structure as customers but categorized under BUSINESS PARTIES (8000).

## Supplier Financial Behavior

### What INCREASES Supplier Payable (Credit)
1. **Purchase Invoice (PV)** — When goods are purchased on credit
2. **Purchase Return Adjustment** — If return creates credit balance

### What DECREASES Supplier Payable (Debit)
1. **Cash Payment (CP)** — We pay supplier in cash
2. **Bank Payment (PV)** — We pay supplier via bank
3. **Purchase Return (PRV)** — We return goods to supplier
4. **Discount/Adjustment** — Manual debit adjustment

### Supplier Ledger
- Same mechanism as customer ledger
- Each supplier has running balance from voucher entries

### Supplier Aging
- Can be generated via Aging.aspx by filtering BUSINESS PARTIES main head
- Shows amounts owed by age buckets

## Supplier Balance Formula
```
Supplier Balance = Opening Balance + SUM(Purchases) - SUM(Returns) - SUM(Payments) - SUM(Discounts)
```

## Payment Behavior (Inferred)
- Payments recorded via Journal.aspx (CP/CR types) or Cash_Book.aspx
- No explicit payment-to-invoice allocation observed
- Running balance model (not invoice-level matching)

## Areas NOT Verified
- Whether purchase orders exist
- Whether goods received notes exist
- Whether purchase invoices require approval
- Whether supplier statements are available
- Whether advance payments to suppliers are tracked separately
