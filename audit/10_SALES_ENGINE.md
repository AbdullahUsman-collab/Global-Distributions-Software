# 10 — SALES ENGINE

## Sales Transaction Types
| Type | Code | Purpose |
|------|------|---------|
| Sale Voucher | SV | Credit/cash sales invoice |
| Sale Return | SRV | Customer returns |

## Sale Bill Entry (Sale_Purchase.aspx with cmbvtype=SV)

### Header Fields
| Field | Required | Description |
|-------|----------|-------------|
| Voucher Type | Yes | SV for sales |
| Voucher # | Yes | Auto-generated |
| Date | Yes | Bill date |
| Sale Man | Yes | Dropdown selection |
| Day | Yes | Day of week |
| Party/Cash A/c | Yes | Customer account |
| Mobile | No | Customer phone |
| NTN | No | Customer NTN |
| CNIC | No | Customer CNIC |
| Stock A/c | Yes | Stock/inventory account |
| Description | No | Bill narration |

### Line Item Fields
| Field | Required | Description |
|-------|----------|-------------|
| Sr # | Yes | Line number |
| Item | Yes | Product selection |
| Cartons | Yes* | Number of cartons |
| Packs | Yes* | Number of pieces |
| Rate | Yes | Sale rate per piece |
| Trade Disc % | No | Discount percentage |
| TO | No | Trade offer |
| ST% | No | Sales tax % |
| F-ST% | No | Further sales tax % |
| FED% | No | Federal excise duty % |
| ADV.% | No | Advance tax % |

### Bill Totals
| Field | Calculation |
|-------|-------------|
| Total Ctns | SUM(Cartons) |
| Total Pcs | SUM(Packs) |
| Total Amount | SUM(Packs × Rate) |
| Disc. Amt | Total_Amount × Trade_Disc% |
| To.Amt | Total_Amount - Disc_Amt |
| GST | To.Amt × ST% |
| F.Tax | To.Amt × F-ST% |
| FED | To.Amt × FED% |
| ADV.Tax | To.Amt × ADV.% |
| Net.Amt | To.Amt + GST + F.Tax + FED + ADV.Tax |
| Prev. Balance | Customer's outstanding before this bill |

### Bill Buttons
| Button | Action |
|--------|--------|
| Save Entry | Add/update line item |
| Delete Entry | Remove line item |
| New Bill | Create new blank bill |
| Delete Bill | Delete entire bill |
| Update Bill | Save/update entire bill |
| Print | Print invoice |
| Back | Return to MainPage |
| < (Button2) | Navigate to previous bill |
| > (Button3) | Navigate to next bill |
| > SRV (Button4) | Jump to sale return |
| > PRV (Button5) | Jump to purchase return |

### Sale Invoice Accounting Effect (Inferred)
```
DEBIT: Customer Account (500 DEBITORS) — Net Amount
CREDIT: Sales Income (1600 INCOME) — Base Amount
CREDIT: Tax Payable — Tax Amount

DEBIT: COGS (1500 EXPENSES) — Cost Amount
CREDIT: Stock/Inventory — Cost Amount
```

### Sale Return (SRV) Effect
```
Opposite of Sale:
CREDIT: Customer Account (500 DEBITORS) — Return Amount
DEBIT: Sales Return (1600 INCOME) — Return Base Amount
DEBIT: Tax Payable — Tax Amount

DEBIT: Stock/Inventory — Cost Amount
CREDIT: COGS — Cost Amount
```

## Bill GridView Columns (25 columns)
Sr#, Item, Item#, Cartons, Packs, R.P, Rate, Trade.Disc, TO, ST%, F-ST%, FED%, Adv.%, GST Type, HS Code, Pcs/Ctn, Bal.Qty, Amount, Disc.Amt, To.Amt, GST, F.Tax, FED, ADV.Tax, Net.Amt

## List of Bills (ListofBills.aspx)
- Filter by: Voucher Type, Date Range, Party, Item, Sale Man
- SSRS report output
- Export: Excel, PDF, Word

## Areas NOT VERIFIED
- Whether stock is deducted at bill save or at posting
- Whether bills require approval
- Whether bills can be edited after posting
- Whether partial returns are supported
- Whether delivery challan exists before invoice
- Whether sales orders exist
- Credit limit enforcement
