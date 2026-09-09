# Step 61 — Legacy Evidence Recovery + Cost_Rate Resolution Audit

**Date:** 2026-09-09
**Baseline Commit:** aa2684f
**Scope:** READ-ONLY evidence recovery and specification resolution. No source code changes.

---

## 1. Executive Summary

Step 61 exhaustively searches the entire repository for any previously overlooked authoritative or semi-authoritative legacy evidence that could resolve the cost_rate specification gap identified in Step 60.

After searching:
- All 26 legacy HTML captures
- All 60+ audit/documentation files
- The MotherCare_System_Complete_Extract.md (1,088 lines)
- All SQL migration files
- All source code files
- All seed scripts
- All test files
- Searching for CSV, XLS, XLSX, JSON, XML, SQL dump, backup, and PDF files

**Result: NO NEW AUTHORITATIVE EVIDENCE FOUND.**

The repository contains zero historical transaction data files (no CSV, XLS, JSON, XML, SQL dumps, backups, or PDFs). The legacy SQL Server database is inaccessible. The legacy ASP.NET source code is absent. The legacy UI is unavailable for controlled testing.

One new observation: the sample data in MotherCare_System_Complete_Extract.md shows Cost_Rate is consistently ~2.8% higher than Purchase_Rate across all 19 items. This ratio is NOT consistent enough to uniquely determine a formula, and without transaction history (quantities, dates, purchase records), cost_rate cannot be reconstructed.

**Outcome: OUTCOME C — STILL UNKNOWN**

COGS status remains: **SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**

---

## 2. Step 60 Baseline

| Item | Step 60 Status | Step 61 Status |
|------|---------------|---------------|
| COGS Formula | VERIFIED | VERIFIED (unchanged) |
| COGS GL Rule | VERIFIED | VERIFIED (unchanged) |
| Cost_rate exists | VERIFIED | VERIFIED (unchanged) |
| Cost_rate ≠ Purchase_Rate | VERIFIED | VERIFIED (unchanged, new data confirms) |
| Cost_rate = weighted average | INFERRED | INFERRED (unchanged) |
| Cost_rate update timing | UNKNOWN | UNKNOWN (unchanged) |
| Return impact | UNKNOWN | UNKNOWN (unchanged) |
| Sale impact | UNKNOWN | UNKNOWN (unchanged) |
| COGS Readiness | SPECIFICATION GAP | SPECIFICATION GAP (unchanged) |

---

## 3. Repository Evidence Inventory

### Files Searched

| Category | Count | Findings |
|----------|-------|----------|
| Legacy HTML captures | 26 | Cost_rate column header in 07_items.html only |
| Audit documents (.md) | 60+ | All reference same source: 08_COSTING_ENGINE.md |
| SQL migration files | 3 | 001_initial.sql line 7: "cost_rate / COGS formula is UNKNOWN" |
| Source code files | 100+ | calculateCOGS exists but never called |
| Test files | 30+ | calculateCOGS unit test passes |
| Seed scripts | 3 | No cost_rate data |
| CSV files | 0 | NONE |
| XLS/XLSX files | 0 | NONE |
| JSON data files | 0 | Only config files (package.json, tsconfig.json, etc.) |
| XML files | 0 | NONE |
| SQL dump files | 0 | NONE |
| Database backup files | 0 | NONE |
| PDF files | 0 | NONE |

### Key Finding: Zero Historical Data Files

The repository contains **no historical transaction data** in any machine-readable format. All legacy evidence is captured in:
1. 26 HTML page saves (read-only, no interaction)
2. Markdown documentation files (reverse-engineered from UI observation)
3. One text-based data extract (MotherCare_System_Complete_Extract.md)

---

## 4. Legacy Database Availability

**STATUS: UNAVAILABLE**

| Check | Result |
|-------|--------|
| SQL Server connection string | NOT FOUND |
| ODBC/DSN references | NOT FOUND |
| SqlConnection/SqlCommand references | NOT FOUND |
| Database backup files (.bak, .mdf, .ldf) | NOT FOUND |
| SQL dump files | NOT FOUND |
| Supabase connection (new ERP only) | Available (.env) |

The legacy database at `38.92.47.89` is referenced only in documentation. No programmatic access exists.

---

## 5. Legacy Source Availability

**STATUS: UNAVAILABLE**

| Check | Result |
|-------|--------|
| .aspx files | NOT FOUND |
| .cs files (code-behind) | NOT FOUND |
| .vb files | NOT FOUND |
| .config files | NOT FOUND |
| .sln/.csproj files | NOT FOUND |
| Stored procedures (CREATE PROCEDURE) | NOT FOUND |
| Triggers (CREATE TRIGGER) | NOT FOUND |
| Functions (CREATE FUNCTION) | NOT FOUND |

The legacy ASP.NET source code is entirely absent from the repository.

---

## 6. Legacy UI Availability

**STATUS: UNAVAILABLE (captured HTML only)**

26 HTML page captures exist in `audit/` directory. These are full-page browser saves with:
- ViewState (encrypted server state)
- EventValidation tokens
- PostBack JavaScript functions
- GridView server control output

**No live interaction is possible.** These are static snapshots.

---

## 7. Historical Data Availability

**STATUS: UNAVAILABLE**

No transaction data files exist in any format:
- No purchase invoices or vouchers
- No sale invoices or vouchers
- No stock reports or registers
- No inventory valuation reports
- No item ledgers
- No CSV/XLS/JSON/XML exports
- No SQL dumps
- No PDF reports

---

## 8. Captured HTML Findings

### 07_items.html — The Only Cost_Rate Source

This is the **only** legacy HTML file containing Cost_rate data.

**GridView column header (line 269):**
```
Sale_Rate | Purchase_Rate | Retail_Price | ... | Cost_rate
```

**Sample data rows (lines 271-275):**
```
Item 2: Purchase_Rate=184.90, Sale_Rate=184.90, Cost_rate=190.08
Item 3: Purchase_Rate=231.12, Sale_Rate=231.12, Cost_rate=237.59
Item 4: Purchase_Rate=365.95, Sale_Rate=365.95, Cost_rate=376.20
```

**Form input fields (lines 202-207):**
- `txtitempurchaserate` — Purchase Rate input
- `txtitemsalerate` — Sale Rate input
- **No Cost_rate input field exists**

### Other HTML Files

All other 25 HTML files contain zero Cost_rate, COGS, Average, Weighted, 51101, or 11301 references. The only "Stock" references are navigation menu links to ItemLedger.aspx, StockBalance.aspx, and StockBWA.aspx.

---

## 9. Documentation Findings

### All Source Documents Agree

Every audit document that mentions Cost_rate traces back to the same original observations:

| Document | Line | Statement | Classification |
|----------|------|-----------|---------------|
| 08_COSTING_ENGINE.md | L14 | "Cost_rate appears in the Items GridView but has no input field" | VERIFIED |
| 08_COSTING_ENGINE.md | L17 | "Weighted Average: Cost_rate = Total Purchase Value / Total Quantity" | INFERRED |
| 08_COSTING_ENGINE.md | L18 | "Last Purchase Cost: Cost_rate = Most recent Purchase_Rate" | INFERRED |
| 08_COSTING_ENGINE.md | L19 | "Fixed: Cost_rate = Purchase_Rate" | INFERRED |
| 08_COSTING_ENGINE.md | L21 | "INFERRED: Most likely Weighted Average" | INFERRED |
| 08_COSTING_ENGINE.md | L44 | "Exact Cost_rate formula (requires database/procedure inspection)" | UNKNOWN |
| 08_COSTING_ENGINE.md | L45 | "Whether Cost_rate updates on each purchase" | UNKNOWN |
| 08_COSTING_ENGINE.md | L46 | "Whether Cost_rate is recalculated or manually set" | UNKNOWN |
| 08_COSTING_ENGINE.md | L47 | "Impact of returns on Cost_rate" | UNKNOWN |
| 16_CALCULATIONS.md | L160-161 | "Cost_rate is a stored/calculated field, NOT an input field" | VERIFIED |
| 16_CALCULATIONS.md | L163 | "Differs from Purchase_Rate (e.g., 184.90 vs 190.08)" | VERIFIED |
| 16_CALCULATIONS.md | L164 | "Likely calculated as weighted average or moving average cost" | INFERRED |
| MASTER_SPEC | L716-718 | "Cost_rate is a stored/calculated field" | VERIFIED |
| MASTER_SPEC | L720 | "Likely calculated as weighted average or moving average cost" | INFERRED |
| 30_WORKFLOW_CATALOG.md | L212-217 | "WORKFLOW: COST_RATE CALCULATION (VERIFIED)" | INFERRED |
| 28_UNVERIFIED_BEHAVIOR.md | L76-81 | "Cost_rate Calculation (VERIFIED)" | INFERRED |

### Critical Observation: "VERIFIED" vs "INFERRED"

Several documents use the label "VERIFIED" for the cost_rate workflow (e.g., `30_WORKFLOW_CATALOG.md` L212: "WORKFLOW: COST_RATE CALCULATION (VERIFIED)"). However, examining the content reveals:

- The workflow is described as: "1. Purchase bill is saved → 2. System calculates Cost_rate → 3. Cost_rate stored in Items table"
- This is based on **UI observation** (the GridView updates after purchase), NOT on source code or database inspection
- The calculation method ("weighted average or moving average") is explicitly labeled INFERRED

**The "VERIFIED" label applies to the OBSERVATION that cost_rate changes after purchase, NOT to the FORMULA or TIMING.**

---

## 10. Cost_Rate Evidence Matrix

| Question | Result | Evidence | Confidence |
|----------|--------|----------|------------|
| Does Cost_rate exist? | YES | 07_items.html L269, 08_COSTING_ENGINE.md L14 | VERIFIED |
| Is it a stored field? | YES | 16_CALCULATIONS.md L160-161, MASTER_SPEC L716 | VERIFIED |
| Is it calculated (not input)? | YES | No form input field exists, only GridView column | VERIFIED |
| Does it differ from Purchase_Rate? | YES | Sample data: 190.08 vs 184.90 | VERIFIED |
| Is it product-level? | YES | Appears on Items table (not per-warehouse) | VERIFIED |
| Is it single-warehouse scoped? | YES | Legacy has no warehouse concept | VERIFIED |
| What is the exact formula? | UNKNOWN | 08_COSTING_ENGINE.md L44: "requires database/procedure inspection" | UNKNOWN |
| Is it weighted average? | LIKELY | 08_COSTING_ENGINE.md L21: "Most likely Weighted Average" | INFERRED |
| Is it last purchase cost? | NOT RULED OUT | 08_COSTING_ENGINE.md L18 lists as possibility | UNKNOWN |
| Is it fixed? | CONTRADICTED | Cost_rate ≠ Purchase_Rate for all items | CONTRADICTED |
| Does it update on purchase? | LIKELY | 30_WORKFLOW_CATALOG.md L213-214 | INFERRED |
| Does it update on save vs post? | UNKNOWN | No evidence distinguishes save from post timing | UNKNOWN |
| Does sale change it? | UNKNOWN | No evidence found | UNKNOWN |
| Does purchase return change it? | UNKNOWN | 08_COSTING_ENGINE.md L47: NOT VERIFIED | UNKNOWN |
| Does sale return change it? | UNKNOWN | 08_COSTING_ENGINE.md L47: NOT VERIFIED | UNKNOWN |
| Does adjustment change it? | UNKNOWN | 07_INVENTORY_ENGINE.md L73: NOT OBSERVED | UNKNOWN |
| Is it recalculated synchronously? | UNKNOWN | No evidence found | UNKNOWN |
| Can it be reconstructed from data? | NO | No transaction history available | NOT AVAILABLE |

---

## 11. Historical Reconstruction Analysis

### Data Available for Reconstruction

The only numerical data is the 19-item sample in MotherCare_System_Complete_Extract.md:

| Item | Purchase_Rate | Cost_Rate | Ratio |
|------|--------------|-----------|-------|
| 2 | 184.90 | 190.08 | 1.02797 |
| 3 | 231.12 | 237.59 | 1.02799 |
| 4 | 365.95 | 376.20 | 1.02802 |
| 5 | 277.35 | 284.18 | 1.02822 |
| 6 | 184.90 | 190.08 | 1.02797 |
| 7 | 231.12 | 237.59 | 1.02799 |
| 8 | 385.21 | 395.03 | 1.02549 |
| 9 | 288.91 | 296.00 | 1.02454 |
| 10 | 277.35 | 284.18 | 1.02822 |
| 11 | 365.95 | 376.20 | 1.02802 |
| 12 | 308.17 | 316.11 | 1.02577 |
| 13 | 423.73 | 434.23 | 1.02478 |
| 14 | 351.48 | 360.15 | 1.02467 |
| 15 | 269.65 | 276.50 | 1.02543 |
| 16 | 199.93 | 205.54 | 1.02806 |
| 17 | 308.17 | 316.11 | 1.02577 |
| 18 | 423.73 | 434.23 | 1.02478 |
| 19 | 269.65 | 276.50 | 1.02543 |
| 20 | 199.93 | 205.54 | 1.02806 |

**Average ratio: ~1.027 (Cost_Rate ≈ Purchase_Rate × 1.027)**

### What This Data Proves

1. **Cost_Rate ≠ Purchase_Rate** — RATIO IS NOT 1.000 → Fixed cost method RULED OUT
2. **Cost_Rate > Purchase_Rate** for ALL items — consistent directional relationship
3. **Ratio varies slightly** (1.02454 to 1.02822) — NOT a simple fixed percentage of Purchase_Rate

### What This Data Does NOT Prove

1. **Cannot prove weighted average** — no quantity data available to test AVCO formula
2. **Cannot prove last purchase cost** — no purchase history available
3. **Cannot determine formula** — the ~2.8% difference could be:
   - Weighted average across multiple purchases
   - Purchase rate plus a fixed percentage overhead
   - Purchase rate plus partial tax inclusion
   - Any other formula

### Reconstruction Attempt: AVCO

To test AVCO, we need: `Cost_Rate = (PrevQty × PrevCost + PurchQty × PurchRate) / (PrevQty + PurchQty)`

**Data required but NOT AVAILABLE:**
- Opening quantity per item
- Opening cost per item
- Purchase quantities and dates
- Sale quantities and dates
- Return quantities and dates

**Result: CANNOT RECONSTRUCT — INSUFFICIENT DATA**

---

## 12. Formula Verification

### Tested Hypotheses

| Hypothesis | Formula | Test Result | Status |
|------------|---------|-------------|--------|
| Fixed cost | Cost_Rate = Purchase_Rate | CONTRADICTED (190.08 ≠ 184.90) | RULED OUT |
| Simple weighted average | Cost_Rate = TotalPurchaseValue / TotalQty | CANNOT TEST (no qty data) | INCONCLUSIVE |
| Last purchase cost | Cost_Rate = MostRecent Purchase_Rate | CANNOT TEST (no purchase history) | INCONCLUSIVE |
| Purchase + fixed % | Cost_Rate = Purchase_Rate × 1.027 | RATIO VARIES (1.024-1.028) | INCONCLUSIVE |
| Purchase + GST partial | Cost_Rate = Purchase_Rate + (GST × 0.15) | CLOSE MATCH for some items | INCONCLUSIVE |
| Purchase + overhead | Cost_Rate = Purchase_Rate + Overhead | NO EVIDENCE | UNKNOWN |

### Key Observation

The Cost_Rate/Purchase_Rate ratio is NOT perfectly constant (ranges from 1.02454 to 1.02822). This suggests the formula involves **quantities or multiple transactions**, not a simple fixed percentage. This is CONSISTENT with weighted average but does NOT prove it.

---

## 13. Purchase Timing Verification

### Evidence

From `30_WORKFLOW_CATALOG.md` L212-217:
```
### WORKFLOW: COST_RATE CALCULATION (VERIFIED)
1. Purchase bill is saved
2. System calculates Cost_rate (weighted average or moving average)
3. Cost_rate stored in Items table
```

**Analysis:**
- Step 1 says "Purchase bill is saved" — this could mean save (draft) or save+post
- In the legacy ASP.NET system, "save" typically means the PostBack/submit action
- The bill posting and stock update likely happen in the same server-side transaction
- **But we cannot distinguish "save" from "post" without source code access**

### Assessment

| Timing | Evidence | Confidence |
|--------|----------|------------|
| On purchase save | 30_WORKFLOW_CATALOG.md L213 | INFERRED |
| On purchase post | Same event likely | INFERRED |
| On GRN creation | No separate GRN concept observed | UNKNOWN |
| Before transaction commit | No evidence | UNKNOWN |
| After transaction commit | No evidence | UNKNOWN |
| Synchronously | No evidence | UNKNOWN |
| Asynchronously | No evidence | UNKNOWN |

**TIMING: UNVERIFIED**

---

## 14. Sale Impact Verification

### Evidence

From `04_ACCOUNTING_ENGINE.md` L96-103:
```
DEBIT: Cost of Goods Sold — Cost amount
CREDIT: Inventory/Stock — Cost amount
```

From `MASTER_SPEC` L598-599:
```
Bill -> Bill Lines -> Stock Decrease -> Customer Receivable -> 
Customer Ledger -> General Ledger -> COGS -> Profit -> Reports
```

**Analysis:**
- The sale reads Cost_rate to calculate COGS (COGS = Qty × Cost_rate)
- The sale decreases stock quantity
- Whether sale changes Cost_rate: NO EVIDENCE FOUND
- In standard weighted average systems, sale does NOT change unit cost — only quantity changes

### Assessment

| Behavior | Evidence | Confidence |
|----------|----------|------------|
| Sale reads Cost_rate for COGS | 04_ACCOUNTING_ENGINE.md L101 | VERIFIED |
| Sale decreases quantity | MASTER_SPEC L598 | VERIFIED |
| Sale changes Cost_rate | NO EVIDENCE | UNKNOWN |
| Sale only reduces quantity (standard) | Current ERP behavior | INFERRED (not legacy-verified) |

**SALE IMPACT: UNKNOWN** (standard behavior says quantity only, but not verified from legacy)

---

## 15. Return Impact Verification

### Evidence

From `08_COSTING_ENGINE.md` L47: "Impact of returns on Cost_rate" is listed under "Areas NOT VERIFIED."

From `MotherCare_System_Complete_Extract.md` L859-865:
```
| SRV | Sale Return Voucher | Increases stock | Reduces receivable |
| PRV | Purchase Return Voucher | Decreases stock | Reduces payable |
```

**Analysis:**
- Returns affect stock quantity (SRV increases, PRV decreases)
- Whether returns affect Cost_rate: **NO EVIDENCE FOUND**
- In standard weighted average systems:
  - Sale return (incoming): AVCO recalculated (same as purchase)
  - Purchase return (outgoing): quantity reduced, AVCO unchanged
- But this is standard behavior, NOT verified from legacy

### Assessment

| Behavior | Evidence | Confidence |
|----------|----------|------------|
| SRV increases stock | MotherCare extract L863 | VERIFIED |
| PRV decreases stock | MotherCare extract L864 | VERIFIED |
| SRV changes Cost_rate | NO EVIDENCE | UNKNOWN |
| PRV changes Cost_rate | NO EVIDENCE | UNKNOWN |

**RETURN IMPACT: UNKNOWN**

---

## 16. Adjustment Impact Verification

### Evidence

From `07_INVENTORY_ENGINE.md` L73-74:
```
## Stock Adjustments
**NOT OBSERVED** — No dedicated stock adjustment screen. 
INFERRED: adjustments may be done via journal entries.
```

From `MASTER_SPEC` L684: "Stock adjustment mechanism" is listed as UNKNOWN.

**Analysis:**
- No stock adjustment UI was observed in the legacy system
- Adjustments may be done via journal entries (which don't affect Cost_rate directly)
- Whether adjustments affect Cost_rate: **NO EVIDENCE FOUND**

### Assessment

| Behavior | Evidence | Confidence |
|----------|----------|------------|
| Adjustment mechanism exists | NOT OBSERVED | NOT OBSERVED |
| Adjustment changes Cost_rate | NO EVIDENCE | UNKNOWN |

**ADJUSTMENT IMPACT: UNKNOWN (mechanism itself NOT OBSERVED)**

---

## 17. Product/Warehouse Scope

### Evidence

From `07_items.html` L269: Cost_rate appears as a column in the Items GridView.

From `07_INVENTORY_ENGINE.md` L68:
```
## Warehouse Management
**NOT OBSERVED** — No warehouse selection in any form. 
INFERRED: single-warehouse system.
```

### Assessment

| Scope | Evidence | Confidence |
|-------|----------|------------|
| Product-level | Cost_rate on Items table | VERIFIED |
| Single-warehouse | No warehouse concept observed | VERIFIED |
| Not per-batch | No batch tracking observed | VERIFIED |
| Not per-location | No location concept observed | VERIFIED |

**LEGACY SCOPE: PRODUCT-LEVEL / SINGLE-WAREHOUSE**

---

## 18. Current ERP Comparison

| Aspect | Legacy Cost_rate | Current ERP unitCost | Match |
|--------|-----------------|---------------------|-------|
| Stored field | YES (Items table) | YES (stock_levels table) | MATCH |
| Calculated, not input | VERIFIED | YES (AVCO) | MATCH |
| Used for COGS | VERIFIED | YES (calculateCOGS exists) | MATCH |
| Used for stock value | VERIFIED | YES (calculateStockValue) | MATCH |
| Formula = weighted average | INFERRED | VERIFIED (AVCO) | LIKELY MATCH |
| Updated on GRN | INFERRED | YES (AVCO recalc) | LIKELY MATCH |
| Updated on ISSUE | UNKNOWN | NO (quantity only) | UNKNOWN |
| Scope | Product-level | Product + Warehouse | DIFFERENT |
| Timing | UNKNOWN | Synchronous in transaction | UNKNOWN |

---

## 19. Decision Matrix

### OUTCOME: OUTCOME C — STILL UNKNOWN

No authoritative evidence resolves the cost_rate lifecycle/timing question.

| Criterion | Status |
|-----------|--------|
| Formula established? | NO — only INFERRED as weighted average |
| Update event established? | LIKELY purchase — but not VERIFIED from source |
| Timing established? | NO |
| Sale consumption established? | COGS formula known, but Cost_rate source value unknown |
| Return behavior established? | NO |
| Full lifecycle documented? | NO |

### What Would Change This

Only one of these would resolve the gap:

1. **Legacy SQL Server database access** — inspect Items table, stored procedures, triggers
2. **Legacy ASP.NET source code** — trace Cost_rate calculation in code-behind
3. **Controlled legacy UI testing** — create purchase, observe Cost_rate change
4. **Business decision** — adopt AVCO (implementation choice, not legacy verification)

None of these are available.

---

## 20. Frozen Gaps

| # | Gap | Classification | Status |
|---|-----|---------------|--------|
| 1 | Per-line FED amount | SCHEMA GAP | UNCHANGED |
| 2 | Per-line Advance Tax amount | SCHEMA GAP | UNCHANGED |
| 3 | Per-line Further Tax amount | SCHEMA GAP | UNCHANGED |
| 4 | Trade Discount persistence | SCHEMA GAP | UNCHANGED |
| 5 | COGS Cost_rate lifecycle | SPECIFICATION GAP | UNCHANGED |

---

## 21. Regression Results

| Category | Result |
|----------|--------|
| Source Changes | NONE — READ-ONLY audit |
| TypeScript | 0 errors — PASS |
| Tests | 605 passed, 1 failed (pre-existing), 9 skipped = 615 total |
| Build | PASS (24.16s) |

The single failed test (`PostgresSalesWorkflow.integration.test.ts` — "PostgreSQL connection is available when DATABASE_URL is set") is pre-existing from Step 60 and is NOT caused by this audit.

---

## 22. Final Recommendation

### Immediate: No Change

COGS remains **SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**. No implementation should proceed.

### Evidence Recovery Complete

Step 61 has exhaustively searched the repository. No previously overlooked evidence exists. The cost_rate specification gap cannot be resolved from available resources.

### Path Forward

The cost_rate gap has been persistent since Step 45 (pre-Supabase audit). After Steps 45, 47, 48, 49, 50, 52, 56, 57, 58, 59, 60, and now 61, the classification remains unchanged.

A business decision is needed:

| Option | Action | Consequence |
|--------|--------|-------------|
| **A** | Access legacy database/source | Gap resolves with evidence |
| **B** | Perform controlled legacy UI testing | Gap resolves with evidence |
| **C** | Adopt AVCO as implementation decision | Gap resolves by design choice (not legacy verification) |
| **D** | Defer COGS indefinitely | Gap remains frozen |

**Note:** Option C would be a NEW CURRENT-ERP DESIGN DECISION, not legacy parity verification. The current ERP already implements AVCO correctly — it just needs to be connected to COGS posting.

---

### STEP 61 STATUS

PASS (audit complete, no source changes)

### LEGACY DB

UNAVAILABLE

### LEGACY SOURCE

UNAVAILABLE

### LEGACY UI

UNAVAILABLE (captured HTML only)

### HISTORICAL DATA

UNAVAILABLE (no data files exist)

### COST_RATE FORMULA

UNKNOWN (INFERRED weighted average, not VERIFIED)

### COST_RATE = AVCO

INFERRED (not VERIFIED from authoritative source)

### PURCHASE UPDATE

INFERRED (workflow catalog says "on purchase save")

### SALE IMPACT

UNKNOWN (COGS reads Cost_rate, but sale effect on Cost_rate unknown)

### RETURN IMPACT

UNKNOWN

### COST_RATE TIMING

UNKNOWN

### COGS READINESS

SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND

### FROZEN SCHEMA GAPS

1. Per-line FED amount
2. Per-line Advance Tax amount
3. Per-line Further Tax amount
4. Trade Discount persistence
5. COGS Cost_rate lifecycle

### TESTS

605 passed, 1 failed (pre-existing), 9 skipped = 615 total

### TYPESCRIPT

PASS

### BUILD

PASS

### SOURCE CHANGES

NONE

### AUDIT FILE

`audit/61_LEGACY_EVIDENCE_RECOVERY_AND_COST_RATE_RESOLUTION.md`

### COMMIT

Commit audit only. Push to origin/main. Report exact commit hash.
