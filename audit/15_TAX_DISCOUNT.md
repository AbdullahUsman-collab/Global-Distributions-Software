# 15 — TAX AND DISCOUNT ENGINE

## Tax Types Observed

### On Items Master
| Field | Description |
|-------|-------------|
| gst_type | Tax type: VAT, 3RD, 8TH |
| gst | GST percentage |
| fed | Federal Excise Duty percentage |
| adv_tax_purchase | Advance tax on purchase % |
| adv_tax_sale | Advance tax on sale % |

### On Sale/Purchase Bills
| Field | Description |
|-------|-------------|
| ST% | Sales Tax percentage |
| F-ST% | Further Sales Tax % |
| FED% | Federal Excise Duty % |
| ADV.% | Advance Tax % |
| GST Type | Auto-filled from item |

## Tax Calculation Formulas (from Bill Structure)
```
Base Amount = Quantity x Rate
Discount = Base Amount x (Trade Disc% / 100)
After Discount = Base Amount - Discount
GST = After Discount x (ST% / 100)
F.Tax = After Discount x (F-ST% / 100)
FED = After Discount x (FED% / 100)
ADV.Tax = After Discount x (ADV.% / 100)
Net Amount = After Discount + GST + F.Tax + FED + ADV.Tax
```

## Tax Inclusivity
**UNKNOWN** — Cannot determine from UI whether rates are tax-inclusive or tax-exclusive.

## Discount Types

### Trade Discount (Line Level)
- Applied per line item on bills
- Percentage-based
- Calculated on line amount

### Invoice-Level Discount
**NOT OBSERVED** — No separate invoice discount field.

### Cash Discount
**NOT OBSERVED** — No early payment discount mechanism.

### Quantity Discount
**NOT OBSERVED** — No quantity-based discount tiers.

## Accounting Effect of Tax
**INFERRED:**
- GST/ST collected = Tax Payable (liability)
- GST/ST paid on purchases = Tax Input (asset)
- Net tax payable = Tax Payable - Tax Input

## Areas NOT VERIFIED
- Whether tax rates are configurable per customer
- Whether tax exemptions exist
- Whether withholding tax is applied
- Tax rounding rules
- Whether tax-inclusive pricing is supported
