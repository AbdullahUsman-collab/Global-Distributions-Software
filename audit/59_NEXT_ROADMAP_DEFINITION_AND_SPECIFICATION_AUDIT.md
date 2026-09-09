# Step 59 — Next Roadmap Definition and Specification Audit

**Date:** 2026-09-09  
**Baseline Commit:** 3faaa6a  
**Scope:** READ-ONLY audit. Specification discovery. Roadmap decision. No source code changes.

---

## 1. Executive Summary

Step 59 audits the complete ERP foundation (Steps 1–58) to determine the next authorized roadmap phase. The original roadmap (Steps 18–37) is complete. No subsequent roadmap has been defined.

After exhaustive search of all authoritative specification documents, repository source code, and audit history:

- **Sales/POS:** Core wholesale sales workflow is COMPLETE. POS, Sales Orders, Quotation, Delivery Challan have NO authoritative specification (explicitly listed as UNKNOWN/UNVERIFIED in the legacy reverse-engineering).
- **Procurement:** Basic PV/PRV/GRN is COMPLETE. Purchase Orders, Requisitions, Approval Workflows have NO authoritative specification.
- **Production/Manufacturing:** NO specification exists anywhere in the repository. Not reverse-engineered from the legacy system.
- **Multi-Currency:** Explicitly documented as NOT APPLICABLE — the legacy ERP is single-currency (PKR).
- **COGS:** The formula is documented (`COGS = Qty × Cost_Rate`). The AVCO infrastructure exists. But `cost_rate` update timing relative to sale posting is unverified. This is the CLOSEST to implementation-ready but requires one specification verification.

**Recommendation:** No business module has sufficient authoritative specification for safe implementation. The correct next step is **SPECIFICATION COMPLETION** — specifically resolving the COGS cost_rate timing question, which would unlock the only specification-backed implementation candidate.

---

## 2. Baseline

| Item | Value |
|------|-------|
| Commit | `3faaa6a` |
| Tests | 615/615 PASS |
| TypeScript | 0 errors |
| Build | PASS (24.16s) |
| Database | 3 migrations, 18 tables, seed data intact |
| Foundation | Frozen at Step 58 |

---

## 3. Current System Capability Matrix

| Capability | Implementation | Authoritative Spec | Status |
|------------|---------------|-------------------|--------|
| Authentication | Complete | Yes | PASS |
| RBAC (6 roles, 33+ perms) | Complete | Yes | PASS |
| Multi-brand/multi-tenant | Complete | Yes | PASS |
| Tenant isolation | Complete | Yes | PASS |
| COA (4-level hierarchy) | Complete | Yes | PASS |
| JV (Journal Voucher) | Complete | Yes | PASS |
| CV (Cash Voucher) | Complete | Yes | PASS |
| CP (Cash Payment) | Complete | Yes | PASS |
| CR (Cash Receipt) | Complete | Yes | PASS |
| SV (Sale Voucher) | Complete | Yes | PASS |
| SRV (Sale Return) | Complete | Yes | PASS |
| PV (Purchase Voucher) | Complete | Yes | PASS |
| PRV (Purchase Return) | Complete | Yes | PASS |
| CRV (Customer Receipt Voucher) | Complete | Yes | PASS |
| BPV (Bank Payment Voucher) | Complete (alias) | Yes | PASS |
| Inventory (products, stock) | Complete | Yes | PASS |
| AVCO | Complete | Yes | PASS |
| GRN (on purchase post) | Complete | Yes | PASS |
| ISSUE (on sale post) | Complete | Yes | PASS |
| Cash Book | Complete | Yes | PASS |
| Customers | Complete | Yes | PASS |
| Suppliers | Complete | Yes | PASS |
| Customer Receipts | Complete | Yes | PASS |
| Aging Report | Complete | Yes | PASS |
| Trial Balance | Complete | Yes | PASS |
| P&L (Income Statement) | Complete | Yes | PASS |
| Balance Sheet | Complete | Yes | PASS |
| General Ledger | Complete | Yes | PASS |
| Dashboard KPIs | Complete | Yes | PASS |
| Bill List + Detail | Complete | Yes | PASS |
| Tax Calculation (GST/FED/ADV) | Complete | Yes | PASS |
| Trade Discount (line-level) | Complete | Yes | PASS |
| Bill Print/Export | Partial | Yes | PARTIAL |
| **COGS GL Posting** | Deferred | Yes (formula documented) | **SPECIFICATION GAP** |
| Sales Orders | Not implemented | UNKNOWN (MASTER_SPEC L680) | NOT FOUND |
| Quotation/Estimate | Not implemented | UNKNOWN (MASTER_SPEC L682) | NOT FOUND |
| Delivery Challan | Not implemented | UNKNOWN (MASTER_SPEC L681) | NOT FOUND |
| Purchase Orders | Not implemented | UNKNOWN (11_PURCHASE_ENGINE L38) | NOT FOUND |
| Purchase Requisitions | Not implemented | Not found anywhere | NOT FOUND |
| Approval Workflows | Not implemented | "No approval workflow" (32_LIVE_SYSTEM L585) | SPECIFICATION GAP |
| POS / Point of Sale | Not implemented | Not found anywhere | NOT FOUND |
| Cash Register | Not implemented | Not found anywhere | NOT FOUND |
| Shift Management | Not implemented | Not found anywhere | NOT FOUND |
| Production/Manufacturing | Not implemented | Not found anywhere | NOT FOUND |
| BOM (Bill of Materials) | Not implemented | Not found anywhere | NOT FOUND |
| Multi-Currency | Not implemented | "NOT APPLICABLE" (03_MASTER_DATA L129) | NOT APPLICABLE |
| Exchange Rates | Not implemented | Not found anywhere | NOT FOUND |
| Per-line FED/Advance/Further Tax | Not implemented | SCHEMA GAP | SCHEMA GAP |
| Trade Discount Persistence | Not implemented | SCHEMA GAP | SCHEMA GAP |
| Credit Limit | Not implemented | "NOT OBSERVED" (05_CUSTOMER_ACCOUNTING L51) | SPECIFICATION GAP |
| Payment Terms | Not implemented | "NOT OBSERVED" (03_MASTER_DATA L127) | SPECIFICATION GAP |

---

## 4. Sales/POS Specification Audit

### What Exists

| Feature | Spec Source | Implementation | Status |
|---------|------------|----------------|--------|
| Sale Invoice (SV) | 10_SALES_ENGINE.md | SalesService.ts + Sales.tsx | PASS |
| Sale Return (SRV) | 12_RETURNS_REVERSALS.md | SaleReturnService.ts | PASS |
| Tax Calculation | 15_TAX_DISCOUNT.md, 16_CALCULATIONS.md | calculateBillLineTax() | PASS |
| Trade Discount | 16_CALCULATIONS.md L20-25 | BillLineTaxInput.tradeDiscountPercent | PASS |
| Bill Totals | 16_CALCULATIONS.md L69-111 | SaleBillCalculation | PASS |
| Customer Management | 05_CUSTOMER_ACCOUNTING.md | Sales.tsx CustomersTab | PASS |
| Customer Aging | 05_CUSTOMER_ACCOUNTING.md L35-38 | AgingReportService.ts | PASS |
| Customer Receipts | 04_ACCOUNTING_ENGINE.md L112-116 | CustomerReceiptService.ts | PASS |
| Bill Listing | 10_SALES_ENGINE.md L95-98 | BillsListService.ts | PASS |
| Bill Detail | 24_TRANSACTION_DEPENDENCIES.md | BillDetailService.ts | PASS |

### What Is NOT Specified

| Feature | Evidence | Classification |
|---------|----------|---------------|
| POS / Point of Sale | No mention in any audit doc. Legacy is wholesale distribution (bill-based), not retail POS | NOT FOUND |
| Cash Register | Not found anywhere | NOT FOUND |
| Shift Management | Not found. "Shift" in DelAccount.aspx refers to data transfer, not cashier shifts | NOT FOUND |
| Receipt Printer | Not found anywhere | NOT FOUND |
| Barcode Scanner | Not found anywhere. No barcode fields on any entity | NOT FOUND |
| Sales Orders | MASTER_SPEC L680: "UNKNOWN #19" | NOT FOUND |
| Quotation/Estimate | MASTER_SPEC L682: "UNKNOWN #21" | NOT FOUND |
| Delivery Challan | MASTER_SPEC L681: "UNKNOWN #20" | NOT FOUND |
| Invoice-Level Discount | 15_TAX_DISCOUNT.md L45-46: "NOT OBSERVED" | NOT FOUND |
| Cash Discount | 15_TAX_DISCOUNT.md L48-49: "NOT OBSERVED" | NOT FOUND |

**Verdict:** The legacy ERP is a wholesale distribution system, NOT a retail POS system. No POS specification exists. Sales Orders, Quotations, and Delivery Challan are explicitly listed as UNKNOWN — they may or may not have existed in the legacy system but were never reverse-engineered.

---

## 5. Procurement Specification Audit

### What Exists

| Feature | Spec Source | Implementation | Status |
|---------|------------|----------------|--------|
| Purchase Invoice (PV) | 11_PURCHASE_ENGINE.md | PurchaseService.ts | PASS |
| Purchase Return (PRV) | 12_RETURNS_REVERSALS.md | PurchaseReturnService.ts | PASS |
| GRN (on purchase post) | 07_INVENTORY_ENGINE.md | PurchaseService.ts L327-358 | PASS |
| Tax on Purchases | 15_TAX_DISCOUNT.md | PurchaseService.ts calculateBill() | PASS |
| Supplier Management | 06_SUPPLIER_ACCOUNTING.md | Purchases.tsx SuppliersTab | PASS |
| Supplier Aging | 06_SUPPLIER_ACCOUNTING.md L25-26 | AgingReportService.ts | PASS |

### What Is NOT Specified

| Feature | Evidence | Classification |
|---------|----------|---------------|
| Purchase Orders | 11_PURCHASE_ENGINE L38: "NOT VERIFIED" | NOT FOUND |
| Purchase Requisitions | Not found anywhere | NOT FOUND |
| Approval Workflows | 32_LIVE_SYSTEM L585: "No approval workflow" | SPECIFICATION GAP |
| Supplier Price Lists | 11_PURCHASE_ENGINE L41: "NOT VERIFIED" | NOT FOUND |
| Purchase Price Lock | 11_PURCHASE_ENGINE L40: "NOT VERIFIED" | NOT FOUND |
| Payment-to-Invoice Allocation | 06_SUPPLIER_ACCOUNTING L36-37: "Running balance model" | NOT FOUND |

**Verdict:** Basic purchase workflow (PV/PRV/GRN) is complete. A full procurement module (PO → GRN → PV → Payment) is NOT specified by the legacy system.

---

## 6. Production Specification Audit

**NO authoritative specification exists for Production/Manufacturing anywhere in the repository.**

- No production module in the legacy ERP menu structure (MASTER_SPEC L55-63)
- No BOM, Work Order, Raw Material, Finished Goods, Wastage, Labor, or Overhead in any audit document
- The only production-adjacent items are two COA accounts (`11302` Finished Goods, `51103` Direct Production Costs) seeded in MockCOAAdapter but never used
- An optional `manufacturingDate` field exists on `ItemBatch` type but is unused

**Classification: NOT APPLICABLE** — the legacy ERP does not include production/manufacturing.

---

## 7. Multi-Currency Specification Audit

**Explicitly documented as NOT APPLICABLE.**

- `audit/03_MASTER_DATA.md` L129: "Single currency (PKR inferred from context). No multi-currency support observed."
- `audit/54_LIVE_POSTGRESQL_INTEGRATION...AUDIT.md` L269: "Multi-currency | NOT APPLICABLE | Not in legacy ERP"
- No exchange rate tables, types, services, or schemas exist
- The only currency-related code is `baseCurrency: 'PKR'` on `TenantBusinessProfile` (settings.ts:55)

**Classification: NOT APPLICABLE** — the legacy ERP is single-currency.

---

## 8. COGS Frozen Gap

The COGS specification exists but has one unverified element:

### What IS Specified (Authoritative)

| Element | Source | Exact Text |
|---------|--------|-----------|
| COGS Formula | MASTER_SPEC L244, 16_CALCULATIONS.md L149 | `COGS = Quantity_Sold × Cost_Rate` |
| Gross Profit | MASTER_SPEC L245, 16_CALCULATIONS.md L155 | `Profit = Sale_Amount - COGS` |
| GL Posting | 04_ACCOUNTING_ENGINE.md L99-100 | `DEBIT: COGS — Cost Amount` / `CREDIT: Inventory — Cost Amount` |
| Cost_Rate Nature | MASTER_SPEC L716-721, 16_CALCULATIONS.md L160-165 | "Stored/calculated field, NOT an input field" |
| Cost_Rate Method | 08_COSTING_ENGINE.md L13-21 | "INFERRED: Weighted Average" |
| COGS Account | COA seed | `51101` "Material Purchases" |
| Inventory Account | COA seed | `11301` "General Inventory" |

### What Is NOT Verified

| Element | Evidence | Impact |
|---------|----------|--------|
| Exact cost_rate update timing | 08_COSTING_ENGINE.md L44: "Exact Cost_rate formula (requires database/procedure inspection)" | Determines whether cost_rate at time of sale = AVCO at time of sale, or some other value |
| Whether cost_rate = AVCO | Inferred but not verified from legacy database/procedures | If cost_rate ≠ AVCO, the existing AVCO calculation cannot be directly used for COGS |

### Current Implementation State

- `calculateCOGS()` exists in `inventory.ts:352` — returns `qty × unitCost`
- `calculateGrossProfit()` exists in `inventory.ts:361` — returns `saleAmount - cogs`
- Both are **NEVER CALLED** by any service
- SalesService.ts L317-318: `"DEBIT: COGS — Cost Amount [DEFERRED — specification gap]"`
- SalesService.ts L333-334: `"TODO: When COGS is implemented, use actual cost from StockLevel.unitCost"`

### Classification

**SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND** (for cost_rate update timing)

The formula is known. The GL posting rules are known. The accounts exist. The AVCO infrastructure exists. The single missing piece is: **does the legacy system update cost_rate on every purchase (making it = AVCO), or at some other frequency?**

---

## 9. Frozen Schema Gaps

| Gap | Classification | Status |
|-----|---------------|--------|
| Per-line FED amount | SCHEMA GAP | FROZEN — unchanged |
| Per-line Advance Tax amount | SCHEMA GAP | FROZEN — unchanged |
| Per-line Further Tax amount | SCHEMA GAP | FROZEN — unchanged |
| Trade Discount persistence | SCHEMA GAP | FROZEN — unchanged |

---

## 10. Non-Blocking Foundation Findings

| # | Finding | Status |
|---|---------|--------|
| 1 | CSRF accepts any non-empty string | VERIFIED NON-BLOCKING |
| 2 | Two cash-book handlers leak error.message | VERIFIED NON-BLOCKING |
| 3 | Login rate limiter banner mislabeled | VERIFIED NON-BLOCKING |
| 4 | JS bundle >1MB (1,091 KB) | VERIFIED NON-BLOCKING |
| 5 | UI type-only imports from domain services | VERIFIED NON-BLOCKING |
| 6 | Advance tax % not enforced at service level | VERIFIED NON-BLOCKING |
| 7 | voucher_lines.contra_account_id no FK | VERIFIED NON-BLOCKING |
| 8 | voucher_lines.product_id no FK | VERIFIED NON-BLOCKING |

---

## 11. Implementation Readiness Matrix

| Candidate Module | Specification | Business Rules | Accounting | Inventory | Tax | Data Model | Permissions | Readiness |
|-----------------|---------------|---------------|------------|-----------|-----|------------|-------------|-----------|
| **COGS** | Formula documented | COGS = Qty × Cost_Rate | DR COGS, CR Inventory | Uses StockLevel.unitCost | N/A | Existing tables | Derivable | **PARTIALLY READY** (cost_rate timing unverified) |
| **Sales Orders** | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | Unknown | **BLOCKED BY SPECIFICATION** |
| **Quotation** | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | Unknown | **BLOCKED BY SPECIFICATION** |
| **Delivery Challan** | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | Unknown | **BLOCKED BY SPECIFICATION** |
| **Purchase Orders** | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | Unknown | **BLOCKED BY SPECIFICATION** |
| **Approval Workflows** | "No approval workflow" observed | NOT FOUND | N/A | N/A | N/A | Unknown | Unknown | **BLOCKED BY SPECIFICATION** |
| **POS** | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | Unknown | **NOT APPLICABLE** (wholesale, not retail) |
| **Production** | NOT FOUND | NOT FOUND | Unknown | Unknown | Unknown | Unknown | Unknown | **NOT APPLICABLE** (not in legacy) |
| **Multi-Currency** | "NOT APPLICABLE" | NOT FOUND | Unknown | Unknown | Unknown | Unknown | Unknown | **NOT APPLICABLE** (single-currency legacy) |

---

## 12. Recommended Next Roadmap Step

### Recommendation: SPECIFICATION COMPLETION PHASE

**No business module has sufficient authoritative specification for safe implementation.**

The only candidate close to implementation-ready is COGS, which requires one verification: the cost_rate update timing relative to sale posting. This is a specification question, not an implementation question.

### Recommended Step: STEP 59A — COGS SPECIFICATION VERIFICATION

**Scope:**
1. Verify whether the legacy ERP updates `cost_rate` on every purchase (making it = AVCO)
2. Verify the exact timing of cost_rate recalculation
3. If cost_rate = AVCO (as inferred), document this as VERIFIED
4. If cost_rate ≠ AVCO, document the actual formula

**Prerequisites:**
- Access to legacy SQL Server database (to inspect stored procedures/triggers)
- OR: Access to legacy source code (to inspect cost_rate calculation logic)
- OR: Manual verification against legacy ERP UI (create a purchase, then a sale, observe cost_rate changes)

**If verified as AVCO:**
- COGS becomes IMPLEMENTATION-READY
- Implementation: On sale post, add `DR COGS (51101) amount=qty×stockLevel.unitCost` and `CR Inventory (11301) amount=qty×stockLevel.unitCost`
- Estimated scope: ~50 lines of code across SalesService.ts, PurchaseService.ts, and tests

**If NOT AVCO:**
- COGS remains SPECIFICATION GAP
- No other module is implementation-ready
- A broader specification effort is needed

---

## 13. Required Prerequisites

| # | Prerequisite | Status |
|---|-------------|--------|
| 1 | Foundation baseline frozen | DONE (Step 58) |
| 2 | 615+ tests passing | DONE (615/615) |
| 3 | TypeScript clean | DONE (0 errors) |
| 4 | Build passing | DONE |
| 5 | Live PostgreSQL accessible | DONE |
| 6 | Seed data in place | DONE |
| 7 | COGS cost_rate timing verified | **PENDING** |
| 8 | Next roadmap step formally defined by project owner | **PENDING** |

---

## 14. Regression Verification

| Category | Result |
|----------|--------|
| TypeScript | 0 errors — PASS |
| Tests | 615/615 — ALL PASS |
| Build | PASS (24.16s) |

---

## 15. Git/Security Verification

| Check | Result |
|-------|--------|
| `.env` tracked | No |
| Clean working tree | Yes |
| No secrets in source | Verified |
| No newly introduced credentials | Verified |

---

## 16. Exact Evidence / Source References

| Claim | Source | Line(s) |
|-------|--------|---------|
| POS not in legacy | All audit files — no mention | N/A |
| Sales Orders = UNKNOWN | MASTER_REVERSE_ENGINEERED_SPEC.md | L680 |
| Quotation = UNKNOWN | MASTER_REVERSE_ENGINEERED_SPEC.md | L682 |
| Delivery Challan = UNKNOWN | MASTER_REVERSE_ENGINEERED_SPEC.md | L681 |
| No approval workflow | 32_LIVE_SYSTEM_AUDIT.md | L585 |
| Purchase Orders = NOT VERIFIED | 11_PURCHASE_ENGINE.md | L38 |
| Multi-currency = NOT APPLICABLE | 03_MASTER_DATA.md | L129 |
| Production not in legacy | MASTER_REVERSE_ENGINEERED_SPEC.md L55-63 (no production module) | N/A |
| COGS formula | MASTER_REVERSE_ENGINEERED_SPEC.md | L244, L566 |
| COGS GL posting = DEFERRED | SalesService.ts | L317-318 |
| Cost_rate = weighted average (inferred) | 08_COSTING_ENGINE.md | L13-21 |
| Cost_rate timing = UNKNOWN | 08_COSTING_ENGINE.md | L44 |

---

## 17. Final Gate

**READY FOR SPECIFICATION COMPLETION**

The ERP foundation is complete and stable. No business module has sufficient authoritative specification for implementation. The recommended next step is verifying the COGS cost_rate timing, which would unlock the only specification-backed implementation candidate.
