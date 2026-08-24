# 07 — INVENTORY ENGINE

## Inventory System Type
**OBSERVED:** Quantity-based inventory tracking with carton/pack unit conversion.

## Inventory Fields (from Items.aspx)
| Field | Description |
|-------|-------------|
| Item_No | Unique product identifier |
| Item_Name | Product name |
| Item_MainHeadNo | Category (FK) |
| Units | Unit of measure |
| Pcs_PerCtn | Pieces per carton — conversion factor |
| Sale_Rate | Selling price per piece |
| Purchase_Rate | Cost price per piece |
| Retail_Price | MRP per piece |
| Cost_rate | Calculated cost rate (appears in grid) |

## Stock Movement Sources

### Stock INCREASES (Debit)
1. **Purchase Invoice (PV)** — Goods purchased
2. **Sale Return (SRV)** — Customer returns goods

### Stock DECREASES (Credit)
1. **Sale Invoice (SV)** — Goods sold
2. **Purchase Return (PRV)** — Return to supplier

### Stock Reports
| Report | Page | Purpose |
|--------|------|---------|
| Item Ledger | ItemLedger.aspx | Transaction history for a specific item |
| Stock Balance | StockBalance.aspx | Current stock quantities |
| Stock Balance With Activity | StockBWA.aspx | Stock with movement details |

## Stock Report Filters

### Item Ledger
- From Date, To Date
- Item Name (autocomplete), Item Number

### Stock Balance
- From Item#, To Item#
- From Date, To Date

### Stock Balance With Activity
- From Item#, To Item#
- From Date, To Date

## Stock Calculation (Inferred)
```
Current Stock = Opening Stock + Purchases + Sale Returns - Sales - Purchase Returns
```

## Unit Conversion
```
Total Pieces = Cartons × Pcs_PerCtn + Loose Packs
```
- Bills allow entry of both Cartons and Packs
- System likely converts to pieces for stock tracking

## Stock Valuation (Inferred from Cost_rate field)
- Cost_rate appears in Items GridView as calculated field
- Likely represents weighted average or last purchase cost
- Used for COGS calculation

## Warehouse Management
**NOT OBSERVED** — No warehouse selection in any form. INFERRED: single-warehouse system.

## Batch/Lot Tracking
**NOT OBSERVED** — No batch number or expiry date fields.

## Stock Adjustments
**NOT OBSERVED** — No dedicated stock adjustment screen. INFERRED: adjustments may be done via journal entries.

## Areas NOT Verified
- Actual stock quantities (would require report rendering)
- Whether negative stock is allowed
- Stock valuation method (FIFO, LIFO, Average)
- Whether stock is locked during posting
- Multi-warehouse support
