# 05 — CUSTOMER ACCOUNTING

## Customer Entity
**Source:** Accounts table where Main_HeadNo = 500 (DEBITORS)

## Customer Fields (from Accounts.aspx)
| Field | Type | Description |
|-------|------|-------------|
| Ac_No | Numeric (PK) | Unique account number |
| Ac_Name | Text | Customer/business name |
| Address | Text | Physical address |
| owner_name | Text | Owner/contact name |
| phone | Text | Phone number |
| STN | Text | Sales Tax Number |
| NTN | Text | National Tax Number |
| CNIC | Text | CNIC number |
| Main_HeadNo | Numeric (FK) | Always 500 for customers |

## Customer Financial Behavior

### What INCREASES Customer Receivable (Debit)
1. **Sale Invoice (SV)** — When goods are sold on credit
2. **Sale Return Adjustment** — If return creates debit balance

### What DECREASES Customer Receivable (Credit)
1. **Cash Receipt (CR)** — Customer pays cash
2. **Sale Return (SRV)** — Customer returns goods
3. **Discount/Adjustment** — Manual credit adjustment

### Customer Ledger
- Each customer has a ledger derived from Voucher_Lines
- Ledger shows all transactions with running balance
- Accessible via Ledger.aspx with account filter

### Customer Aging
- Aging.aspx provides aging report by Main Head
- Filter: From A/c#, To A/c#, Date, Main Head
- Shows outstanding amounts by age buckets

## Customer Balance Formula
```
Customer Balance = Opening Balance + SUM(Sales) - SUM(Returns) - SUM(Payments) - SUM(Discounts)
```

## Customer Payment Allocation (Inferred)
- Payment voucher (CP/CR) credits customer account
- No explicit allocation to specific invoices observed
- Balance carried forward as running total

## Credit Management
- **Credit Limit:** NOT OBSERVED — no credit limit field on Accounts form
- **Credit Days:** NOT OBSERVED — no payment terms field
- **Overdue Tracking:** INFERRED via Aging Report
