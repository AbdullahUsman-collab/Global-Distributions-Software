# Step 60 — COGS Cost_Rate Specification Verification

**Date:** 2026-09-09
**Baseline Commit:** 952a5a6
**Scope:** READ-ONLY specification verification. No source code changes.

---

## 1. Executive Summary

Step 60 attempts to resolve the single outstanding COGS specification question: **what is the authoritative legacy behavior of cost_rate?**

After exhaustive search of the entire repository — all 60+ audit documents, all source code files, all SQL migrations, all test files, all seed scripts, and all legacy data captures — the conclusion is:

**COST_RATE TIMING REMAINS UNVERIFIED.**

The legacy SQL Server database is NOT accessible. The legacy ASP.NET source code is NOT present in the repository. The legacy UI at `http://38.92.47.89:8026/` is NOT available for controlled testing. The only evidence available is:

1. **26 captured HTML pages** from the legacy UI (read-only, no interaction possible)
2. **60+ audit/documentation files** reverse-engineered from the legacy system
3. **One sample data table** showing Cost_rate values that differ from Purchase_Rate

From these evidence sources, the following is established:

| Fact | Confidence | Evidence |
|------|-----------|----------|
| Cost_rate is a stored/calculated field | VERIFIED | 08_COSTING_ENGINE.md L14, 16_CALCULATIONS.md L160-161, MASTER_SPEC L716-718 |
| Cost_rate differs from Purchase_Rate | VERIFIED | Sample data: Purchase_Rate=184.90, Cost_rate=190.08 |
| Cost_rate is NOT an input field | VERIFIED | Appears in GridView only, no form input |
| Cost_rate formula is weighted average | INFERRED | 08_COSTING_ENGINE.md L21: "Most likely Weighted Average" |
| Cost_rate updates on each purchase | INFERRED | 30_WORKFLOW_CATALOG.md L214: "System calculates Cost_rate" |
| Exact cost_rate formula | UNKNOWN | 08_COSTING_ENGINE.md L44: "requires database/procedure inspection" |
| Cost_rate update timing (before/after commit) | UNKNOWN | No evidence found |
| Cost_rate scope (product-level vs product-warehouse) | UNKNOWN | Legacy has no warehouse concept |
| Return impact on cost_rate | UNKNOWN | 08_COSTING_ENGINE.md L47: "Impact of returns on Cost_rate" NOT VERIFIED |
| Sale impact on cost_rate | UNKNOWN | No evidence found |

**Outcome: OUTCOME C — STILL UNKNOWN**

COGS status remains: **SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**

---

## 2. Baseline

| Item | Value |
|------|-------|
| Commit | `952a5a6` |
| Tests | 615/615 PASS |
| TypeScript | 0 errors |
| Build | PASS (24.16s) |
| Source Changes | NONE |

---

## 3. Evidence Sources

### PRIORITY 1: Legacy SQL Server Database
**STATUS: UNAVAILABLE**

- No SQL Server connection string exists in the repository
- No ODBC, DSN, SqlClient, or OleDb references in any code file
- The `.env` file contains only a PostgreSQL (Supabase) connection string for the new system
- No `.bak`, `.dump`, `.mdf`, or `.ldf` database backup files exist
- The legacy database at `38.92.47.89` is referenced only in documentation files

### PRIORITY 2: Legacy Source Code
**STATUS: UNAVAILABLE**

- Zero `.aspx`, `.cs`, `.vb`, `.config`, `.ascx`, `.sln`, `.csproj` files exist in the repository
- No stored procedures (`CREATE PROCEDURE`) exist in any SQL file
- The only SQL files are PostgreSQL migrations for the new ERP schema
- The migration `001_initial.sql` line 7 contains the comment: `-- RULE: cost_rate / COGS formula is UNKNOWN — do not add columns for it.`

### PRIORITY 3: Legacy UI Behavior
**STATUS: UNAVAILABLE (captured HTML only, no live access)**

- 26 HTML page captures exist in `audit/` directory
- These are full-page browser saves with ViewState/EventValidation — no PostBack interaction possible
- `audit/07_items.html` contains the Items GridView with Cost_rate column visible
- Sample data shows Cost_rate ≠ Purchase_Rate for all items

### PRIORITY 4: Current ERP Implementation
**STATUS: AVAILABLE — inspected as supporting evidence only**

- All source code, adapters, services, tests, and migrations inspected
- Current behavior documented below — clearly separated from legacy facts

---

## 4. Legacy Cost_Rate Lifecycle

### What IS Established (VERIFIED)

From `audit/08_COSTING_ENGINE.md`:

| Field | Type | Description | Line |
|-------|------|-------------|------|
| Purchase_Rate | Decimal | Purchase/cost price per unit | L8 |
| Sale_Rate | Decimal | Selling price per unit | L9 |
| Retail_Price | Decimal | MRP/retail price | L10 |
| Cost_rate | Decimal | Calculated cost (appears in GridView only) | L11 |

From `audit/16_CALCULATIONS.md` L160-165:
```
### 24. Cost_rate (Stored Calculated Field)
**VERIFIED:** Cost_rate is a stored/calculated field, NOT an input field.
- Appears in GridView columns but has no corresponding input field
- Differs from Purchase_Rate (e.g., Purchase_Rate=184.90 vs Cost_rate=190.08)
- Likely calculated as weighted average or moving average cost
- Used for COGS and stock valuation
```

From `audit/MASTER_REVERSE_ENGINEERED_SPEC.md` L716-721:
```
### 39.4 Cost_rate Calculation
**VERIFIED:** Cost_rate is a stored/calculated field:
- Appears in GridView columns only (no input field)
- Differs from Purchase_Rate (e.g., Purchase_Rate=184.90 vs Cost_rate=190.08)
- Likely calculated as weighted average or moving average cost
- Used for COGS and stock valuation
```

### What is INFERRED

From `audit/08_COSTING_ENGINE.md` L13-21:
```
**Possible formulas:**
1. **Weighted Average:** Cost_rate = Total Purchase Value / Total Quantity
2. **Last Purchase Cost:** Cost_rate = Most recent Purchase_Rate
3. **Fixed:** Cost_rate = Purchase_Rate (same as entered cost)

**INFERRED:** Most likely Weighted Average based on field name "Cost_rate" rather than "Purchase_Rate".
```

### What is UNKNOWN

From `audit/08_COSTING_ENGINE.md` L43-48:
```
## Areas NOT VERIFIED
- Exact Cost_rate formula (requires database/procedure inspection)
- Whether Cost_rate updates on each purchase
- Whether Cost_rate is recalculated or manually set
- Impact of returns on Cost_rate
- Stock valuation method in financial statements
```

---

## 5. Purchase/GRN Cost_Rate Timing

### Legacy Evidence

From `audit/30_WORKFLOW_CATALOG.md` L214-217:
```
2. System calculates Cost_rate (weighted average or moving average)
3. Cost_rate stored in Items table
4. Cost_rate used for COGS and stock valuation
5. Cost_rate appears in GridView but has no input field
```

This suggests cost_rate is recalculated during purchase processing. However:
- The exact trigger point (on save? on post? on GRN?) is NOT specified
- Whether the recalculation happens before or after the transaction commits is NOT specified
- Whether the recalculation is synchronous or asynchronous is NOT specified

### Current ERP Behavior (Supporting Evidence Only)

**PostgresInventoryAdapter.ts L256-287 (GRN case):**
```typescript
case 'GRN':
case 'RETURN': {
  // ... FOR UPDATE lock on stock_levels ...
  const newQty = currentQty + movement.quantity;
  const newCost = newQty > 0
    ? (currentQty * currentCost + movement.quantity * movement.unitCost) / newQty
    : 0;
  // UPDATE stock_levels SET quantity_on_hand = $1, unit_cost = $2 ...
}
```

**Key observation:** The current ERP recalculates `unit_cost` (AVCO) synchronously within the same database transaction as the stock level update, using `FOR UPDATE` row-level locking. This is a weighted average formula: `(existingQty × existingCost + incomingQty × incomingCost) / totalQty`.

**PurchaseService.ts L348-350 (GRN movement creation):**
```typescript
unitCost: destLevel.unitCost,  // reads EXISTING cost before AVCO update
totalCost: line.quantity * destLevel.unitCost,
```

**Key observation:** The GRN movement is created with the EXISTING unitCost (before AVCO recalculation). The adapter then recalculates AVCO using this value. The movement record stores the pre-AVCO cost, but the stock_levels table gets the post-AVCO cost.

### Assessment

The current ERP behavior is consistent with a weighted average cost model. However, this is the CURRENT implementation, not proof of legacy behavior. The legacy system may:
- Use the same formula (weighted average)
- Use a different formula (last purchase cost, fixed cost, etc.)
- Update at a different timing (e.g., batch recalculation vs. per-transaction)

**Cannot determine from available evidence.**

---

## 6. Sale/ISSUE Cost_Rate Consumption

### Legacy Evidence

From `audit/04_ACCOUNTING_ENGINE.md` L96-103:
```
### Sale Voucher (SV) Accounting Effect
DEBIT: Customer Account (DEBITORS 500) — Net amount
CREDIT: Sales Income (INCOME 1600) — Amount before tax
CREDIT: Tax Payable — Tax amount
DEBIT: Cost of Goods Sold — Cost amount
CREDIT: Inventory/Stock — Cost amount
```

This confirms the legacy system DOES post COGS on sale. The COGS amount is described as "Cost amount" — which is `Quantity × Cost_rate` per the formula. However:
- It does NOT specify whether Cost_rate is read at sale time or pre-calculated
- It does NOT specify whether Cost_rate changes after a sale

### Current ERP Behavior (Supporting Evidence Only)

**SalesService.ts L334-356 (ISSUE movement creation):**
```typescript
// TODO: When COGS is implemented, use actual cost from StockLevel.unitCost
unitCost: sourceLevel.unitCost,  // reads current AVCO cost
totalCost: line.quantity * sourceLevel.unitCost,
```

**PostgresInventoryAdapter.ts L291-316 (ISSUE case):**
```typescript
case 'ISSUE': {
  // ... FOR UPDATE lock on stock_levels ...
  // DEDUCTS quantity only — does NOT update unit_cost
  await client.query(
    `UPDATE stock_levels SET quantity_on_hand = quantity_on_hand - $1, updated_at = NOW() ...`
  );
}
```

**Key observation:** On ISSUE (sale), the current ERP:
1. Reads `sourceLevel.unitCost` (the current AVCO) to create the movement record
2. Deducts quantity from stock_levels
3. Does NOT change `unit_cost` (AVCO remains unchanged after sale)

This means: **Sale does NOT change unitCost.** The cost basis remains the same after a sale.

### Assessment

The current behavior (sale consumes current unitCost without changing it) is standard for weighted average costing systems. However, whether the legacy system behaves identically cannot be confirmed.

**Cannot determine from available evidence.**

---

## 7. Return Behavior

### Legacy Evidence

From `audit/08_COSTING_ENGINE.md` L47: "Impact of returns on Cost_rate" is listed under "Areas NOT VERIFIED."

From `audit/MASTER_REVERSE_ENGINEERED_SPEC.md` L684: "Cost_rate calculation formula (PARTIALLY VERIFIED - see below)" — the "see below" section (L716-721) does not address returns.

**No legacy evidence exists for how returns affect cost_rate.**

### Current ERP Behavior (Supporting Evidence Only)

**Sale Return (RETURN movement):** Treated as incoming stock — AVCO recalculated.
- `PostgresInventoryAdapter.ts` L256-287: RETURN case uses same AVCO formula as GRN
- `SaleReturnService.ts` L331: `unitCost: destLevel.unitCost` (reads existing cost)

**Purchase Return (ISSUE movement):** Treated as outgoing stock — quantity deducted, unitCost unchanged.
- `PostgresInventoryAdapter.ts` L291-316: ISSUE case deducts quantity only
- `PurchaseReturnService.ts` L332: `unitCost: sourceLevel.unitCost` (reads existing cost)

### Assessment

The current ERP treats:
- Sale Return → incoming stock → AVCO recalculated (same as purchase)
- Purchase Return → outgoing stock → AVCO unchanged (same as sale)

This is standard behavior for weighted average costing. However, whether the legacy system behaves identically is UNKNOWN.

**Cannot determine from available evidence.**

---

## 8. Adjustment/Transfer Behavior

### Legacy Evidence

From `audit/07_INVENTORY_ENGINE.md` L73-74:
```
## Stock Adjustments
**NOT OBSERVED** — No dedicated stock adjustment screen. INFERRED: adjustments may be done via journal entries.
```

From `audit/MASTER_REVERSE_ENGINEERED_SPEC.md` L684: "Stock adjustment mechanism" is listed as UNKNOWN.

From `audit/07_INVENTORY_ENGINE.md` L68:
```
## Warehouse Management
**NOT OBSERVED** — No warehouse selection in any form. INFERRED: single-warehouse system.
```

**No legacy evidence exists for adjustment or transfer behavior.**

### Current ERP Behavior (Supporting Evidence Only)

**Transfer:** Source stock deducted (quantity only, unitCost unchanged). Target stock added with AVCO recalculation.
**Adjustment:** Quantity set absolutely. unitCost unchanged (no cost recalculation).

### Assessment

Transfers and adjustments are NEW features not present in the legacy system. Their behavior in the current ERP is an implementation choice, not legacy parity.

**Not applicable to legacy verification.**

---

## 9. AVCO vs Cost_Rate Comparison

| Aspect | AVCO (Current ERP) | Cost_Rate (Legacy) | Match? |
|--------|--------------------|--------------------|--------|
| **Nature** | Stored in `stock_levels.unit_cost` | Stored in Items table `Cost_rate` column | SIMILAR (both stored) |
| **Scope** | Per product per warehouse | Per product (single warehouse) | DIFFERENT (legacy is product-level) |
| **Formula** | `(Qty×Cost + InQty×InCost) / TotalQty` | "Likely weighted average" (INFERRED) | UNKNOWN if same |
| **Updated on GRN** | YES (AVCO recalculated) | INFERRED YES | LIKELY MATCH |
| **Updated on ISSUE** | NO (quantity only) | UNKNOWN | UNKNOWN |
| **Updated on RETURN** | YES (AVCO recalculated, same as GRN) | UNKNOWN | UNKNOWN |
| **Updated on Transfer** | YES (target warehouse AVCO) | N/A (single warehouse) | N/A |
| **Updated on Adjustment** | NO (quantity set absolutely) | UNKNOWN | UNKNOWN |
| **Read by Sale** | YES (`sourceLevel.unitCost`) | YES (COGS = Qty × Cost_rate) | MATCH |
| **Used for Stock Value** | YES (`qty × unitCost`) | YES (Stock Value = Qty × Cost_rate) | MATCH |

### Key Differences

1. **Scope:** Legacy `Cost_rate` is on the Items table (product-level). Current ERP `unitCost` is on `stock_levels` (product + warehouse level). This is a design difference — the legacy system is single-warehouse, the current ERP is multi-warehouse.

2. **Formula verification:** The current ERP formula is VERIFIED (weighted average). The legacy formula is INFERRED (weighted average). These may or may not be identical.

3. **Update timing:** The current ERP updates unitCost on GRN/RETURN (incoming) but NOT on ISSUE/ADJUSTMENT. Whether the legacy system behaves identically is UNKNOWN.

---

## 10. Current ERP Comparison

| Behavior | Legacy | Current ERP | Evidence | Status |
|----------|--------|-------------|----------|--------|
| Cost_rate is stored field | YES (VERIFIED) | YES (stock_levels.unit_cost) | 08_COSTING_ENGINE.md L14 | MATCH |
| Cost_rate is calculated, not input | YES (VERIFIED) | YES (AVCO calculation) | 16_CALCULATIONS.md L160-161 | MATCH |
| Cost_rate used for COGS | YES (VERIFIED) | YES (calculateCOGS function exists) | MASTER_SPEC L244 | MATCH |
| Cost_rate used for stock value | YES (VERIFIED) | YES (calculateStockValue function) | 16_CALCULATIONS.md L141 | MATCH |
| Cost_rate formula = weighted average | INFERRED | VERIFIED (AVCO) | 08_COSTING_ENGINE.md L21 | LIKELY MATCH |
| Cost_rate updated on purchase | INFERRED | YES (GRN → AVCO recalc) | 30_WORKFLOW_CATALOG.md L214 | LIKELY MATCH |
| Cost_rate updated on sale | UNKNOWN | NO (quantity only) | PostgresInventoryAdapter.ts L311-314 | UNKNOWN |
| Cost_rate scope | Product-level (Items table) | Product + Warehouse (stock_levels) | Items.aspx vs schema | DIFFERENT |
| Cost_rate timing (before/after commit) | UNKNOWN | Synchronous (in transaction) | PostgresInventoryAdapter.ts L405 | UNKNOWN |

---

## 11. COGS Formula Verification

### Documented Formula

From `audit/16_CALCULATIONS.md` L146-149:
```
### 22. Cost of Goods Sold
Inputs: Quantity_Sold, Cost_Rate
Formula: COGS = Quantity_Sold x Cost_Rate
```

From `audit/MASTER_REVERSE_ENGINEERED_SPEC.md` L564-567:
```
### COGS
COGS = Quantity_Sold x Cost_Rate
```

### Current Implementation

From `src/domain/types/inventory.ts` L347-354:
```typescript
/**
 * Calculate COGS (Cost of Goods Sold).
 * Source: audit/16_CALCULATIONS.md #22
 * Formula: COGS = Quantity_Sold x Cost_Rate
 */
export function calculateCOGS(quantitySold: number, costRate: number): number {
  return quantitySold * costRate;
}
```

### Assessment

The COGS formula itself is WELL-DOCUMENTED and VERIFIED across multiple sources. `COGS = Quantity_Sold × Cost_Rate`.

The question is NOT the formula — it is the SOURCE of `Cost_Rate` (the value to pass as `costRate`).

---

## 12. COGS GL Posting Verification

### Documented GL Rule

From `audit/04_ACCOUNTING_ENGINE.md` L96-103:
```
DEBIT: COGS — Cost Amount
CREDIT: Inventory — Cost Amount
```

From `audit/MASTER_REVERSE_ENGINEERED_SPEC.md` L190-194:
```
DEBIT: Customer Account (500) — Net Amount
CREDIT: Sales Income (1600) — Base Amount
CREDIT: Tax Payable — Tax Amount
DEBIT: COGS — Cost Amount
CREDIT: Inventory — Cost Amount
```

### Current Implementation Status

From `src/domain/services/SalesService.ts` L317-318:
```
*   DEBIT: COGS — Cost Amount [DEFERRED — specification gap]
*   CREDIT: Inventory — Cost Amount [DEFERRED — specification gap]
```

From `src/domain/services/SalesService.ts` L334:
```typescript
// TODO: When COGS is implemented, use actual cost from StockLevel.unitCost
```

### Assessment

The COGS GL posting rule is WELL-DOCUMENTED. The accounts exist (`51101` COGS, `11301` Inventory). The posting is DEFERRED pending cost_rate verification.

---

## 13. Frozen Gaps

| Gap | Classification | Status |
|-----|---------------|--------|
| Per-line FED amount | SCHEMA GAP | FROZEN |
| Per-line Advance Tax amount | SCHEMA GAP | FROZEN |
| Per-line Further Tax amount | SCHEMA GAP | FROZEN |
| Trade Discount persistence | SCHEMA GAP | FROZEN |
| COGS cost_rate timing | SPECIFICATION GAP | FROZEN |

---

## 14. Evidence Matrix

| Question | Answer | Evidence | Confidence |
|----------|--------|----------|------------|
| Is cost_rate updated on purchase? | INFERRED YES | 30_WORKFLOW_CATALOG.md L214: "System calculates Cost_rate" | INFERRED |
| Is cost_rate equal to AVCO? | INFERRED LIKELY | 08_COSTING_ENGINE.md L21: "Most likely Weighted Average" | INFERRED |
| When is cost_rate recalculated? | UNKNOWN | 08_COSTING_ENGINE.md L44: "requires database/procedure inspection" | UNKNOWN |
| What event triggers recalculation? | INFERRED: Purchase | 30_WORKFLOW_CATALOG.md L214: workflow shows purchase → calculate | INFERRED |
| What value is stored? | VERIFIED: Stored calculated field | 16_CALCULATIONS.md L160-161, MASTER_SPEC L716-718 | VERIFIED |
| What value does sale consume? | VERIFIED: Cost_rate | MASTER_SPEC L244, 04_ACCOUNTING_ENGINE.md L101 | VERIFIED |
| Does sale change cost_rate? | UNKNOWN | No evidence found | UNKNOWN |
| Does purchase return change cost_rate? | UNKNOWN | 08_COSTING_ENGINE.md L47: NOT VERIFIED | UNKNOWN |
| Does sale return change cost_rate? | UNKNOWN | 08_COSTING_ENGINE.md L47: NOT VERIFIED | UNKNOWN |
| Does transfer change cost_rate? | N/A | Legacy has no warehouse concept | N/A |
| Does adjustment change cost_rate? | UNKNOWN | 07_INVENTORY_ENGINE.md L73: NOT OBSERVED | UNKNOWN |
| Is cost_rate per product or per warehouse? | VERIFIED: Per product | Items.aspx has Cost_rate column on Items table | VERIFIED |
| Is cost_rate per batch? | NO | No batch tracking in legacy | VERIFIED |
| Formula: weighted average? | INFERRED | 08_COSTING_ENGINE.md L21 | INFERRED |
| Formula: last purchase cost? | NOT RULED OUT | 08_COSTING_ENGINE.md L18 lists as possibility | UNKNOWN |
| Formula: fixed (same as purchase rate)? | CONTRADICTED | Sample data: Cost_rate ≠ Purchase_Rate | CONTRADICTED |

---

## 15. Final COGS Specification Status

### What IS Verified

1. **Cost_rate exists** as a stored/calculated field on the legacy Items table
2. **Cost_rate differs from Purchase_Rate** (sample data: 190.08 vs 184.90)
3. **Cost_rate is NOT an input field** — it appears only in GridView
4. **COGS = Quantity_Sold × Cost_Rate** — formula is well-documented
5. **COGS GL posting = DR COGS (51101), CR Inventory (11301)** — rule is well-documented
6. **Stock Value = Quantity × Cost_Rate** — valuation formula is documented
7. **Cost_rate is likely weighted average** — inference supported by field name and behavior
8. **Cost_rate is likely updated on purchase** — inference supported by workflow documentation

### What is NOT Verified

1. **Exact cost_rate formula** — is it exactly `(TotalPurchaseValue / TotalQuantity)`, or some other weighted average variant?
2. **Cost_rate update timing** — on purchase save? on purchase post? on GRN? before or after commit?
3. **Return impact on cost_rate** — do sale returns increase cost_rate? Do purchase returns decrease it?
4. **Sale impact on cost_rate** — does a sale change cost_rate? (Current ERP says NO)
5. **Adjustment impact on cost_rate** — does a stock adjustment change cost_rate?
6. **Cost_rate vs AVCO identity** — can we definitively say cost_rate = AVCO?

### Classification

**SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**

The COGS formula is known. The GL posting rules are known. The accounts exist. The infrastructure exists. The single missing piece — the exact cost_rate lifecycle/timing — cannot be resolved without access to:

1. The legacy SQL Server database (to inspect stored procedures, triggers, or computed columns)
2. The legacy ASP.NET source code (to trace the cost_rate calculation logic)
3. Controlled testing against the legacy UI (to observe cost_rate changes before/after transactions)

None of these three resources are available in the current repository.

---

## 16. Regression Verification

| Category | Result |
|----------|--------|
| Source Changes | NONE — READ-ONLY audit |
| TypeScript | 0 errors — PASS |
| Tests | 615/615 — ALL PASS |
| Build | PASS (24.16s) |

---

## 17. Final Recommendation

### Immediate: No Change

COGS remains **SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**. No implementation should proceed.

### To Resolve This Gap

One of the following actions is required:

| Option | Action | Expected Result |
|--------|--------|----------------|
| **A** | Access legacy SQL Server database and inspect Items table, stored procedures, or triggers for Cost_rate calculation | VERIFIED formula and timing |
| **B** | Access legacy ASP.NET source code and trace Cost_rate calculation in the code-behind files | VERIFIED formula and timing |
| **C** | Perform controlled testing on legacy UI: create purchase → observe Cost_rate change → create sale → observe Cost_rate | VERIFIED behavior |
| **D** | Make a business decision to adopt AVCO as the cost_rate formula (acknowledging this is an implementation choice, not legacy verification) | UNBLOCKED — but not legacy-verified |

### If Option D Is Chosen

If the project owner decides to adopt AVCO as the cost_rate formula (Option D), the implementation would be:

1. On sale post: read `stockLevel.unitCost` (current AVCO)
2. Post `DR COGS (51101) amount=qty×unitCost`
3. Post `CR Inventory (11301) amount=qty×unitCost`
4. The `calculateCOGS()` function already exists and implements this formula
5. Estimated scope: ~30 lines of code in SalesService.ts

However, this would be an **implementation decision**, not a **legacy-verified specification**.

---

### STEP 60 STATUS

PASS (audit complete, no source changes)

### LEGACY DATABASE ACCESS

UNAVAILABLE

### COST_RATE TIMING

UNVERIFIED

### COST_RATE = AVCO

NOT VERIFIED (INFERRED LIKELY)

### COGS FORMULA

VERIFIED (`COGS = Quantity_Sold × Cost_Rate`)

### COGS GL RULE

VERIFIED (`DR COGS (51101), CR Inventory (11301)`)

### COGS IMPLEMENTATION READINESS

SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND

### FROZEN SCHEMA GAPS

UNCHANGED

### TESTS

615/615

### TYPESCRIPT

PASS

### BUILD

PASS

### SOURCE CHANGES

NONE

### AUDIT FILE

`audit/60_COGS_COST_RATE_SPECIFICATION_VERIFICATION.md`

### COMMIT

Commit audit only. Push to origin/main.
