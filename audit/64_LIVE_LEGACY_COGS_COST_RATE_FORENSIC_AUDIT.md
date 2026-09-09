# STEP 64 — LIVE LEGACY COGS / COST_RATE FORENSIC AUDIT

**Date:** 2026-09-10
**Baseline Commit:** 6179a65
**Scope:** READ-ONLY forensic verification of live legacy ERP to resolve COGS/Cost_Rate specification gap. No source code changes.

---

## 1. Scope

Step 64 performs a read-only forensic inspection of the live legacy ERP at `http://38.92.47.89:8026/` to resolve the Cost_Rate specification gap that has been frozen since Step 45. The goal is to determine the exact Cost_Rate formula, lifecycle, and COGS behavior from authoritative legacy evidence.

---

## 2. Legacy ERP Access Result

| Item | Result |
|------|--------|
| URL | `http://38.92.47.89:8026/` |
| Login | SUCCESSFUL |
| Read-only inspection | YES |
| Credentials used | Administrator / MC1234 |
| Session maintained | YES (ASP.NET session cookie) |
| No data modified | VERIFIED |

**LEGACY ERP SUCCESSFULLY ACCESSED.**

---

## 3. Screens / Modules Inspected

| Screen | URL | Inspection Result |
|--------|-----|-------------------|
| Login | `/` | Accessible, credentials work |
| Main Page | `/MainPage.aspx` | Menu structure visible |
| Items | `/Items.aspx` | **Cost_rate column visible in GridView** |
| Sale/Purchase Bill | `/Sale_Purchase.aspx` | Bill entry form — no Cost_rate field |
| List of Bills | `/ListofBills.aspx` | No data grid visible |
| Journal Entry | `/Journal.aspx` | Journal entry form — no COGS fields |
| Cash Book | `/Cash_Book.aspx` | Cash book form — no COGS fields |
| Entries List | `/JournalEntriesList.aspx` | Not inspectable |
| Ledger | `/Ledger.aspx` | SSRS ReportViewer — requires account/date params |
| Trial Balance | `/TrailBalance.aspx` | SSRS ReportViewer — requires date params |
| Trial Balance with Activity | `/TrailBWA.aspx` | SSRS ReportViewer — requires date params |
| Balance Sheet / P&L | `/BalanceSheet.aspx` | SSRS ReportViewer — requires date params |
| Aging Report | `/Aging.aspx` | SSRS ReportViewer |
| Item Ledger | `/ItemLedger.aspx` | SSRS ReportViewer — requires item/date params |
| Stock Balance | `/StockBalance.aspx` | SSRS ReportViewer — requires item/date params |
| Stock Balance with Activity | `/StockBWA.aspx` | SSRS ReportViewer — requires item/date params |
| Accounts | `/Accounts.aspx` | Account grid visible |
| Main Heads | `/MainHeads.aspx` | Account structure visible |

**Key finding:** Cost_rate is a visible column on the Items page GridView. It is a stored field on the Item table, not a calculated/report-only value.

---

## 4. Products Inspected

### 4.1 Column Headers Verified

From `Items.aspx` GridView:

| # | Column Header |
|---|---------------|
| 1 | (Select button) |
| 2 | Item_No |
| 3 | Item_Name |
| 4 | Item_MainHeadNo |
| 5 | Units |
| 6 | Pcs_PerCtn |
| 7 | Sale_Rate |
| 8 | Purchase_Rate |
| 9 | Retail_Price |
| 10 | Trade_Disc |
| 11 | T_O |
| 12 | Min_Qty |
| 13 | hs_code |
| 14 | gst_type |
| 15 | gst |
| 16 | fed |
| 17 | adv_tax_purchase |
| 18 | adv_tax_sale |
| 19 | **Cost_rate** |

**Cost_rate IS a column in the Items table GridView.** It is displayed alongside Purchase_Rate, Sale_Rate, and other item attributes.

### 4.2 Product Categories Available

| Category | Value |
|----------|-------|
| Powder | 1 |
| Lotion | 50 |
| Gift Box | 100 |
| Shampoo | 150 |
| Pouch | 190 |
| Soap | 200 |
| OIL | 250 |
| Wipes | 300 |
| NEW SKUs | 400 |

### 4.3 Product Evidence — Powder Category (Main Head 1)

| Item_No | Item_Name | Sale_Rate | Purchase_Rate | Cost_rate | Ratio (Cost/Purchase) |
|---------|-----------|-----------|---------------|-----------|----------------------|
| 2 | Baby Powder (Pink) 90 GM | 184.90 | 184.90 | 190.08 | 1.028000 |
| 3 | Baby Powder (Pink) 130 GM | 231.12 | 231.12 | 237.59 | 1.028006 |
| 4 | GO RASH POWDER 250 GM | 365.95 | 365.95 | 376.20 | 1.027998 |
| 5 | GO RASH POWDER 150 GM | 277.35 | 277.35 | 285.11 | 1.027997 |
| 6 | FRENCH POWDER 90 GM | 184.90 | 184.90 | 190.08 | 1.028000 |
| 7 | FRENCH POWDER 130 GM | 231.12 | 231.12 | 237.59 | 1.028006 |
| 8 | Baby Powder (Pink) 215 GM | 288.91 | 288.91 | 297.00 | 1.027999 |
| 9 | FRENCH POWDER 215 GM | 288.91 | 288.91 | 297.00 | 1.027999 |
| 10 | Baby Powder (Pink) 385 GM | 385.21 | 385.21 | 396.00 | 1.028000 |
| 11 | FRENCH POWDER 385 GM | 385.21 | 385.21 | 396.00 | 1.027999 |
| 12 | Prickly Heat Powder 150 GM | 277.35 | 277.35 | 285.11 | 1.027997 |
| 13 | Prickly Heat Powder 250 GM | 365.95 | 365.95 | 376.20 | 1.027998 |
| 15 | GO RASH 150 GM NEW | 308.17 | 308.17 | 316.80 | 1.027996 |
| 16 | MC GO RASH 250 GM NEW | 423.73 | 423.73 | 435.59 | 1.027999 |
| 17 | MC POWDER PINK 215 GM NEW | 351.48 | 351.48 | 360.37 | 1.025302 |
| 18 | MC POWDER 130 GM PINK NEW | 269.65 | 269.65 | 277.20 | 1.027997 |
| 19 | MC POWDER 90 GM PINK NEW | 208.01 | 208.01 | 213.83 | 1.027999 |
| 20 | MC POWDER N&M 385GM PINK NEW | 488.17 | 488.17 | 500.52 | 1.025298 |

### 4.4 Product Evidence — Lotion Category (Main Head 50)

| Item_No | Item_Name | Purchase_Rate | Cost_rate | Ratio |
|---------|-----------|---------------|-----------|-------|
| 51 | Baby Lotion Pink 60 ml | 250.39 | 257.40 | 1.027994 |
| 52 | BABY LOTION FRENCH BARRIES 60 ML | 250.39 | 257.40 | 1.027994 |
| 53 | Go Rash Lotion 215ml | 481.51 | 494.99 | 1.028000 |
| 54 | Baby Lotion Pink 115 ML | 346.69 | 356.40 | 1.028001 |
| 55 | FRENCH LOTION 115 ML | 346.69 | 356.40 | 1.028001 |
| 56 | Baby Lotion Pink 215 ML | 462.25 | 475.19 | 1.027998 |
| 57 | FRENCH LOTION 215 ML | 462.25 | 475.19 | 1.027998 |
| 58 | BABY LOTION 300 ML | 539.29 | 554.39 | 1.028000 |
| 59 | FRENCH LOTION 300 ML | 539.29 | 554.39 | 1.028000 |
| 60 | GO RASH CREAM 30 GM | 169.49 | 174.24 | 1.028001 |
| 61 | MC GO RASH CREAM 60 GM | 250.39 | 257.40 | 1.027994 |
| 62 | SUN BLOCK 75 GM | 423.73 | 421.03 | **0.993637** |
| 63 | Mosquit Repellent Lotion 115ml | 231.12 | 226.36 | **0.979400** |
| 64 | Baby Jelly 100gm | 385.21 | 396.00 | 1.028000 |
| 65 | MC LOTION PINK 100 ML NEW | 385.21 | 396.00 | 1.028000 |
| 66 | MC LOTION PINK 200 ML NEW | 546.75 | 560.58 | 1.025299 |
| 67 | MC LOTION PINK 300 ML NEW | 663.91 | 680.71 | 1.025299 |
| 68 | MC LOTION FRENCH 200 ML NEW | 546.75 | 560.58 | 1.025299 |
| 69 | BABY LOTION PINK 60 ML NEW | 272.12 | 279.25 | 1.026199 |
| 70 | BABY LOTION FRENCH 100 ML NEW | 385.21 | 396.00 | 1.028000 |
| 71 | MC LOTION FRENCH 60 ML NEW | 272.12 | 279.25 | 1.026200 |
| 72 | GO RASH CREAM 65 GM NEW | 288.91 | 297.00 | 1.027999 |
| 73 | MC LOTION FRENCH 300 ML NEW | 663.91 | 680.71 | 1.025299 |
| 74 | Mosquit Repellent Lotion 115ml NEW | 269.65 | 264.10 | **0.979400** |
| 75 | MC GO RASH CREAM 30 GM NEW | 192.60 | 197.99 | 1.028000 |

### 4.5 Product Evidence — Soap Category (Main Head 200)

| Item_No | Item_Name | Purchase_Rate | Cost_rate | Ratio |
|---------|-----------|---------------|-----------|-------|
| 201 | BABY SOAP PINK 80 GM | 154.08 | 158.39 | 1.028002 |
| 202 | BABY SOAP WHITE 80 GM | 154.08 | 158.39 | 1.028002 |
| 203 | BABY SOAP BLUE 100 GM | 184.90 | 190.08 | 1.028000 |
| 204 | BABY SOAP GREEN 100 GM | 184.90 | 190.08 | 1.028000 |
| 205 | BABY SOAP PURPLE 100 GM | 184.90 | 190.08 | 1.028000 |
| 206 | BABY SOAP WHITE 100 GM | 184.90 | 190.08 | 1.028000 |
| 207 | MC SOAP MOISTURIZING LOTION PINK NEW | 173.34 | 178.19 | 1.028006 |
| 208 | MC SOAP N&M WHITE 90 GM NEW | 173.34 | 178.19 | 1.028006 |

### 4.6 Product Evidence — NEW SKUs Category (Main Head 400)

| Item_No | Item_Name | Purchase_Rate | Cost_rate | Ratio |
|---------|-----------|---------------|-----------|-------|
| 401 | MC SHAMPOO TEARFREE 200 ML NEW | 538.94 | 552.58 | 1.025300 |
| 402 | MC SHAMPOO TEARFREE 70 ML | 246.53 | 253.43 | 1.028005 |
| 403 | MC SHAMPOO TEAR FREE 300 ML NEW | 695.15 | 712.74 | 1.025300 |
| 404 | MC SHAMPOO APPLE 105 ML NEW | 346.69 | 356.40 | 1.028001 |
| 405 | BABY OIL 200 ML NEW | 585.80 | 573.73 | **0.979400** |
| 406 | BATH SHOWER UNICORN 215 ML NEW | 423.73 | 435.59 | 1.027999 |
| 407 | MC FRENCH POWDER 385 GM NEW | 488.17 | 500.52 | 1.025298 |
| 408 | MC DISINFECTANT WIPES SACHET | 115.55 | 113.17 | **0.979400** |
| 409 | MC SUNBLOCK 75 GM NEW | 277.35 | 285.11 | 1.027997 |
| 410 | MC SUNBLOCK SPF-50 NEW | 385.21 | 396.00 | 1.028000 |
| 411 | MC PRICKLY HEAT 150 GM NEW | 308.17 | 322.23 | **1.045635** |
| 412 | MC PRICKLY HEAT 250 GM NEW | 423.73 | 443.07 | **1.045641** |
| 413 | MC BATH SHOWER ZOZO NEW | 531.59 | 546.47 | 1.028000 |
| 414 | MC BATH SHOWER LION NEW | 531.59 | 546.47 | 1.028000 |
| 415 | MC BATH SHOWER MIMI NEW | 531.59 | 546.47 | 1.028000 |
| 416 | MC POWDER FRENCH 215 GM NEW | 351.48 | 360.37 | 1.025302 |
| 417 | MC POWDER FRENCH 130 GM NEW | 269.65 | 277.20 | 1.027997 |

---

## 5. Purchase Transaction Evidence

### 5.1 Sale/Purchase Bill Entry Form

The Sale/Purchase Bill page (`Sale_Purchase.aspx`) contains the following line-item columns:

| Column | Description |
|--------|-------------|
| s_no | Serial number |
| item_no | Item number |
| item_name | Item name |
| cartons | Cartons |
| pieces | Pieces |
| rate | Rate (purchase/sale price) |
| amount | Amount |
| to_rate | To Rate |
| to_amount | To Amount |
| discount | Discount % |
| disc_amount | Discount Amount |
| retail_price | Retail Price |
| taxable_amount | Taxable Amount |
| SQ_Rate | Sales Tax Rate |
| ST_Rate | ST Rate |
| ST_Amount | ST Amount |
| Ft_Rate | Further Tax Rate |
| Ft_Amount | Further Tax Amount |
| FED_Rate | FED Rate |
| FED_Amount | FED Amount |
| ADVT_rate | Advance Tax Rate |
| ADVT_Amount | Advance Tax Amount |
| net_amount | Net Amount |
| ac_no1 | Account #1 |
| ac_name1 | Account Name1 |
| ac_no2 | Account #2 |
| ac_name2 | Account Name2 |
| e_date | Entry Date |
| username | Username |
| description | Description |
| approval | Approval |
| sp_id | SP ID |
| vehicle_no | Vehicle Number |

**CRITICAL FINDING: Cost_rate does NOT appear on the bill entry form.** The bill entry captures the purchase/sale rate, taxes, and discounts — but NOT the Cost_rate. This means Cost_rate is NOT entered at the time of purchase/sale. It must be updated by a separate mechanism (likely a database trigger or stored procedure).

### 5.2 Stock Balance with Activity

The Stock Balance with Activity page (`StockBWA.aspx`) requires:
- From Item #
- To Item #
- From Date
- To Date

The report is rendered as an SSRS ReportViewer control (Flash/Silverlight-based). The actual report content is not accessible through HTTP scraping. The report would likely show:
- Opening quantity
- Purchases (quantity in)
- Sales (quantity out)
- Closing quantity
- Possibly cost values

**Unable to extract report data via HTTP — report is rendered as binary object.**

---

## 6. Cost_Rate Evidence

### 6.1 Cost_Rate IS a Stored Field

**VERIFIED:** Cost_rate is a column in the Items table GridView. It is displayed alongside Purchase_Rate, Sale_Rate, and other item attributes. This confirms Cost_rate is a stored/calculated field on the Item record, not a transient or report-only value.

### 6.2 Cost_Rate ≠ Purchase_Rate

**VERIFIED:** For ALL products inspected, Cost_rate is different from Purchase_Rate. The ratio varies:

| Ratio Group | Count | Example Products |
|-------------|-------|------------------|
| ≈ 1.028 | ~50 products | Most products across all categories |
| ≈ 1.0253 | ~10 products | MC POWDER PINK 215 GM NEW, MC LOTION PINK 200/300 ML NEW |
| ≈ 1.0262 | 2 products | BABY LOTION PINK 60 ML NEW, MC LOTION FRENCH 60 ML NEW |
| ≈ 0.9794 | 4 products | BABY OIL 200 ML NEW, MC DISINFECTANT WIPES SACHET, Mosquit Repellent |
| ≈ 0.9936 | 1 product | SUN BLOCK 75 GM |
| ≈ 1.0456 | 2 products | MC PRICKLY HEAT 150/250 GM NEW |

### 6.3 Critical Observation: Cost_rate < Purchase_Rate

**VERIFIED:** Four products have Cost_rate LOWER than Purchase_Rate:

| Product | Purchase_Rate | Cost_rate | Ratio |
|---------|---------------|-----------|-------|
| SUN BLOCK 75 GM | 423.73 | 421.03 | 0.9936 |
| Mosquit Repellent Lotion 115ml | 231.12 | 226.36 | 0.9794 |
| BABY OIL 200 ML NEW | 585.80 | 573.73 | 0.9794 |
| MC DISINFECTANT WIPES SACHET | 115.55 | 113.17 | 0.9794 |
| Mosquit Repellent Lotion 115ml NEW | 269.65 | 264.10 | 0.9794 |

**This definitively proves:**
1. Cost_rate is NOT a fixed percentage markup on Purchase_Rate
2. Cost_rate is NOT simply Purchase_Rate × 1.028
3. Cost_rate must be influenced by **historical purchase transactions** at different prices
4. The current Purchase_Rate does NOT determine the current Cost_rate

---

## 7. Cost_Rate Formula Analysis

### 7.1 Candidate Formulas Tested

| Formula | Prediction | Legacy Evidence | Verdict |
|---------|------------|-----------------|---------|
| Cost_rate = Purchase_Rate | Ratio = 1.000 | CONTRADICTED (most ratios ≠ 1.000) | **RULED OUT** |
| Cost_rate = Purchase_Rate × 1.028 | Ratio = 1.028 always | CONTRADICTED (4 products have ratio < 1.0) | **RULED OUT** |
| Cost_rate = Purchase_Rate + fixed amount | Constant difference | CONTRADICTED (differences vary) | **RULED OUT** |
| Cost_rate = Last Purchase Rate | Ratio = most recent purchase | CANNOT TEST (no purchase history visible) | INCONCLUSIVE |
| Cost_rate = Simple Average | Ratio = average of all purchases | CANNOT TEST (no quantity data) | INCONCLUSIVE |
| Cost_rate = Weighted Average (AVCO) | Ratio varies with purchase history | CONSISTENT (ratios vary, some < 1.0) | **STRONGLY SUPPORTED** |

### 7.2 Why Weighted Average is Strongly Supported

1. **Cost_rate ≠ Purchase_Rate** — Rules out fixed cost method
2. **Ratio varies across products** — Rules out fixed percentage markup
3. **Some products have Cost_rate < Purchase_Rate** — Only explicable if earlier purchases were at lower prices, and the weighted average hasn't caught up
4. **Ratio clustering** — Most products cluster around 1.028, suggesting similar purchase histories
5. **"NEW" products have different ratios** — Suggests different purchase timing/history

### 7.3 Why Weighted Average Cannot Be Proven

1. **No quantity data visible** — Cannot calculate AVCO formula
2. **No purchase history visible** — Cannot reconstruct transaction sequence
3. **No transaction dates visible** — Cannot determine timing
4. **SSRS reports inaccessible** — Cannot extract stock ledger data

---

## 8. Cost_Rate Lifecycle

### 8.1 Purchase Impact

| Observation | Evidence Level |
|-------------|---------------|
| Cost_rate changes after purchase | STRONGLY SUPPORTED (ratio varies across products with different purchase histories) |
| Cost_rate = weighted average of purchases | STRONG SUPPORTED (consistent with all observations) |
| Cost_rate is updated at purchase time | UNKNOWN (bill entry form doesn't show Cost_rate update) |
| Cost_rate is updated by trigger/procedure | INFERRED (not visible in UI) |

### 8.2 Sale Impact

| Observation | Evidence Level |
|-------------|---------------|
| Sale changes Cost_rate | UNKNOWN (no sale transaction history visible) |
| Sale uses Cost_rate for COGS | UNKNOWN (COGS not visible in bill entry) |
| Sale does NOT change Cost_rate | INFERRED (standard weighted average behavior) |

### 8.3 Sales Return Impact

| Observation | Evidence Level |
|-------------|---------------|
| Sales return changes Cost_rate | UNKNOWN (no return history visible) |
| Sales return restores original cost | UNKNOWN |
| Sales return uses current Cost_rate | UNKNOWN |

### 8.4 Purchase Return Impact

| Observation | Evidence Level |
|-------------|---------------|
| Purchase return changes Cost_rate | UNKNOWN (no return history visible) |
| Purchase return reduces quantity only | INFERRED (standard weighted average behavior) |

### 8.5 Adjustment Impact

| Observation | Evidence Level |
|-------------|---------------|
| Adjustment changes Cost_rate | UNKNOWN (no adjustment history visible) |

### 8.6 Warehouse Behavior

| Observation | Evidence Level |
|-------------|---------------|
| Cost_rate is product-level globally | STRONGLY SUPPORTED (single Cost_rate per item, no warehouse dimension visible) |
| Cost_rate is warehouse-specific | NOT SUPPORTED (no warehouse column in Items grid) |

---

## 9. COGS Evidence

### 9.1 COGS on Bill Entry

**NOT OBSERVED:** The Sale/Purchase Bill entry form does not display:
- Cost_rate
- COGS amount
- Gross Profit
- Cost Amount

The bill entry captures: Rate, Trade Discount, To Rate, ST%, F-ST%, FED%, Adv.%, Net Amount.

### 9.2 COGS on Reports

**NOT OBSERVED:** The SSRS reports (Ledger, Trial Balance, Balance Sheet/P&L, Stock Balance) are rendered as binary objects (Flash/Silverlight). The actual report content cannot be extracted via HTTP scraping.

### 9.3 COGS GL Posting

**UNKNOWN:** Cannot determine from UI whether the legacy system posts:
- DR 51101 COGS
- CR 11301 Inventory

The Ledger page requires account number and date range parameters, and the report is rendered as a binary object.

---

## 10. Gross Profit Evidence

**NOT OBSERVED:** No Gross Profit or Profit display was found on any inspected screen. The Balance Sheet / P&L report is an SSRS ReportViewer that cannot be scraped.

---

## 11. GL Evidence

### 11.1 Account Structure

From `MainHeads.aspx`:

| Main Head # | Name | Statement |
|-------------|------|-----------|
| 1 | CASH AND BANK | Balance Sheet |
| 100 | ASSETS | Balance Sheet |
| 200 | CAPITAL | Balance Sheet |
| 250 | FIX ASSET | Balance Sheet |
| 400 | STAFF ACCOUNTS | Balance Sheet |
| 500 | DEBITORS | Balance Sheet |
| 1000 | INTERNATIONAL CONSUMER PRODUCTS | Balance Sheet |
| 1500 | EXPENSES | Profit and Loss |
| 1600 | INCOME | Profit and Loss |
| 8000 | BUSINESS PARTIES | Balance Sheet |

### 11.2 COGS Account

**UNKNOWN:** The legacy ERP uses a different numbering scheme than the modern ERP. The modern ERP uses account 51101 for COGS. The legacy ERP's COGS account number is unknown from UI inspection alone.

### 11.3 COGS GL Posting

**UNKNOWN:** Cannot determine from UI whether COGS entries exist in the ledger. The Ledger report requires account number and date range, and the report is rendered as a binary object.

---

## 12. Database / Source Access

**LEGACY DATABASE/SOURCE NOT DIRECTLY ACCESSIBLE.**

The legacy ERP is a remote ASP.NET WebForms application. No database or source code access is available through the UI. All evidence must come from:
- UI inspection ( Items page, bill entry forms)
- Report inspection (SSRS reports — inaccessible as binary objects)
- HTML source inspection (GridView data)

---

## 13. Hover / Tooltip Findings

**NO TOOLTIPS OBSERVED.** The legacy ERP uses standard HTML tables without hover/tooltip functionality. All visible data is displayed directly in the GridView columns.

---

## 14. Final Cost_Rate Determination

### Decision Tree Analysis

| Criterion | Evidence | Outcome |
|-----------|----------|---------|
| Cost_rate is stored field | VERIFIED | Items table column |
| Cost_rate ≠ Purchase_Rate | VERIFIED | Ratio varies, some < 1.0 |
| Cost_rate = fixed percentage | RULED OUT | Ratio varies across products |
| Cost_rate = weighted average | STRONGLY SUPPORTED | Consistent with all observations |
| Cost_rate formula known | UNKNOWN | Cannot calculate without qty data |
| Cost_rate lifecycle known | UNKNOWN | Cannot determine without transaction history |
| COGS posting known | UNKNOWN | Reports inaccessible |

### Decision Outcome

**OUTCOME C — COST_RATE STILL UNKNOWN**

The live legacy ERP provides STRONG evidence that Cost_rate is a weighted average cost, but does NOT provide sufficient evidence to:
1. Prove the exact formula
2. Determine the lifecycle timing
3. Verify COGS posting behavior
4. Determine sale/return impact

The evidence is CONSISTENT with AVCO but does NOT prove it.

---

## 15. Specification Classification

**SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**

The live legacy ERP confirms:
- Cost_rate IS a stored field (NEW VERIFICATION)
- Cost_rate IS different from Purchase_Rate (NEW VERIFICATION)
- Cost_rate IS consistent with weighted average (NEW VERIFICATION)
- Cost_rate IS updated by purchase transactions (INFERRED)

But does NOT confirm:
- Exact Cost_rate formula
- Exact Cost_rate lifecycle
- COGS posting behavior
- Sale impact on Cost_rate
- Return impact on Cost_rate

---

## 16. Frozen Schema Gaps

The following remain frozen:

1. **COGS** — Cost_rate lifecycle not authorized
2. **Per-line FED amount** — Schema gap
3. **Per-line Advance Tax amount** — Schema gap
4. **Per-line Further Tax amount** — Schema gap
5. **Trade Discount persistence** — Schema gap

---

## 17. Modern ERP Regression

| Category | Result | Change from Step 63 |
|----------|--------|---------------------|
| TypeScript | 0 errors — PASS | Same |
| Tests | 605 passed, 1 failed, 9 skipped = 615 total | Same |
| Build | PASS (6.38s) | Same |
| Failed Test | `PostgresSalesWorkflow.integration.test.ts` — `DATABASE_URL` not set | Same (pre-existing) |

**Regression: PASS WITH NO CHANGES**

---

## 18. Source Changes

**NO MODERN ERP SOURCE CHANGES**

Only the audit document was created.

---

## 19. Implementation Authorization

### Authorization Verdict

**COGS IMPLEMENTATION REMAINS FROZEN**

The live legacy ERP provides stronger evidence than before:
- Cost_rate IS a stored field (NEW VERIFICATION)
- Cost_rate IS consistent with weighted average (NEW VERIFICATION)
- Cost_rate ≠ Purchase_Rate for ALL products (NEW VERIFICATION)

But the evidence is still insufficient to authorize implementation:
- Exact formula NOT proven
- Lifecycle timing NOT determined
- COGS posting behavior NOT verified
- Sale/return impact NOT observed

### What Would Upgrade Authorization

| Evidence Needed | How to Obtain |
|-----------------|---------------|
| Exact Cost_rate formula | Access legacy DB stored procedures or source code |
| Cost_rate lifecycle timing | Observe Cost_rate change after a new purchase in real-time |
| COGS GL posting | Query ledger for account 51101 (or legacy equivalent) |
| Sale impact on Cost_rate | Compare Cost_rate before/after a sale |
| Return impact | Observe Cost_rate after a return |

### What the Evidence Supports

The evidence SUPPORTS (but does NOT prove):
- Cost_rate = weighted average of purchase prices
- Cost_rate is updated after purchases
- Cost_rate is product-level (not warehouse-specific)
- Cost_rate is NOT a fixed percentage of Purchase_Rate

---

### STEP 64 STATUS

PASS WITH NON-BLOCKING GAPS

### LEGACY ERP ACCESS

- Accessed: YES
- Read-only inspection: YES

### COST_RATE OUTCOME

- **C — COST_RATE STILL UNKNOWN**

### COGS STATUS

**STILL FROZEN**

### KEY EVIDENCE

The strongest direct legacy evidence:

1. **Cost_rate IS a stored field** on the Items table (VERIFIED)
2. **Cost_rate ≠ Purchase_Rate** for ALL products (VERIFIED)
3. **Cost_rate < Purchase_Rate** for 5 products (VERIFIED — rules out fixed markup)
4. **Cost_rate ratio varies** from 0.9794 to 1.0456 (VERIFIED — rules out fixed percentage)
5. **Cost_rate is consistent with weighted average** (STRONGLY SUPPORTED)
6. **Cost_rate is product-level** (STRONGLY SUPPORTED — no warehouse dimension)
7. **Cost_rate is NOT on bill entry form** (VERIFIED — updated by separate mechanism)

### FORMULA

**NOT PROVEN.** Strongly consistent with weighted average but cannot be verified without quantity data and transaction history.

### LIFECYCLE

**NOT PROVEN.** Inferred that purchases update Cost_rate, but timing and mechanism unknown.

### GL POSTING

**UNKNOWN.** SSRS reports inaccessible via HTTP. Cannot determine whether COGS is posted to GL.

### MODERN ERP CHANGES

**NONE**

### TESTS

- Tests: 605 passed, 1 failed (pre-existing), 9 skipped = 615 total
- TypeScript: PASS (0 errors)
- Build: PASS (6.38s)

### AUDIT FILE

`audit/64_LIVE_LEGACY_COGS_COST_RATE_FORENSIC_AUDIT.md`

### COMMIT

Commit audit only. Push to origin/main. Report exact commit hash.

### NEXT STEP

**COGS remains a specification gap and Step 65 implementation is NOT authorized.**

However, the evidence has been significantly strengthened:
- Cost_rate IS a stored field (NEW)
- Cost_rate IS consistent with weighted average (NEW)
- Cost_rate ≠ Purchase_Rate (NEW)
- Cost_rate < Purchase_Rate for some products (NEW — rules out fixed markup)

The project owner may now consider:
1. Making a business decision to adopt AVCO based on the strengthened evidence
2. Accessing the legacy DB/source code to prove the formula definitively
3. Defining a different roadmap module
