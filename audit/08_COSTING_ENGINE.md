# 08 — COSTING ENGINE

## Cost Fields Observed

### On Items.aspx
| Field | Type | Description |
|-------|------|-------------|
| Purchase_Rate | Decimal | Purchase/cost price per unit |
| Sale_Rate | Decimal | Selling price per unit |
| Retail_Price | Decimal | MRP/retail price |
| Cost_rate | Decimal | Calculated cost (appears in GridView only) |

## Cost Rate Calculation (Inferred)
Cost_rate appears in the Items GridView but has no input field on the form. This is a **calculated field**.

**Possible formulas:**
1. **Weighted Average:** Cost_rate = Total Purchase Value / Total Quantity
2. **Last Purchase Cost:** Cost_rate = Most recent Purchase_Rate
3. **Fixed:** Cost_rate = Purchase_Rate (same as entered cost)

**INFERRED:** Most likely Weighted Average based on field name "Cost_rate" rather than "Purchase_Rate".

## COGS Calculation (Inferred)
```
COGS per sale = Quantity Sold × Cost_rate
Gross Profit = Sale Amount - COGS
```

## Cost affecting Reports
- **Balance Sheet:** Stock valuation at cost
- **Profit & Loss:** COGS as expense
- **Stock Balance:** Quantity × Cost_rate = Stock Value

## Pricing vs Cost
```
Purchase_Rate = What we pay supplier
Cost_rate = Calculated average cost (may differ from Purchase_Rate due to multiple purchases)
Sale_Rate = What we charge customer
Retail_Price = Maximum Retail Price (MRP)
Gross Margin = Sale_Rate - Cost_rate
```

## Areas NOT VERIFIED
- Exact Cost_rate formula (requires database/procedure inspection)
- Whether Cost_rate updates on each purchase
- Whether Cost_rate is recalculated or manually set
- Impact of returns on Cost_rate
- Stock valuation method in financial statements
