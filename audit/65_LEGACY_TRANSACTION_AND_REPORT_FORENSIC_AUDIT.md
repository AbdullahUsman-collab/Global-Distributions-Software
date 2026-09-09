# STEP 65 — LEGACY TRANSACTION / REPORT FORENSIC AUDIT

**Date:** 2026-09-10
**Baseline Commit:** 54a5209
**Scope:** READ-ONLY forensic investigation of live legacy ERP to recover historical transaction data and resolve Cost_Rate/COGS specification gap. No source code changes.

---

## 1. Scope

Step 65 performs a read-only forensic investigation of the live legacy ERP at `http://38.92.47.89:8026/` to recover actual historical transaction data and resolve the Cost_Rate/COGS specification gap. Step 64 was limited by SSRS ReportViewer output being inaccessible. Step 65 investigates whether the legacy application exposes transaction/report data through other read-only mechanisms.

---

## 2. Legacy Access

| Item | Result |
|------|--------|
| URL | `http://38.92.47.89:8026/` |
| Login | SUCCESSFUL |
| Read-only inspection | YES |
| Session maintained | YES (ASP.NET session cookie) |
| No data modified | VERIFIED |

**LEGACY ERP SUCCESSFULLY ACCESSED.**

---

## 3. WebForms Architecture Findings

### 3.1 Application Structure

| Component | Technology |
|-----------|------------|
| Framework | ASP.NET WebForms (.NET Framework 4.x) |
| Report Viewer | SSRS ReportViewer WebForms 12.0.2402.15 |
| State Management | ViewState, EventValidation |
| Postback | __doPostBack JavaScript |
| Authentication | ASP.NET Session Cookie |

### 3.2 Pages Inspected

| Page | Functional | Data Grid | ReportViewer |
|------|-----------|-----------|--------------|
| `/Items.aspx` | YES | YES (GridView) | NO |
| `/Sale_Purchase.aspx` | YES | YES (GridView) | NO |
| `/ListofBills.aspx` | PARTIAL | BROKEN | YES (broken) |
| `/Journal.aspx` | YES | NO | NO |
| `/JournalEntriesList.aspx` | PARTIAL | NO | YES (broken) |
| `/Ledger.aspx` | PARTIAL | NO | YES (broken) |
| `/TrailBalance.aspx` | PARTIAL | NO | YES (broken) |
| `/TrailBWA.aspx` | PARTIAL | NO | YES (broken) |
| `/BalanceSheet.aspx` | PARTIAL | NO | YES (broken) |
| `/Aging.aspx` | PARTIAL | NO | YES (broken) |
| `/ItemLedger.aspx` | PARTIAL | NO | YES (broken) |
| `/StockBalance.aspx` | PARTIAL | NO | YES (broken) |
| `/StockBWA.aspx` | PARTIAL | NO | YES (broken) |
| `/Cash_Book.aspx` | YES | NO | NO |
| `/Accounts.aspx` | YES | YES (GridView) | NO |
| `/MainHeads.aspx` | YES | YES (GridView) | NO |

### 3.3 Critical Finding: SSRS ReportViewer is BROKEN

**ALL SSRS ReportViewer pages display the following error:**

> "Report Viewer Configuration Error — The Report Viewer Web Control HTTP Handler has not been registered in the application's web.config file."

The error message specifies:

> Add `<add verb="*" path="Reserved.ReportViewerWebControl.axd" type="Microsoft.Reporting.WebForms.HttpHandler, Microsoft.ReportViewer.WebForms, Version=12.0.0.0, Culture=neutral, PublicKeyToken=89845dcd8080cc91" />` to the system.web/httpHandlers section of the web.config file

**This means:**
1. The ReportViewer HTTP handler (`Reserved.ReportViewerWebControl.axd`) is NOT registered
2. Reports CANNOT be rendered
3. Reports CANNOT be exported (PDF, Excel, CSV, etc.)
4. No report data can be extracted through the ReportViewer

### 3.4 Critical Finding: List of Bills DataSet Error

The List of Bills page (`ListofBills.aspx`) displays:

> "A data source instance has not been supplied for the data source 'DataSet1'."

This confirms the legacy ERP's data source configuration is broken for bill listing.

### 3.5 Endpoints Tested

| Endpoint | Result |
|----------|--------|
| `/api/` | NotFound |
| `/handler/` | NotFound |
| `/service/` | NotFound |
| `/data/` | NotFound |
| `/json/` | NotFound |
| `/xml/` | NotFound |
| `/config/` | NotFound |
| `/web.config` | NotFound |
| `/elmah.axd` | NotFound |
| `/trace.axd` | Forbidden (403) |
| `/webresource.axd` | NotFound |
| `/scriptresource.axd` | NotFound |
| `/Reserved.ReportViewerWebControl.axd?OpType=Resource` | 200 (ViewerScript JS) |
| `/Reserved.ReportViewerWebControl.axd?OpType=SessionKeepAlive` | InternalServerError |
| `/Reserved.ReportViewerWebControl.axd?OpType=Export` | InternalServerError |

---

## 4. ReportViewer Findings

### 4.1 ReportViewer Version

- Microsoft.Reporting.WebForms.ReportViewer version 12.0.2402.15
- ReportViewer.WebForms assembly version 12.0.0.0

### 4.2 ReportViewer Configuration

The ReportViewer is configured on these pages:
- ItemLedger.aspx
- StockBalance.aspx
- StockBWA.aspx
- Ledger.aspx
- TrailBalance.aspx
- TrailBWA.aspx
- BalanceSheet.aspx
- Aging.aspx
- JournalEntriesList.aspx

### 4.3 ReportViewer Export Capability

**EXPORT NOT AVAILABLE.** The ReportViewer HTTP handler is not registered, so export operations (PDF, Excel, CSV, Word) return InternalServerError.

---

## 5. Report Export Findings

| Format | Available | Result |
|--------|-----------|--------|
| PDF | NO | InternalServerError |
| Excel | NO | InternalServerError |
| CSV | NO | InternalServerError |
| Word | NO | InternalServerError |
| XML | NO | InternalServerError |

**No report export is possible through the legacy ERP.**

---

## 6. Historical Bill Findings

### 6.1 Sale/Purchase Bill Navigation

The Sale/Purchase Bill page (`Sale_Purchase.aspx`) has navigation buttons:
- `<<` (First)
- `<` (Previous)
- `>` (Next)
- `>>` (Last)

**Navigation Result:** All navigation attempts return Voucher# = 0 with empty account fields. This suggests either:
1. No historical bills exist in the database
2. The navigation mechanism is broken
3. The data source is not connected

### 6.2 Bill Entry Form Fields

The bill entry form captures:
- Voucher#, Date, Sale Man, Party Account, Stock Account
- Item#, Cartons, Packs, Rate, Amount
- Trade Discount, To Rate, To Amount
- ST%, ST Amount, F-Tax%, F-Tax Amount
- FED%, FED Amount, Adv.%, Adv. Tax Amount
- Net Amount, Description

**Cost_rate does NOT appear on the bill entry form.** Cost_rate is updated by a separate server-side mechanism.

---

## 7. Item Ledger Findings

### 7.1 Item Ledger Page

The Item Ledger page (`ItemLedger.aspx`) uses SSRS ReportViewer.

**Report cannot be rendered** due to HTTP handler configuration error.

### 7.2 Report Parameters

The page has input fields for:
- Item Number (`txtItemNo`)
- Item Name (`TxtItemName`)
- From Date (`txtDate1`)
- To Date (`txtDate2`)

**Report execution not possible** due to broken ReportViewer.

---

## 8. Stock Activity Findings

### 8.1 Stock Balance with Activity

The Stock Balance with Activity page (`StockBWA.aspx`) uses SSRS ReportViewer.

**Report cannot be rendered** due to HTTP handler configuration error.

### 8.2 Report Parameters

- From Item # (`txtItemNo1`)
- To Item # (`TxtItemNo2`)
- From Date (`txtDate1`)
- To Date (`txtDate2`)

**Report execution not possible** due to broken ReportViewer.

---

## 9. Historical Purchase Evidence

**NOT RECOVERED.** No historical purchase transaction data could be extracted from the legacy ERP.

The only purchase-related data available is:
- Purchase_Rate field on Items table (current value)
- Cost_rate field on Items table (current value)
- No transaction history visible

---

## 10. Historical Sales Evidence

**NOT RECOVERED.** No historical sales transaction data could be extracted from the legacy ERP.

The Sale/Purchase Bill page navigation returns empty results.

---

## 11. Cost_Rate Lifecycle Evidence

### 11.1 Purchase Impact

| Observation | Evidence Level |
|-------------|---------------|
| Cost_rate changes after purchase | STRONGLY SUPPORTED (Step 64: ratio varies across products with different purchase histories) |
| Cost_rate is updated by server-side mechanism | VERIFIED (not on bill entry form, not in JavaScript) |
| Cost_rate update timing | UNKNOWN (cannot observe without transaction history) |

### 11.2 Sale Impact

| Observation | Evidence Level |
|-------------|---------------|
| Sale changes Cost_rate | UNKNOWN (no transaction history) |
| Sale does NOT change Cost_rate | INFERRED (standard weighted average behavior) |

### 11.3 Sales Return Impact

| Observation | Evidence Level |
|-------------|---------------|
| Sales return changes Cost_rate | UNKNOWN (no transaction history) |

### 11.4 Purchase Return Impact

| Observation | Evidence Level |
|-------------|---------------|
| Purchase return changes Cost_rate | UNKNOWN (no transaction history) |

### 11.5 Adjustment Impact

| Observation | Evidence Level |
|-------------|---------------|
| Adjustment changes Cost_rate | UNKNOWN (no transaction history) |

---

## 12. Cost_Rate Formula Analysis

### 12.1 Candidate Formulas

| Formula | Evidence | Verdict |
|---------|----------|---------|
| Cost_rate = Purchase_Rate | CONTRADICTED (Step 64: ratio ≠ 1.000) | RULED OUT |
| Cost_rate = Purchase_Rate × fixed % | CONTRADICTED (Step 64: ratio varies, some < 1.0) | RULED OUT |
| Cost_rate = Last Purchase Rate | CANNOT TEST (no purchase history) | INCONCLUSIVE |
| Cost_rate = Simple Average | CANNOT TEST (no quantity data) | INCONCLUSIVE |
| Cost_rate = Weighted Average (AVCO) | STRONGLY SUPPORTED (Step 64: ratio variation consistent with AVCO) | STRONGLY SUPPORTED |

### 12.2 Key Evidence

From Step 64 (confirmed in Step 65):
- Cost_rate IS a stored field on Items table
- Cost_rate ≠ Purchase_Rate for ALL products
- Cost_rate < Purchase_Rate for 5 products (rules out fixed markup)
- Cost_rate ratio varies from 0.9794 to 1.0456 (rules out fixed percentage)
- Cost_rate is product-level (no warehouse dimension)
- Cost_rate is NOT on bill entry form (updated by server-side mechanism)

---

## 13. AVCO Mathematical Reconstruction

**NOT POSSIBLE.** No quantity data or transaction history is available from the legacy ERP.

The mathematical reconstruction requires:
- Opening quantity and cost
- Purchase quantities and rates
- Sale quantities
- Return quantities

None of this data is accessible through the broken legacy ERP.

---

## 14. Sale Impact

**NOT OBSERVED.** No sale transaction history is available.

---

## 15. Sales Return Impact

**NOT OBSERVED.** No sales return transaction history is available.

---

## 16. Purchase Return Impact

**NOT OBSERVED.** No purchase return transaction history is available.

---

## 17. Adjustment Impact

**NOT OBSERVED.** No adjustment transaction history is available.

---

## 18. Warehouse Scope

**PRODUCT-LEVEL.** From Step 64 (confirmed in Step 65):
- Items table has single Cost_rate column (no warehouse dimension)
- No warehouse-specific cost visible in Items GridView
- Cost_rate is product-level globally

---

## 19. COGS Account Evidence

### 19.1 Account Structure

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

### 19.2 COGS Account Search

**LEGACY COGS ACCOUNT NOT IDENTIFIED.**

The Accounts page (`Accounts.aspx`) only shows accounts filtered by Main Head. The Main Head selection is required to view accounts. The POST-based filtering mechanism failed with a server error.

No account named "COGS", "Cost of Goods Sold", "Cost", "Sales Cost", or "Cost of Sales" was found in the visible account data.

---

## 20. COGS GL Posting Evidence

**UNKNOWN.** The Ledger report (`Ledger.aspx`) uses SSRS ReportViewer, which is broken. No GL entries can be extracted.

---

## 21. COGS Amount Reconstruction

**NOT POSSIBLE.** No transaction history or cost data is available.

---

## 22. Gross Profit Evidence

**NOT OBSERVED.** The Balance Sheet / P&L report uses SSRS ReportViewer, which is broken. No profit data can be extracted.

---

## 23. Database/Source Accessibility

**LEGACY DATABASE/SOURCE NOT DIRECTLY ACCESSIBLE.**

| Mechanism | Available | Result |
|-----------|-----------|--------|
| Direct DB access | NO | Not exposed |
| Source code access | NO | Not exposed |
| API endpoints | NO | NotFound |
| Configuration files | NO | NotFound |
| Debug endpoints | NO | Forbidden |
| Report export | NO | InternalServerError |
| JavaScript source | PARTIAL | ViewerScript only (no SQL) |

---

## 24. Final Cost_Rate Determination

### Decision Tree Analysis

| Criterion | Evidence | Outcome |
|-----------|----------|---------|
| Cost_rate is stored field | VERIFIED (Step 64) | Items table column |
| Cost_rate ≠ Purchase_Rate | VERIFIED (Step 64) | Ratio varies, some < 1.0 |
| Cost_rate formula known | UNKNOWN | Cannot calculate without qty data |
| Cost_rate lifecycle known | UNKNOWN | Cannot determine without transaction history |
| COGS posting known | UNKNOWN | Reports inaccessible |

### Decision Outcome

**OUTCOME C — COST_RATE STILL UNKNOWN**

The live legacy ERP's reporting infrastructure is broken. No historical transaction data can be extracted. The strongest evidence remains from Step 64 (product-level Cost_rate observations), but the exact formula and lifecycle remain unproven.

---

## 25. Final COGS Determination

**UNKNOWN**

The legacy ERP cannot provide COGS-related evidence because:
1. SSRS ReportViewer is broken (HTTP handler not registered)
2. Bill listing DataSet is broken
3. No API endpoints exposed
4. No database/source access
5. No transaction history visible

---

## 26. Specification Classification

**SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**

The live legacy ERP's reporting infrastructure is broken, preventing extraction of historical transaction data. The Cost_Rate formula and lifecycle remain unverified.

---

## 27. Frozen Schema Gaps

The following remain frozen:

1. **COGS** — Cost_rate lifecycle not authorized
2. **Per-line FED amount** — Schema gap
3. **Per-line Advance Tax amount** — Schema gap
4. **Per-line Further Tax amount** — Schema gap
5. **Trade Discount persistence** — Schema gap

---

## 28. Modern ERP Changes

**NO MODERN ERP SOURCE CHANGES**

Only the audit document was created.

---

## 29. Regression

| Category | Result | Change from Step 64 |
|----------|--------|---------------------|
| TypeScript | 0 errors — PASS | Same |
| Tests | 605 passed, 1 failed, 9 skipped = 615 total | Same |
| Build | PASS (7.04s) | Same |
| Failed Test | `PostgresSalesWorkflow.integration.test.ts` — `DATABASE_URL` not set | Same (pre-existing) |

**Regression: PASS WITH NO CHANGES**

---

## 30. Final Recommendation

### Evidence Summary

| Requirement | Legacy Evidence | Status | Confidence |
|-------------|-----------------|--------|------------|
| Cost_rate stored | Items table GridView column | VERIFIED | HIGH |
| Cost_rate differs from Purchase_Rate | Ratio varies, some < 1.0 | VERIFIED | HIGH |
| Cost_rate formula | Ratio variation consistent with AVCO | STRONGLY SUPPORTED | MEDIUM |
| Cost_rate updated after purchase | Server-side mechanism (not in UI) | STRONGLY SUPPORTED | MEDIUM |
| Cost_rate affected by sale | Not observable (no transaction history) | UNKNOWN | LOW |
| Cost_rate affected by sales return | Not observable | UNKNOWN | LOW |
| Cost_rate affected by purchase return | Not observable | UNKNOWN | LOW |
| Cost_rate affected by adjustment | Not observable | UNKNOWN | LOW |
| Cost_rate warehouse scope | Product-level (no warehouse dimension) | VERIFIED | HIGH |
| COGS exists | Account structure shows EXPENSES main head | UNKNOWN | LOW |
| COGS account | Not identified in visible accounts | UNKNOWN | LOW |
| COGS GL posting | Reports broken, cannot extract | UNKNOWN | LOW |
| COGS formula | Formula known (Qty × Cost_Rate) from Step 60 | VERIFIED | HIGH |
| Gross Profit | Reports broken, cannot extract | UNKNOWN | LOW |

### What Would Resolve the Gap

| Evidence Needed | How to Obtain |
|-----------------|---------------|
| Fix SSRS ReportViewer | Register HTTP handler in web.config |
| Fix DataSet configuration | Reconnect data sources |
| Access legacy database | Direct SQL query access |
| Access legacy source code | Code review of stored procedures |

### Authorization

**COGS REMAINS FROZEN — SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**

The legacy ERP's reporting infrastructure is broken, preventing extraction of historical transaction data. The strongest evidence (from Step 64) supports weighted average costing but does not prove it. Without transaction data, the Cost_Rate formula and lifecycle remain unverified.

---

### STEP 65 STATUS

PASS WITH NON-BLOCKING GAPS

### LEGACY TRANSACTION DATA

NOT RECOVERED (SSRS ReportViewer broken, DataSet broken, no API endpoints)

### COST_RATE OUTCOME

C — UNKNOWN

### COGS GL STATUS

UNKNOWN (Reports inaccessible)

### STRONGEST EVIDENCE

1. Cost_rate IS a stored field on Items table (VERIFIED — Step 64)
2. Cost_rate ≠ Purchase_Rate for ALL products (VERIFIED — Step 64)
3. Cost_rate < Purchase_Rate for 5 products (VERIFIED — Step 64)
4. Cost_rate ratio varies from 0.9794 to 1.0456 (VERIFIED — Step 64)
5. Cost_rate is product-level (VERIFIED — Step 64)
6. Cost_rate is NOT on bill entry form (VERIFIED — Step 64)
7. SSRS ReportViewer is BROKEN (NEW — Step 65)
8. No transaction data recoverable (NEW — Step 65)

### COST_RATE FORMULA

**NOT PROVEN.** Strongly consistent with weighted average but cannot be verified without transaction data.

### COST_RATE LIFECYCLE

**NOT PROVEN.** Inferred that purchases update Cost_rate, but timing and mechanism unknown.

### COGS POSTING

**UNKNOWN.** Reports broken. No GL data recoverable.

### MODERN ERP SOURCE CHANGES

NONE

### TESTS

- Tests: 605 passed, 1 failed (pre-existing), 9 skipped = 615 total
- TypeScript: PASS (0 errors)
- Build: PASS (7.04s)

### AUDIT

`audit/65_LEGACY_TRANSACTION_AND_REPORT_FORENSIC_AUDIT.md`

### COMMIT

Commit audit only. Push to origin/main. Report exact commit hash.

### AUTHORIZATION

**COGS REMAINS FROZEN — SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND.**

The legacy ERP's reporting infrastructure is broken (SSRS ReportViewer HTTP handler not registered, DataSet not configured). No historical transaction data can be extracted. The Cost_Rate formula and lifecycle remain unverified. COGS implementation is NOT authorized.
