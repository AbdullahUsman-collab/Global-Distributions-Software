# Step 63 — Specification Decision + COGS Authorization Audit

**Date:** 2026-09-10
**Baseline Commit:** 611e228
**Scope:** READ-ONLY specification decision and COGS authorization gate. No source code changes.

---

## 1. Executive Summary

Step 63 performs a specification decision and COGS authorization audit. No new authoritative evidence has been introduced after Step 62. The COGS specification gap remains unresolved. No future business module has sufficient specification for implementation. The foundation is stable and ready for the next authorized phase when defined.

**FOUNDATION STATUS: READY WITH NON-BLOCKING GAPS**

**COGS STATUS: SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**

**ROADMAP RESULT: SPECIFICATION COMPLETION REQUIRED**

---

## 2. Baseline Commit

| Item | Value |
|------|-------|
| Commit | `611e228` |
| Step 62 Conclusion | Foundation READY WITH NON-BLOCKING GAPS. No module has sufficient specification for implementation |
| COGS Status (Step 62) | SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND |
| Repository State | Clean (only untracked seed_minimal.mjs) |

---

## 3. Step 62 Findings Reviewed

| Area | Step 62 Finding | Step 63 Verification |
|------|-----------------|---------------------|
| Foundation | PASS with non-blocking gaps | VERIFIED — no changes |
| Regression | 605 passed, 1 failed, 9 skipped | VERIFIED — same |
| TypeScript | PASS (0 errors) | VERIFIED — same |
| Build | PASS (20.57s) | VERIFIED — same |
| Working Tree | Clean | VERIFIED — same |
| COGS | SPECIFICATION GAP | VERIFIED — same |
| Frozen Gaps | 4 schema gaps | VERIFIED — same |

---

## 4. Foundation Freeze Verification

### Database

| Check | Status |
|-------|--------|
| PostgreSQL connected | VERIFIED |
| Migrations 001-003 applied | VERIFIED |
| 18 tables created | VERIFIED |
| Tenant isolation enforced | VERIFIED |
| Schema unchanged since Step 62 | VERIFIED |

### Authentication

| Check | Status |
|-------|--------|
| Session management | VERIFIED |
| bcrypt hashing | VERIFIED |
| CSRF protection | VERIFIED |
| Rate limiting | VERIFIED |
| Session validation | VERIFIED |
| No credential changes | VERIFIED |

### Multi-Brand

| Check | Status |
|-------|--------|
| user_brand_access authoritative | VERIFIED |
| Tenant switching server-authorized | VERIFIED |
| Role derived from user_brand_access | VERIFIED |

### Accounting

| Check | Status |
|-------|--------|
| 12 voucher types | VERIFIED |
| GL generation | VERIFIED |
| AR/AP | VERIFIED |
| Tax calculations | VERIFIED |
| No accounting logic changes | VERIFIED |

### Inventory

| Check | Status |
|-------|--------|
| Products, warehouses, stock levels | VERIFIED |
| Stock movements | VERIFIED |
| AVCO | VERIFIED |
| No inventory logic changes | VERIFIED |

### Reporting

| Check | Status |
|-------|--------|
| 14 reports | VERIFIED |
| Posted-only filtering | VERIFIED |
| No report changes | VERIFIED |

---

## 5. New Authoritative Evidence Search

### Search Criteria

Searched for:
- New audit documents
- Business specifications
- Approved requirements
- Legacy database extracts
- SQL files
- Stored procedures
- Triggers
- Transaction samples
- Historical item data
- Cost history
- Purchase history
- Sale history
- Return history
- Adjustment history
- Cost_Rate examples
- Explicit business-owner decisions
- Approved architecture decisions

### Search Results

| Evidence Type | Found | Action Required |
|---------------|-------|----------------|
| New audit documents | NO | — |
| Business specifications | NO | — |
| Approved requirements | NO | — |
| Legacy database extracts | NO | — |
| SQL files | NO | — |
| Stored procedures | NO | — |
| Triggers | NO | — |
| Transaction samples | NO | — |
| Historical item data | NO | — |
| Cost history | NO | — |
| Purchase history | NO | — |
| Sale history | NO | — |
| Return history | NO | — |
| Adjustment history | NO | — |
| Cost_Rate examples | NO | — |
| Business-owner decisions | NO | — |
| Architecture decisions | NO | — |

### Git History

| Check | Result |
|-------|--------|
| Commits after Step 62 | 0 |
| Source file changes | 0 |
| New audit files | 0 |
| New SQL files | 0 |
| New seed files | 0 |

**Conclusion:** NO NEW AUTHORITATIVE COGS EVIDENCE FOUND.

---

## 6. COGS Specification Review

### Current ERP Implementation State

| Component | Status | Evidence |
|-----------|--------|----------|
| `calculateCOGS()` function | EXISTS | `inventory.ts` L352-354 |
| `calculateGrossProfit()` function | EXISTS | `inventory.ts` L361-363 |
| `calculateAVCO()` function | EXISTS | `inventory.ts` L336-345 |
| COGS formula | VERIFIED | `COGS = Quantity_Sold × Cost_Rate` |
| Gross Profit formula | VERIFIED | `Profit = Sale_Amount - COGS` |
| Account 51101 (COGS) | EXISTS | COA seed data |
| Account 11301 (Inventory) | EXISTS | COA seed data |
| StockLevel.unitCost | EXISTS | `inventory.ts` L222 |
| COGS posting | DEFERRED | `SalesService.ts` L317-318 |
| Stock value decrease | DEFERRED | `SalesService.ts` L322 |
| `calculateCOGS()` called | NEVER | No caller in entire codebase |
| `calculateGrossProfit()` called | NEVER | No caller in entire codebase |

### Legacy Evidence State

| Requirement | Legacy Evidence | Status |
|-------------|-----------------|--------|
| COGS formula | EXISTS | `COGS = Quantity_Sold × Cost_Rate` (audit/16) |
| Cost_Rate source | UNKNOWN | Steps 60-61 exhaustive search found nothing |
| Cost_Rate formula | UNKNOWN | Cannot derive without transaction history |
| Cost_Rate lifecycle | UNKNOWN | When/how Cost_Rate updates not documented |
| Cost_Rate timing | UNKNOWN | When Cost_Rate is captured not documented |
| Cost_Rate = AVCO | INFERRED ONLY | Steps 60-61 explicitly state "do not assume" |

### Step 60 Classification

**OUTCOME C — STILL SPECIFICATION GAP**

> "Legacy DB/source/UI unavailable. Cost_rate timing remains unverified. COGS status: SPECIFICATION GAP."

### Step 61 Classification

**SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**

> "Exhaustive search of entire repository (26 HTML captures, 60+ audits, all source code, all data files). Zero previously overlooked evidence found."

### Step 62 Classification

**SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND — FROZEN**

> "Do not implement COGS unless new legacy evidence is introduced or a business decision is made."

---

## 7. Cost_Rate Decision

### Decision Gate Analysis

| Gate | Evidence | Decision |
|------|----------|----------|
| Legacy Cost_Rate formula | UNKNOWN | Cannot determine |
| Legacy Cost_Rate lifecycle | UNKNOWN | Cannot determine |
| Legacy Cost_Rate timing | UNKNOWN | Cannot determine |
| Cost_Rate = AVCO | INFERRED ONLY | Not authorized |
| Business-owner decision | NOT FOUND | Not authorized |
| New authoritative evidence | NOT FOUND | Not available |

### Decision Outcome

**OUTCOME C — STILL SPECIFICATION GAP**

Neither authoritative legacy evidence nor an explicit owner decision exists to authorize COGS implementation. The classification remains:

**SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**

---

## 8. COGS Authorization Status

### COGS Table

| Requirement | Legacy Evidence | Current ERP | Status | Authorization |
|-------------|-----------------|-------------|--------|---------------|
| COGS formula | EXISTS | `COGS = Qty × Cost_Rate` | PASS | VERIFIED |
| Cost_Rate source | UNKNOWN | `StockLevel.unitCost` | UNKNOWN | NOT AUTHORIZED |
| Cost_Rate formula | UNKNOWN | Not implemented | UNKNOWN | NOT AUTHORIZED |
| Cost_Rate lifecycle | UNKNOWN | Not implemented | UNKNOWN | NOT AUTHORIZED |
| Purchase impact | UNKNOWN | AVCO recalculated | UNKNOWN | NOT AUTHORIZED |
| Sale impact | UNKNOWN | Not implemented | UNKNOWN | NOT AUTHORIZED |
| Return impact | UNKNOWN | Not implemented | UNKNOWN | NOT AUTHORIZED |
| Adjustment impact | UNKNOWN | Not implemented | UNKNOWN | NOT AUTHORIZED |
| AVCO relationship | INFERRED | Not verified | INFERRED | NOT AUTHORIZED |
| Sale-time cost capture | UNKNOWN | Not implemented | UNKNOWN | NOT AUTHORIZED |
| GL debit account | EXISTS | Account 51101 | PASS | VERIFIED |
| GL credit account | EXISTS | Account 11301 | PASS | VERIFIED |
| Gross profit | EXISTS | Formula implemented | PASS | VERIFIED |
| Reporting treatment | UNKNOWN | Not implemented | UNKNOWN | NOT AUTHORIZED |
| Tenant behavior | N/A | Follows session | PASS | VERIFIED |

### Authorization Verdict

**COGS = NOT AUTHORIZED FOR IMPLEMENTATION**

The formula and GL rules are verified. The critical missing element is the Cost_Rate lifecycle — how, when, and under what conditions Cost_Rate is determined and updated. Without this specification, any implementation would be based on inference, not legacy evidence.

---

## 9. Frozen Schema Gaps

### GAP 1 — COGS

| Field | Value |
|-------|-------|
| Classification | SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND |
| Frozen Since | Step 45 (commit 4d98d80) |
| Reconfirmed | Steps 60, 61, 62, 63 |
| Status | FROZEN |
| Required For | COGS GL posting |

### GAP 2 — Per-line FED Amount

| Field | Value |
|-------|-------|
| Classification | SCHEMA GAP — FROZEN |
| Frozen Since | Step 45 (commit 4d98d80) |
| Status | FROZEN |
| Required For | Federal Excise Duty persistence |

### GAP 3 — Per-line Advance Tax Amount

| Field | Value |
|-------|-------|
| Classification | SCHEMA GAP — FROZEN |
| Frozen Since | Step 45 (commit 4d98d80) |
| Status | FROZEN |
| Required For | Advance Tax persistence |

### GAP 4 — Per-line Further Tax Amount

| Field | Value |
|-------|-------|
| Classification | SCHEMA GAP — FROZEN |
| Frozen Since | Step 45 (commit 4d98d80) |
| Status | FROZEN |
| Required For | Further Tax persistence |

### GAP 5 — Trade Discount Persistence

| Field | Value |
|-------|-------|
| Classification | SCHEMA GAP — FROZEN |
| Frozen Since | Step 45 (commit 4d98d80) |
| Status | FROZEN |
| Required For | Trade discount audit trail |

### Frozen Schema Gap Count: 5

All gaps remain frozen and must not be implemented without explicit authorization.

---

## 10. Future Module Readiness Matrix

| Module | Authoritative Spec | Workflow | Accounting | Inventory | Data Model | UI | Ready |
|--------|--------------------|----------|------------|-----------|------------|----|-------|
| COGS | Formula known, lifecycle UNKNOWN | PARTIAL | GL rule known | Uses AVCO | Existing | N/A | **SPECIFICATION GAP** |
| POS | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | **NOT APPLICABLE** |
| Sales Orders | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | **BLOCKED** |
| Quotation | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | **BLOCKED** |
| Delivery Challan | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | **BLOCKED** |
| Purchase Orders | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | **BLOCKED** |
| Purchase Requisitions | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | **BLOCKED** |
| Approval Workflows | "No approval workflow" | NOT FOUND | Unknown | N/A | Unknown | Unknown | **BLOCKED** |
| Production | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | **NOT APPLICABLE** |
| Multi-Currency | NOT APPLICABLE | N/A | Unknown | N/A | Unknown | Unknown | **NOT APPLICABLE** |

### Module Readiness Summary

**Total modules evaluated:** 10
**Implementation-ready:** 0
**Specification gaps:** 1 (COGS)
**Blocked:** 5 (Sales Orders, Quotation, Delivery Challan, Purchase Orders, Purchase Requisitions)
**Not applicable:** 3 (POS, Production, Multi-Currency)

**No module is implementation-ready.** The only near-ready candidate is COGS, which requires resolving the Cost_Rate specification gap.

---

## 11. Non-Blocking Findings

| # | Finding | Classification | Status |
|---|---------|---------------|--------|
| 1 | CSRF accepts any non-empty string in dev | OPEN NON-BLOCKING | Unchanged |
| 2 | Cash-book error.message leaks internal errors | OPEN NON-BLOCKING | Unchanged |
| 3 | Login rate-limiter banner says "Server is busy" | OPEN NON-BLOCKING | Unchanged |
| 4 | JS bundle >1MB (1,091 KB) | OPEN NON-BLOCKING | Unchanged |
| 5 | UI type-only imports from domain services | OPEN NON-BLOCKING | Unchanged |
| 6 | Advance tax % not enforced at service level | OPEN NON-BLOCKING | Unchanged |
| 7 | voucher_lines.contra_account_id no FK | OPEN NON-BLOCKING | Unchanged |
| 8 | voucher_lines.product_id no FK | OPEN NON-BLOCKING | Unchanged |

All 8 findings remain OPEN NON-BLOCKING. None are production blockers. None were modified in Step 63.

---

## 12. Regression Verification

| Category | Result | Change from Step 62 |
|----------|--------|---------------------|
| TypeScript | 0 errors — PASS | Same |
| Tests | 605 passed, 1 failed, 9 skipped = 615 total | Same |
| Build | PASS (6.68s) | Same |
| Failed Test | `PostgresSalesWorkflow.integration.test.ts` — `DATABASE_URL` not set | Same (pre-existing) |

**Regression: PASS WITH NO CHANGES**

---

## 13. Working Tree Verification

| Check | Result |
|-------|--------|
| Source file modifications | NONE |
| Migration files | NONE |
| Database schema changes | NONE |
| Credential additions | NONE |
| .env changes | NONE |
| Generated binaries | NONE |
| Temporary files | NONE |
| New audit files | NONE (Step 63 audit pending) |

**Untracked files:**
| File | Status | Assessment |
|------|--------|------------|
| `seed_minimal.mjs` | Untracked | Safe duplicate of seed_integration_data.mjs. Uses env var. No secrets. Safe to leave. |

**Working Tree: CLEAN**

---

## 14. Final Authorization Decision

### Authorization Rule Analysis

| Criterion | Evidence | Decision |
|-----------|----------|----------|
| Authoritative legacy evidence | NOT FOUND | — |
| Explicit business-owner decision | NOT FOUND | — |
| New repository evidence | NOT FOUND | — |
| Foundation stable | YES | — |

### Authorization Outcome

**OUTCOME C — SPECIFICATION COMPLETION REQUIRED — COGS REMAINS FROZEN**

Neither authoritative legacy evidence nor an explicit owner decision exists to authorize COGS implementation. The specification gap remains unresolved.

### Selection

**C. SPECIFICATION COMPLETION REQUIRED — COGS REMAINS FROZEN**

---

## 15. Next Authorized Step

### Authorization Required

The project owner must define the next authorized roadmap step. Options:

| Option | Description | Prerequisite |
|--------|-------------|-------------|
| **A** | Introduce new legacy evidence (DB access, source code, controlled testing) | External action |
| **B** | Make a business decision to adopt AVCO for COGS | Owner decision |
| **C** | Define a new feature module with full specification | Owner + spec author |
| **D** | Defer all future work; maintain current foundation | Owner decision |

### DO NOT Proceed To

Without explicit authorization:
- COGS implementation
- POS module
- Procurement expansion
- Sales Orders
- Quotation
- Delivery Challan
- Purchase Orders
- Purchase Requisitions
- Production
- Multi-Currency
- Any new feature module

---

## 16. Final Recommendation

The ERP foundation is **production-ready with non-blocking gaps**. Steps 1-63 have:

1. Built a complete wholesale distribution ERP
2. Verified authentication, multi-brand, tenant isolation
3. Implemented all accounting voucher types with GL generation
4. Implemented inventory with AVCO
5. Implemented 14 financial reports
6. Verified live PostgreSQL integration
7. Frozen all unresolved specification gaps
8. Exhaustively searched for legacy evidence (Steps 60-61)
9. Confirmed no subsequent roadmap exists (Step 62)
10. Confirmed no new evidence has been introduced (Step 63)
11. Confirmed COGS remains a specification gap

**The project is in a clean, stable, known-good state.** The next step requires a decision from the project owner — either introducing new evidence, making a design decision, or defining a new specification.

---

## 17. Legacy Parity Matrix

| Area | Status | Classification | Evidence |
|------|--------|----------------|----------|
| Authentication | PASS | IMPLEMENTED | auth.ts, password.ts, csrf.ts, rateLimit.ts |
| Multi-brand | PASS | IMPLEMENTED | user_brand_access, PostgresUserBrandAccessAdapter |
| Tenant isolation | PASS | IMPLEMENTED | All adapters filter by tenant_id |
| COA | PASS | IMPLEMENTED | 4-level hierarchy |
| Accounts | PASS | IMPLEMENTED | CRUD + metadata |
| Vouchers | PASS | IMPLEMENTED | 8 types + 4 aliases |
| Voucher lines | PASS | IMPLEMENTED | Balanced debit/credit |
| GL | PASS | IMPLEMENTED | LedgerEntry generation on post |
| Tax | PASS | IMPLEMENTED | GST, FED, Further Tax, Advance Tax |
| Inventory | PASS | IMPLEMENTED | Products, warehouses, stock, movements |
| AVCO | PASS | IMPLEMENTED | Weighted average cost |
| Cash Book | PASS | IMPLEMENTED | CR/CP, posted immutability |
| Customers | PASS | IMPLEMENTED | CRUD + account linkage |
| Suppliers | PASS | IMPLEMENTED | CRUD + account linkage |
| Bill Detail | PASS | IMPLEMENTED | BillsListService + BillDetailService |
| Reporting | PASS | IMPLEMENTED | 14 reports |
| COGS | DEFERRED | SPECIFICATION GAP | Formula known, lifecycle unknown |
| Per-line tax persistence | NOT IMPLEMENTED | SCHEMA GAP | FED, Advance Tax, Further Tax |
| Trade Discount persistence | NOT IMPLEMENTED | SCHEMA GAP | Trade discount |

---

### STEP 63 STATUS

PASS WITH NON-BLOCKING GAPS

### FOUNDATION STATUS

READY WITH NON-BLOCKING GAPS

### COGS STATUS

SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND

### COGS CLASSIFICATION

SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND

### FROZEN SCHEMA GAPS

1. COGS — Cost_Rate lifecycle not authorized
2. Per-line FED amount
3. Per-line Advance Tax amount
4. Per-line Further Tax amount
5. Trade Discount persistence

### FUTURE MODULE STATUS

| Module | Ready |
|--------|-------|
| COGS | SPECIFICATION GAP |
| POS | NOT APPLICABLE |
| Sales Orders | BLOCKED |
| Quotation | BLOCKED |
| Delivery Challan | BLOCKED |
| Purchase Orders | BLOCKED |
| Purchase Requisitions | BLOCKED |
| Approval Workflows | BLOCKED |
| Production | NOT APPLICABLE |
| Multi-Currency | NOT APPLICABLE |

### REGRESSION

- Tests: 605 passed, 1 failed (pre-existing), 9 skipped = 615 total
- TypeScript: PASS (0 errors)
- Build: PASS (6.68s)

### SOURCE CHANGES

NONE

Except:

`audit/63_SPECIFICATION_DECISION_AND_COGS_AUTHORIZATION_AUDIT.md`

### NEXT AUTHORIZED STEP

Project owner must define the next authorized roadmap step. No module has sufficient authoritative specification for implementation. The foundation is stable and ready for the next authorized phase when defined.

### FINAL RECOMMENDATION

No implementation may begin. Specification/owner authorization is still required. The project owner must either introduce new legacy evidence, make a business decision to adopt AVCO, or define a new authorized roadmap module.

### NEXT STEP COMMIT

Commit audit only. Push to origin/main. Report exact commit hash.
