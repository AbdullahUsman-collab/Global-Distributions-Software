# Step 56 — Controlled Data Seed and Live Workflow Audit

**Date:** 2026-09-09  
**Goal:** Seed controlled test data, verify live PostgreSQL business workflows, regression audit

---

## 1. Executive Summary

Step 56 resolved the live PostgreSQL data gap identified in Step 54. The integration test failures cascading from "Customer not found" were caused by missing business entities (customers, products, warehouses, suppliers) in the live database. A controlled, deterministic seed script was fixed and executed, populating the minimum required entities. All 14 integration tests now pass. Full test suite: 615/615 pass.

## 2. Database Environment

- **Type:** Supabase PostgreSQL 17.6
- **URL:** rbmlcpcqvylzmqwqxlsw.supabase.co
- **SSL:** Required (rejectUnauthorized: false)
- **Existing data:** 3 demo tenants, 6 demo users, 18 COA accounts, 2 warehouses (from earlier seeds), UAT test artifacts (customers, products, vouchers from earlier test runs)

## 3. Data Safety Classification

**ENVIRONMENT:** Controlled demo/development database (Supabase project)

**Classification:** SAFE TO SEED — all entities are tenant-scoped, idempotent, and non-destructive. No real customer/business data exists. UAT test artifacts from earlier runs are present but isolated.

## 4. Existing Seed/Data Mechanism

| Script | Status | Purpose |
|--------|--------|---------|
| `seed_coa.mjs` | Committed, executed | 16 GL accounts (already existed) |
| `seed_warehouses.mjs` | Committed, executed | 2 warehouses across 2 tenants (already existed) |
| `seed_integration_data.mjs` | **Fixed and executed in Step 56** | Customer, product, warehouse, supplier, stock level |

## 5. Test Data Created

| Entity | ID | Tenant | Purpose |
|--------|----|--------|---------|
| Warehouse | `warehouse-001` | `tenant-demo-wholesale-001` | Sales workflow test |
| Warehouse Location | `loc-int-001` | `tenant-demo-wholesale-001` | Location for warehouse |
| Customer | `customer-001` | `tenant-demo-wholesale-001` | Sales workflow test (linked to `coa-11201` AR) |
| Product | `prod-int-001` | `tenant-demo-wholesale-001` | SKU-001, saleRate=100, purchaseRate=80, gst=17% |
| Stock Level | `stock-int-001` | `tenant-demo-wholesale-001` | 100 units @ 80.00/unit cost |
| Supplier | `supplier-001` | `tenant-demo-wholesale-001` | Lucky Suppliers (linked to `coa-21100` AP) |

**Seed script fixes applied:**
- Replaced random IDs with deterministic IDs (`prod-int-001`, `loc-int-001`, `stock-int-001`)
- Fixed parameter count mismatches (extra `now` variables in INSERT arrays)
- Fixed `stock_levels.quantity` → `stock_levels.quantity_on_hand` (correct column name)
- Removed unused variables (`arAccountId`, `inventoryAccountId`, `salesRevenueAccountId`)

## 6. Integration Test Results

| Suite | Passed | Failed | Skipped | Status |
|-------|--------|--------|---------|--------|
| Authentication (3 tests) | 3 | 0 | 0 | PASS |
| Sales Workflow (4 tests) | 4 | 0 | 0 | PASS (was 0/4) |
| Tenant Isolation (1 test) | 1 | 0 | 0 | PASS |
| Ledger (1 test) | 1 | 0 | 0 | PASS |
| Adapter Unit Tests (5 tests) | 5 | 0 | 0 | PASS |
| **Total** | **14** | **0** | **0** | **PASS** |

## 7. Live Sales Workflow

**Verified flow:**
1. `POST /api/sales` → Creates sale draft (SV, status=DRAFT)
2. `POST /api/sales/:id/post` → Posts sale (status=POSTED)
3. `GET /api/bills/:id` → Retrieves bill detail with taxSummary
4. `DELETE /api/sales/:id` → Correctly rejects with 409 (Cannot delete a posted voucher)
5. `GET /api/ledger` → Ledger entries exist after posting

**Sale accounting verified:**
- DR Customer AR (`coa-11201`) — 1170.00
- CR Sales Revenue (`coa-41101`) — 1000.00
- CR Sales Tax Output (`coa-21201`) — 170.00

## 8. Live Purchase Workflow

Not directly tested by integration tests. Existing purchase service tests (12/12 pass) verify purchase logic.

## 9. Live Bill Detail

**Server-side Bill Detail verified:**
- Returns proper `BillDetail` shape (not `BillRecord`)
- `taxSummary` properly populated with subtotal, gst, totalTax, grandTotal
- `accountingEntries` present (3 entries for sale voucher)
- `lines` present (3 lines)
- `inventoryMovements` present (0 for this test data)
- No "Cannot read properties of undefined" crash

**Demo mode Bill Detail verified:**
- `demoData.ts` constructs proper `BillDetail` shape with `taxSummary`
- All 9 demo bills accessible without crash

## 10. Tax Verification

**Product configuration:**
- `prod-int-001`: `gst_percent=17`, `fed_percent=0`, `advance_tax_sale_percent=0`, `advance_tax_purchase_percent=0`

**Ledger entries confirm:**
- DR Customer AR: 1170.00 (1000 base + 170 GST)
- CR Sales Revenue: 1000.00 (base amount)
- CR Sales Tax Output: 170.00 (17% of 1000)

**DemoData.ts GST 17%:** Matches product configuration and Pakistan standard rate. Authoritative.

## 11. Inventory Verification

- Initial stock: 100 units @ 80.00/unit
- After 5 sale vouchers (30 units total): 70 units @ 80.00/unit
- Stock level correctly updated in `stock_levels` table
- AVCO unit cost unchanged (no purchase transactions to alter average)

## 12. Accounting Verification

- 5 posted sale vouchers with balanced ledger entries
- DR = CR verified by `PostgresVoucherAdapter.postVoucher()` (tolerance 0.005)
- Customer AR account (`coa-11201`) correctly debited
- Sales Revenue account (`coa-41101`) correctly credited
- Tax Output account (`coa-21201`) correctly credited

## 13. Cross-Module Reconciliation

| Voucher → Ledger | Status |
|------------------|--------|
| 5 SV vouchers | 5 voucher entries in ledger |
| DR Customer AR = sum of invoice totals | PASS |
| CR Revenue + CR Tax = DR AR | PASS |

| Voucher → Inventory | Status |
|---------------------|--------|
| Sale vouchers (SV) | Stock reduced from 100 → 70 |
| Stock movement exists | Verified in stock_levels table |

## 14. Tenant Isolation

**Test result:** PASS

- `tenant-demo-distribution-002` cannot access `tenant-demo-wholesale-001` bills
- Returns 404 (not 403) — correct behavior (resource not found in tenant scope)
- Server enforces tenant isolation on every query via `WHERE tenant_id = $1`

## 15. Security Regression

- CSRF protection: Active (x-csrf-token required for all mutations)
- Rate limiting: Active (login: 10/15min, API: 100/15min)
- Password hashing: bcrypt (12 rounds)
- Session tokens: HTTP-only cookies
- RBAC: Server-side permission checks on all routes

## 16. Step 55 Regression

**BILL VIEW REGRESSION: PASS**

- Demo mode: Bill Detail returns proper `BillDetail` shape with `taxSummary`
- Server mode: Bill Detail returns proper `BillDetail` shape with `taxSummary`
- No "Cannot read properties of undefined" crash
- `subtotal` renders correctly in both modes

## 17. Remaining Gaps

| Gap | Classification | Status |
|-----|---------------|--------|
| COGS GL posting | SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND | Not implemented (as specified) |
| Per-line FED/advance/further tax | SCHEMA GAP | Fields not persisted on VoucherLine |
| Trade discount persistence | SCHEMA GAP | Field not persisted on VoucherLine |

## 18. Files Modified

| File | Change | Type |
|------|--------|------|
| `seed_integration_data.mjs` | Fixed parameter mismatches, deterministic IDs, correct column names | Data infrastructure |
| `src/server/routes/protected.ts` | Fixed case-sensitive `POSTED` check in error handling (5 instances) | Bug fix |

## 19. Test Results

| Category | Status |
|----------|--------|
| TypeScript | PASS (0 errors) |
| Unit/Service Tests | PASS (601/601) |
| Integration Tests | PASS (14/14) |
| Build | PASS (18.25s) |
| **Total Tests** | **615/615 PASS** |

## 20. Final Release Gate

**READY WITH NON-BLOCKING GAPS**

The three remaining gaps (COGS, per-line tax fields, trade discount persistence) are specification/schema gaps that do not block demo or production use.
