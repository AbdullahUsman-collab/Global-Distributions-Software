# 16 — CALCULATIONS CATALOG

## Line Item Calculations (Sale/Purchase Bill)

### 1. Line Amount
```
Inputs: Packs (quantity), Rate
Formula: Amount = Packs x Rate
Output: Line base amount
Precision: 2 decimal places
```

### 2. Carton Conversion
```
Inputs: Cartons, Pcs_Per_Ctn
Formula: Total_Pcs_from_Ctns = Cartons x Pcs_Per_Ctn
Note: Total quantity = Cartons x Pcs_Per_Ctn + Loose Packs
```

### 3. Trade Discount
```
Inputs: Amount, Trade_Disc%
Formula: Disc_Amount = Amount x (Trade_Disc / 100)
Output: Discount amount
```

### 4. After Trade Offer
```
Inputs: Amount, Disc_Amount
Formula: To_Amt = Amount - Disc_Amount
Output: Amount after discount
```

### 5. Sales Tax (GST)
```
Inputs: To_Amt, ST%
Formula: GST = To_Amt x (ST% / 100)
Output: Tax amount
```

### 6. Further Sales Tax
```
Inputs: To_Amt, F-ST%
Formula: F.Tax = To_Amt x (F-ST% / 100)
Output: Further tax amount
```

### 7. Federal Excise Duty
```
Inputs: To_Amt, FED%
Formula: FED = To_Amt x (FED% / 100)
Output: FED amount
```

### 8. Advance Tax
```
Inputs: To_Amt, ADV%
Formula: ADV_Tax = To_Amt x (ADV% / 100)
Output: Advance tax amount
```

### 9. Net Line Amount
```
Inputs: To_Amt, GST, F.Tax, FED, ADV_Tax
Formula: Net = To_Amt + GST + F.Tax + FED + ADV_Tax
Output: Final line amount including all taxes
```

## Bill Total Calculations

### 10. Total Cartons
```
Formula: Total_Ctns = SUM(Line_Cartons)
```

### 11. Total Pieces
```
Formula: Total_Pcs = SUM(Line_Packs)
```

### 12. Total Amount
```
Formula: Total_Amount = SUM(Line_Amounts)
```

### 13. Total Discount
```
Formula: Total_Disc = SUM(Line_Disc_Amounts)
```

### 14. Total After TO
```
Formula: Total_To_Amt = SUM(Line_To_Amts)
```

### 15. Total Taxes
```
Formula: Total_ST = SUM(Line_GST)
Formula: Total_FT = SUM(Line_F.Tax)
Formula: Total_FED = SUM(Line_FED)
Formula: Total_ADV = SUM(Line_ADV)
```

### 16. Net Bill Amount
```
Formula: Net_Bill = Total_To_Amt + Total_ST + Total_FT + Total_FED + Total_ADV
```

### 17. Final with Previous Balance
```
Formula: Final = Net_Bill + Prev_Balance
```

## Cash Book Calculations

### 18. Closing Balance
```
Inputs: Opening_Balance, Total_Debit, Total_Credit
Formula: Closing = Opening + Total_Debit - Total_Credit
```

## Account Balance Calculations

### 19. Account Balance
```
Inputs: Opening_Balance, All_Debits, All_Credits
Formula: Balance = Opening + SUM(Debits) - SUM(Credits)
```

## Stock Calculations

### 20. Current Stock
```
Inputs: Opening_Stock, Purchases, Sales, Returns
Formula: Stock = Opening + Purchases + Sale_Returns - Sales - Purchase_Returns
```

### 21. Stock Value
```
Inputs: Quantity, Cost_Rate
Formula: Value = Quantity x Cost_Rate
```

## Cost Calculations

### 22. Cost of Goods Sold
```
Inputs: Quantity_Sold, Cost_Rate
Formula: COGS = Quantity_Sold x Cost_Rate
```

### 23. Gross Profit
```
Inputs: Sale_Amount, COGS
Formula: Profit = Sale_Amount - COGS
```

## Second-Pass Verified Calculations

### 24. Cost_rate (Stored Calculated Field)
**VERIFIED:** Cost_rate is a stored/calculated field, NOT an input field.
- Appears in GridView columns but has no corresponding input field
- Differs from Purchase_Rate (e.g., Purchase_Rate=184.90 vs Cost_rate=190.08)
- Likely calculated as weighted average or moving average cost
- Used for COGS and stock valuation

### 25. Tax Calculations (PostBack Triggers)
**VERIFIED:** The following fields trigger server-side calculations on change:
- `txtTotalAmount` → Triggers total amount recalculation
- `txtToAmt` → Triggers "To Amount" recalculation
- `txtSTAmt` → Triggers Sales Tax recalculation
- `txtFTAmt` → Triggers Further Tax recalculation
- `txtFEDAmt` → Triggers FED recalculation
- `txtADVTAmt` → Triggers Advance Tax recalculation
- `txtTotalAmtInclSt` → Triggers total with tax recalculation
- `txtPrevBal` → Triggers previous balance inclusion

### 26. Account Balance Lookup (PostBack Trigger)
**VERIFIED:** When TxtAcName or txtacno changes, system triggers PostBack to:
- Load account details (NTN, CNIC, address, phone, email)
- Load previous balance
- Populate account-specific fields

### 27. Item Cost Lookup (PostBack Trigger)
**VERIFIED:** When TxtItemName or txtItemNo changes, system triggers PostBack to:
- Load item details (packs, rate, cost, tax rates)
- Populate line item fields with item defaults
