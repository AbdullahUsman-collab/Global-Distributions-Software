# 28 — UNVERIFIED BEHAVIOR

## Items Requiring Write Access to Verify

### Account Management
- Whether duplicate account numbers are prevented
- Whether account deletion is blocked when references exist
- Whether account merge/transfer works correctly

### Item Management
- Whether duplicate item numbers are prevented
- Whether item deletion is blocked when bill references exist
- Whether Cost_rate is recalculated on purchase

### Voucher Entry
- Whether balanced entry is enforced (Debit must = Credit)
- Whether date validation prevents future/backdated entries
- Whether period locking prevents posting to closed periods

### Bill Entry
- Whether stock is checked for sufficient quantity
- Whether bill can be saved with zero lines
- Whether bill number is unique per type
- Whether bill can be edited after saving
- Whether bill deletion reverses stock correctly

### Accounting
- Exact journal entries created by sale/purchase invoices
- Whether double-entry is enforced at database level
- Whether account balances can go negative (for each type)
- Whether opening balances carry forward at year-end

### Reporting
- Actual report content (SSRS renders server-side)
- Report accuracy and completeness
- Whether reports handle large datasets
- Whether reports have drill-down capability

### Security
- Whether password is hashed
- Whether session timeout is enforced
- Whether concurrent logins are allowed
- Whether audit trail exists

### Inventory
- Whether negative stock is allowed
- Whether stock valuation method is configurable
- Whether multi-warehouse is supported
- Whether batch/expiry tracking is available

### Tax
- Whether tax rates are configurable
- Whether tax-inclusive pricing is supported
- Whether tax exemptions are tracked
- Whether withholding tax is supported

### Pricing
- Whether customer-specific pricing exists
- Whether quantity-based pricing exists
- Whether price history is maintained

### Returns
- Whether return quantity is validated against original sale
- Whether return rate is validated against original
- Whether partial returns are supported
- Whether returns require original invoice reference

### Financial
- Whether financial year can be closed
- Whether opening balances can be entered
- Whether period locking works
- Whether year-end carry-forward exists

## Second-Pass Verified Items

### Cost_rate Calculation (VERIFIED)
- **Finding:** Cost_rate is a stored/calculated field, NOT an input field
- **Evidence:** Appears in GridView columns only, no corresponding input field
- **Difference:** Cost_rate differs from Purchase_Rate (e.g., 190.08 vs 184.90)
- **Likely Method:** Weighted average or moving average cost calculation
- **Impact:** COGS and stock valuation depend on this calculation

### CNIC/NTN Fields (VERIFIED)
- **Finding:** CNIC and NTN fields exist on Sale_Purchase.aspx
- **Evidence:** txtcnic and txtntnno server controls with AutoComplete behavior
- **PostBack:** Both fields trigger server-side lookup on change
- **AutoComplete:** Uses Searchacname WebMethod for account search
- **Impact:** Customer lookup by CNIC/NTN is supported

### PostBack Calculation Triggers (VERIFIED)
- **Finding:** Multiple fields trigger server-side calculations on change
- **Evidence:** onchange="javascript:setTimeout('__doPostBack(...)', 0)"
- **Impact:** System is more dynamic than initially thought
- **Fields:** 17 fields on Sale_Purchase.aspx, 3 on Journal.aspx, 5 on Cash_Book.aspx

### AJAX AutoComplete (VERIFIED)
- **Finding:** System uses ASP.NET AJAX AutoCompleteExtender
- **Evidence:** AutoCompleteBehavior in JavaScript with Searchacname, SearchRefacname, SearchCustomers WebMethods
- **Minimum Length:** 1 character (instant search)
- **Impact:** Real-time account/item search functionality
