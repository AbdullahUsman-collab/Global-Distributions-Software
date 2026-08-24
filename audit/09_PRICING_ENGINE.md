# 09 — PRICING ENGINE

## Price Types Observed

### Per-Item Pricing (Items.aspx)
| Field | Description | Used In |
|-------|-------------|---------|
| Purchase_Rate | Cost/purchase price | Purchase bills, COGS |
| Sale_Rate | Selling/wholesale price | Sale bills (auto-filled) |
| Retail_Price | MRP/retail price | Display/reference |
| Trade_Disc | Default trade discount % | Sale bills |
| T_O | Trade offer | Sale bills |

## Price Resolution in Sale Bill (Sale_Purchase.aspx)
When an item is selected:
1. txtRP (Retail Price) auto-filled from Items.Retail_Price
2. txtSaleRate auto-filled from Items.Sale_Rate
3. txtSTPercentage auto-filled from Items.gst (GST %)
4. txtFTPercentage auto-filled from Items.fed (FED %)
5. txtADVPercentage auto-filled from Items.adv_tax_sale
6. txtgsttype auto-filled from Items.gst_type
7. txthscode auto-filled from Items.hs_code
8. txtPcsPerCtn auto-filled from Items.Pcs_PerCtn

**The sale rate can be manually overridden on the bill line.**

## Price Precedence (Inferred)
```
Bill Rate = Manual Override (if entered) → Items.Sale_Rate (default)
```

## Multi-Price-List Support
**NOT OBSERVED** — Only one Sale_Rate per item. No customer-specific pricing observed.

## Quantity-Based Pricing
**NOT OBSERVED** — No quantity break or tiered pricing structure.

## Promotional Pricing
**NOT OBSERVED** — No promotional price or scheme pricing fields.

## Price Update Mechanism
- Prices are set on Items master form
- Prices auto-populate on new bill lines
- Prices can be overridden per bill line
- Historical bills retain the rate at time of sale
