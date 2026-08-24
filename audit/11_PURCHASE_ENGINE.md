# 11 — PURCHASE ENGINE

## Purchase Transaction Types
| Type | Code | Purpose |
|------|------|---------|
| Purchase Voucher | PV | Purchase invoice |
| Purchase Return | PRV | Return to supplier |

## Purchase Bill Entry (Sale_Purchase.aspx with cmbvtype=PV)

Uses the SAME form as Sale Bill (Sale_Purchase.aspx) with voucher type changed to PV.

### Header Fields
Same as sale bill but for purchase context:
- Party = Supplier account
- Sale Man = Purchase person (same dropdown)
- Stock A/c = Stock account

### Line Item Fields
Same structure as sale:
- Item, Cartons, Packs, Rate, Trade Disc, TO, Tax percentages

### Purchase Invoice Accounting Effect (Inferred)
```
DEBIT: Stock/Inventory — Purchase Amount
DEBIT: Tax Input — Input Tax Amount
CREDIT: Supplier Account (8000 BUSINESS PARTIES) — Net Amount
```

### Purchase Return (PRV) Effect
```
DEBIT: Supplier Account (8000 BUSINESS PARTIES) — Return Amount
CREDIT: Stock/Inventory — Cost Amount
CREDIT: Tax Input — Tax Amount
```

## Areas NOT Verified
- Whether purchase orders exist
- Whether goods received notes exist
- Whether purchase price is locked from last purchase
- Whether supplier price lists exist
- Whether purchase invoices require approval
