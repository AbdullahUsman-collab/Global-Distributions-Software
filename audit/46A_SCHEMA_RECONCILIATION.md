# Step 46A: Schema Reconciliation & Legacy-Parity Gate

**Date:** Sep 6, 2026  
**Status:** AUDIT COMPLETE — Schema Gate: YELLOW  
**Purpose:** Final pre-migration reconciliation of domain contracts vs proposed DB schema

---

## 1. Executive Summary

Step 46A performed a field-by-field, method-by-method reconciliation of the entire domain layer against the proposed PostgreSQL schema (`001_initial.sql`). The audit identified **3 critical mismatches** and **5 additional bugs** that must be resolved before migration.

**Schema Gate: YELLOW — MIGRATION POSSIBLE WITH EXPLICIT EXCEPTIONS**

The three critical mismatches:
1. **StockMovement warehouse model** — Domain uses `fromWarehouseId`/`toWarehouseId` (2 fields); DB has single `warehouse_id NOT NULL`. The Postgres adapter cannot function.
2. **PostgresTenantAdapter TENANT_UPDATE_COLUMNS** — Maps 12 wrong field names; `updateTenant()` silently drops all mutations.
3. **PostgresInventoryAdapter references non-existent `movement.warehouseId`** — Runtime crash on any stock movement write.

**Voucher numbering is confirmed global per tenant** — Gap #10 is NOT a gap. `UNIQUE(tenant_id, voucher_number)` is correct.

**COGS GL posting remains a known gap** — Sale posting creates ledger entries and stock movements but never debits COGS (51101) or credits Inventory (11301).

---

## 2. Verification Results

| Check | Result |
|-------|--------|
| Tests | 496 passed, 9 skipped (DB integration) |
| TypeScript | 0 errors |
| Build | Success |
| Audit scope | 10 repository interfaces, 9 Postgres adapters, 11 mock adapters, 17 domain services, 70+ API routes, 24 test files, 1 SQL migration |

---

## 3. Actual Repository Architecture

| # | Interface | Methods | tenantId on ALL methods? | PostgreSQL Adapter |
|---|-----------|---------|-------------------------|-------------------|
| 1 | ICOARepository | 6 | YES | PostgresCOAAdapter ✅ |
| 2 | IVoucherRepository | 10 | YES | PostgresVoucherAdapter ✅ |
| 3 | IInventoryRepository | 16 | YES | PostgresInventoryAdapter ✅ (broken) |
| 4 | ICustomerRepository | 7 | YES | PostgresCustomerAdapter ✅ |
| 5 | ISupplierRepository | 7 | YES | PostgresSupplierAdapter ✅ |
| 6 | ISessionRepository | 5 | NO (4 methods) | PostgresSessionAdapter ✅ |
| 7 | IUserRepository | 7 | NO (4 methods) | PostgresUserAdapter ✅ |
| 8 | IUserCredentialsRepository | 5 | NO (3 methods) | PostgresUserCredentialsAdapter ✅ |
| 9 | ISettingsRepository | 2 | YES | **NO POSTGRES ADAPTER** ❌ |
| 10 | ITenantRepository | 6 | NO (all — by design) | PostgresTenantAdapter ✅ (broken) |
| | **TOTAL** | **71** | | 9 of 10 adapters |

---

## 4. Actual Entity Inventory

| Entity | Domain Type | DB Table | Persisted? | Notes |
|--------|-----------|----------|------------|-------|
| AccountHead | coa.ts | accounts | Yes | 20 fields |
| VoucherHeader | voucher.ts | vouchers | Yes | 10 fields |
| VoucherLine | voucher.ts | voucher_lines | Yes | 16 fields |
| LedgerEntry | voucher.ts | ledger_entries | Yes | 11 fields |
| Product | inventory.ts | products | Yes | 21 fields |
| Warehouse | inventory.ts | warehouses | Yes | 5 fields |
| WarehouseLocation | inventory.ts | warehouse_locations | Yes | 6 fields + rack/shelf/bin |
| StockLevel | inventory.ts | stock_levels | Yes | 11 fields |
| StockMovement | inventory.ts | stock_movements | Yes | **14 fields (domain) vs 13 columns (DB)** |
| Customer | customer.ts | customers | Yes | 13 fields |
| Supplier | supplier.ts | suppliers | Yes | 14 fields |
| User | auth.ts | users | Yes | 8 fields (NO email column) |
| UserCredentials | auth.ts | user_credentials | Yes | 6 fields |
| UserSession | auth.ts | sessions | Yes | 5 fields (token hashed) |
| Tenant | tenant.ts | tenants | Yes | 9 fields |
| TenantSettings | settings.ts | tenant_settings | Yes | JSONB blob |
| ItemBatch | inventory.ts | — | No | Stub returns [] |
| ItemSerial | inventory.ts | — | No | Stub returns [] |
| BillLineTaxInput | inventory.ts | — | No | Calculation type |
| BillLineTaxResult | inventory.ts | — | No | Calculation type |
| Report DTOs | reports.ts | — | No | Read-only views |

---

## 5. Correct Table Count

**Step 45 claimed "15 database tables" but listed 16 entities.**

Actual count from `001_initial.sql`:

| # | Table | Domain Entity |
|---|-------|--------------|
| 1 | tenants | Tenant |
| 2 | users | User |
| 3 | user_credentials | UserCredentials |
| 4 | sessions | UserSession |
| 5 | tenant_settings | TenantSettings |
| 6 | accounts | AccountHead |
| 7 | customers | Customer |
| 8 | suppliers | Supplier |
| 9 | products | Product |
| 10 | warehouses | Warehouse |
| 11 | warehouse_locations | WarehouseLocation |
| 12 | stock_levels | StockLevel |
| 13 | stock_movements | StockMovement |
| 14 | vouchers | VoucherHeader |
| 15 | voucher_lines | VoucherLine |
| 16 | ledger_entries | LedgerEntry |

**Actual count: 16 tables.** Step 45's "15" was a miscount. All 16 are required.

---

## 6. Field-by-Field Mapping

### 6.1 AccountHead → accounts

| Domain Field | Domain Type | DB Column | DB Type | Nullable | Default | Required | Unique | FK | Tenant Scoped | Status |
|-------------|------------|-----------|---------|----------|---------|----------|--------|-----|--------------|--------|
| id | string | id | VARCHAR(128) | No | — | Yes | PK | — | Yes (via tenant_id) | ✅ |
| tenantId | string | tenant_id | VARCHAR(128) | No | — | Yes | No | tenants(id) | Yes | ✅ |
| accountCode | string | account_code | VARCHAR(32) | No | — | Yes | Composite unique | — | Yes | ✅ |
| accountName | string | account_name | VARCHAR(256) | No | — | Yes | No | — | Yes | ✅ |
| parentId | string \| null | parent_id | VARCHAR(128) | Yes | null | No | No | accounts(id) self-ref | Yes | ✅ |
| level | AccountLevel | level | INTEGER | No | — | Yes | No | CHECK 1-4 | Yes | ✅ |
| accountType | AccountType | account_type | VARCHAR(32) | No | — | Yes | No | CHECK enum | Yes | ✅ |
| normalBalance | NormalBalance | normal_balance | VARCHAR(8) | No | — | Yes | No | CHECK enum | Yes | ✅ |
| isPosting | boolean | is_posting | BOOLEAN | Yes | false | No | No | — | Yes | ✅ |
| isSummary | boolean | is_summary | BOOLEAN | Yes | false | No | No | — | Yes | ✅ |
| isActive | boolean | is_active | BOOLEAN | Yes | true | No | No | — | Yes | ✅ |
| controlCategory | ControlCategory? | control_category | VARCHAR(32) | Yes | null | No | No | — | Yes | ✅ |
| legacyMainHeadNo | number? | legacy_main_head_no | INTEGER | Yes | null | No | No | — | Yes | ✅ |
| accountEffect | string? | account_effect | VARCHAR(64) | Yes | null | No | No | — | Yes | ✅ |
| address | string? | address | TEXT | Yes | null | No | No | — | Yes | ✅ |
| ownerName | string? | owner_name | VARCHAR(256) | Yes | null | No | No | — | Yes | ✅ |
| phone | string? | phone | VARCHAR(64) | Yes | null | No | No | — | Yes | ✅ |
| stn | string? | stn | VARCHAR(64) | Yes | null | No | No | — | Yes | ✅ |
| ntn | string? | ntn | VARCHAR(64) | Yes | null | No | No | — | Yes | ✅ |
| cnic | string? | cnic | VARCHAR(64) | Yes | null | No | No | — | Yes | ✅ |

**PARITY: ✅ Full match.**

### 6.2 VoucherHeader → vouchers

| Domain Field | Domain Type | DB Column | DB Type | Nullable | Default | Status |
|-------------|------------|-----------|---------|----------|---------|--------|
| id | string | id | VARCHAR(128) | No | — | ✅ |
| tenantId | string | tenant_id | VARCHAR(128) | No | — | ✅ |
| voucherNumber | number | voucher_number | INTEGER | No | — | ✅ |
| voucherType | VoucherType | voucher_type | VARCHAR(8) | No | — | ✅ |
| status | VoucherStatus | status | VARCHAR(8) | No | 'DRAFT' | ✅ |
| date | string | date | DATE | No | — | ✅ |
| narration | string | narration | TEXT | Yes | null | ✅ |
| createdBy | string | created_by | VARCHAR(256) | No | — | ✅ |
| createdAt | Date | created_at | TIMESTAMPTZ | Yes | NOW() | ✅ |
| updatedAt | Date | updated_at | TIMESTAMPTZ | Yes | NOW() | ✅ |

**PARITY: ✅ Full match.**

### 6.3 VoucherLine → voucher_lines

| Domain Field | Domain Type | DB Column | DB Type | Nullable | Default | Status |
|-------------|------------|-----------|---------|----------|---------|--------|
| id | string | id | VARCHAR(128) | No | — | ✅ |
| voucherId | string | voucher_id | VARCHAR(128) | No | — | ✅ FK vouchers(id) ON DELETE CASCADE |
| tenantId | string | tenant_id | VARCHAR(128) | No | — | ✅ FK tenants(id) |
| accountId | string | account_id | VARCHAR(128) | No | — | ✅ FK accounts(id) |
| description | string | description | TEXT | Yes | null | ✅ |
| debit | number | debit | DECIMAL(15,4) | Yes | 0 | ✅ |
| credit | number | credit | DECIMAL(15,4) | Yes | 0 | ✅ |
| lineOrder | number | line_order | INTEGER | No | — | ✅ |
| contraAccountId | string? | contra_account_id | VARCHAR(128) | Yes | null | ✅ |
| quantity | number? | quantity | DECIMAL(15,4) | Yes | null | ✅ |
| productId | string? | product_id | VARCHAR(128) | Yes | null | ✅ |
| branch | string? | branch | VARCHAR(64) | Yes | null | ✅ |
| stInvNo | string? | st_inv_no | VARCHAR(64) | Yes | null | ✅ |
| stRate | number? | st_rate | DECIMAL(5,2) | Yes | null | ✅ |
| stAmount | number? | st_amount | DECIMAL(15,4) | Yes | null | ✅ |
| amtExclStd | number? | amt_excl_std | DECIMAL(15,4) | Yes | null | ✅ |

**PARITY: ✅ Full match.**

### 6.4 LedgerEntry → ledger_entries

| Domain Field | Domain Type | DB Column | DB Type | Nullable | Default | Status |
|-------------|------------|-----------|---------|----------|---------|--------|
| id | string | id | VARCHAR(128) | No | — | ✅ |
| tenantId | string | tenant_id | VARCHAR(128) | No | — | ✅ |
| voucherId | string | voucher_id | VARCHAR(128) | No | — | ✅ FK vouchers(id) |
| voucherLineId | string | voucher_line_id | VARCHAR(128) | No | — | ✅ FK voucher_lines(id) |
| accountId | string | account_id | VARCHAR(128) | No | — | ✅ |
| debit | number | debit | DECIMAL(15,4) | Yes | 0 | ✅ |
| credit | number | credit | DECIMAL(15,4) | Yes | 0 | ✅ |
| entryDate | string | entry_date | DATE | No | — | ✅ |
| voucherType | VoucherType | voucher_type | VARCHAR(8) | No | — | ✅ |
| voucherNumber | number | voucher_number | INTEGER | No | — | ✅ |
| narration | string | narration | TEXT | Yes | null | ✅ |

**PARITY: ✅ Full match.**

### 6.5 Product → products

| Domain Field | Domain Type | DB Column | DB Type | Nullable | Default | Status |
|-------------|------------|-----------|---------|----------|---------|--------|
| id | string | id | VARCHAR(128) | No | — | ✅ |
| tenantId | string | tenant_id | VARCHAR(128) | No | — | ✅ |
| sku | string | sku | VARCHAR(64) | No | — | ✅ UNIQUE(tenant_id, sku) |
| name | string | name | VARCHAR(256) | No | — | ✅ |
| category | string | category | VARCHAR(128) | Yes | null | ✅ |
| unit | string | unit | VARCHAR(32) | Yes | 'PCS' | ✅ |
| pcsPerCarton | number | pcs_per_carton | INTEGER | Yes | 1 | ✅ |
| saleRate | number | sale_rate | DECIMAL(15,4) | Yes | 0 | ✅ |
| purchaseRate | number | purchase_rate | DECIMAL(15,4) | Yes | 0 | ✅ |
| retailPrice | number | retail_price | DECIMAL(15,4) | Yes | 0 | ✅ |
| tradeDiscount | number | trade_discount | DECIMAL(5,2) | Yes | 0 | ✅ |
| tradeOffer | string | trade_offer | TEXT | Yes | null | ✅ |
| minQuantity | number | min_quantity | DECIMAL(15,4) | Yes | 0 | ✅ |
| hsCode | string | hs_code | VARCHAR(64) | Yes | null | ✅ |
| gstType | GstType | gst_type | VARCHAR(16) | Yes | 'VAT' | ✅ |
| gstPercent | number | gst_percent | DECIMAL(5,2) | Yes | 0 | ✅ |
| fedPercent | number | fed_percent | DECIMAL(5,2) | Yes | 0 | ✅ |
| advanceTaxSalePercent | number | advance_tax_sale_percent | DECIMAL(5,2) | Yes | 0 | ✅ |
| advanceTaxPurchasePercent | number | advance_tax_purchase_percent | DECIMAL(5,2) | Yes | 0 | ✅ |
| isActive | boolean | is_active | BOOLEAN | Yes | true | ✅ |

**PARITY: ✅ Full match.**

### 6.6 StockMovement → stock_movements ⚠️ CRITICAL MISMATCH

| Domain Field | Domain Type | DB Column | DB Type | Nullable | Default | Status |
|-------------|------------|-----------|---------|----------|---------|--------|
| id | string | id | VARCHAR(128) | No | — | ✅ |
| tenantId | string | tenant_id | VARCHAR(128) | No | — | ✅ |
| movementType | StockMovementType | movement_type | VARCHAR(16) | No | — | ✅ |
| movementDate | string | **MISSING** | — | — | — | **❌ NO COLUMN** |
| referenceType | string? | reference_type | VARCHAR(32) | Yes | null | ✅ |
| referenceId | string? | reference_id | VARCHAR(128) | Yes | null | ✅ |
| **fromWarehouseId** | string? | **warehouse_id** | VARCHAR(128) | **No** | — | **⚠️ MISMATCH** |
| **toWarehouseId** | string? | **MISSING** | — | — | — | **❌ NO COLUMN** |
| productId | string | product_id | VARCHAR(128) | No | — | ✅ |
| quantity | number | quantity | DECIMAL(15,4) | No | — | ✅ |
| unitCost | number | unit_cost | DECIMAL(15,4) | Yes | 0 | ✅ |
| totalCost | number | **MISSING** | — | — | — | **❌ NO COLUMN (derived)** |
| narration | string? | narration | TEXT | Yes | null | ✅ |
| status | StockMovementStatus | status | VARCHAR(16) | No | 'DRAFT' | ✅ |
| createdAt | string | created_at | TIMESTAMPTZ | Yes | NOW() | ✅ |
| createdBy | string | created_by | VARCHAR(256) | No | — | ✅ |

**Issues:**
1. `fromWarehouseId` maps to `warehouse_id` but domain expects it to be optional for GRN/RETURN
2. `toWarehouseId` has NO DB column — TRANSFER cannot be stored
3. `movementDate` has NO DB column — domain field has no persistence
4. `totalCost` has NO DB column — derived (quantity × unitCost)

**This is the most critical schema gap in the entire system.**

### 6.7 All Other Entities — Summary

| Entity | PARITY | Notes |
|--------|--------|-------|
| Customer → customers | ✅ | Full match |
| Supplier → suppliers | ✅ | Full match |
| Warehouse → warehouses | ✅ | Full match (DB has extra `address` column not in domain) |
| WarehouseLocation → warehouse_locations | ⚠️ | Domain has `rack`, `shelf`, `bin` optional fields; DB has `is_active` but no rack/shelf/bin columns |
| StockLevel → stock_levels | ✅ | Full match (DB has `created_at`; domain has `lastCountDate` not in DB) |
| User → users | ✅ | Full match (no email column — by design) |
| UserCredentials → user_credentials | ✅ | Full match |
| UserSession → sessions | ✅ | Full match (token_hash pattern) |
| Tenant → tenants | ✅ | Full match |
| TenantSettings → tenant_settings | ✅ | JSONB blob — all settings stored as JSON |

---

## 7. Primary Key Strategy

| Entity | PK Type | Generation | Evidence |
|--------|---------|------------|----------|
| Tenant | VARCHAR(128) | Application-side: `tenant-${Date.now()}` (mock) / `randomBytes(16).toString('hex')` (Postgres) | MockAdapter line 47, PostgresAdapter |
| User | VARCHAR(128) | Application-side: `user-${Date.now()}` (mock) / `randomBytes(16).toString('hex')` (Postgres) | MockAdapter |
| Session | VARCHAR(128) | Application-side: `randomBytes(32).toString('hex')` (Postgres) | PostgresSessionAdapter line 34 |
| AccountHead | VARCHAR(128) | Application-side: `coa-${counter}` (mock) / `acct-${Date.now()}` (Postgres) | MockAdapter, PostgresAdapter |
| Voucher | VARCHAR(128) | Application-side: `voucher-${counter}` (mock) / `randomBytes(16).toString('hex')` (Postgres) | MockAdapter, PostgresAdapter |
| VoucherLine | VARCHAR(128) | Application-side: `voucher-${counter}` (mock) / `randomBytes(16).toString('hex')` (Postgres) | MockAdapter, PostgresAdapter |
| LedgerEntry | VARCHAR(128) | Application-side: `ledger-${counter}` (mock) / `randomBytes(16).toString('hex')` (Postgres) | MockAdapter, PostgresAdapter |
| Product | VARCHAR(128) | Application-side: `inv-${counter}` (mock) / `randomBytes(16).toString('hex')` (Postgres) | MockAdapter, PostgresAdapter |
| Customer | VARCHAR(128) | Application-side: `cust-${counter}` (mock) / `randomBytes(16).toString('hex')` (Postgres) | MockAdapter, PostgresAdapter |
| Supplier | VARCHAR(128) | Application-side: `supp-${counter}` (mock) / `randomBytes(16).toString('hex')` (Postgres) | MockAdapter, PostgresAdapter |

**Strategy: All IDs are application-side generated VARCHAR(128). No DB-side generation (no SERIAL, no UUID function calls).** Mock uses monotonically incrementing counters with prefixes. Postgres uses `randomBytes(16).toString('hex')` (32-char hex strings).

---

## 8. Foreign Key Strategy

### Existing FKs in 001_initial.sql

| From Table | Column | To Table | On Delete |
|-----------|--------|----------|-----------|
| users.tenant_id | → tenants.id | CASCADE (implicit) |
| user_credentials.user_id | → users.id | CASCADE (implicit) |
| user_credentials.tenant_id | → tenants.id | CASCADE (implicit) |
| sessions.user_id | → users.id | CASCADE (implicit) |
| sessions.tenant_id | → tenants.id | CASCADE (implicit) |
| tenant_settings.tenant_id | → tenants.id | CASCADE (implicit) |
| accounts.tenant_id | → tenants.id | CASCADE (implicit) |
| customers.tenant_id | → tenants.id | CASCADE (implicit) |
| customers.account_head_id | → accounts.id | NULL (nullable) |
| suppliers.tenant_id | → tenants.id | CASCADE (implicit) |
| suppliers.account_head_id | → accounts.id | NULL (nullable) |
| products.tenant_id | → tenants.id | CASCADE (implicit) |
| warehouses.tenant_id | → tenants.id | CASCADE (implicit) |
| warehouse_locations.tenant_id | → tenants.id | CASCADE (implicit) |
| warehouse_locations.warehouse_id | → warehouses.id | CASCADE (implicit) |
| stock_levels.tenant_id | → tenants.id | CASCADE (implicit) |
| stock_levels.product_id | → products.id | CASCADE (implicit) |
| stock_levels.warehouse_id | → warehouses.id | CASCADE (implicit) |
| stock_movements.tenant_id | → tenants.id | CASCADE (implicit) |
| stock_movements.product_id | → products.id | CASCADE (implicit) |
| stock_movements.warehouse_id | → warehouses.id | CASCADE (implicit) |
| vouchers.tenant_id | → tenants.id | CASCADE (implicit) |
| voucher_lines.voucher_id | → vouchers.id | ON DELETE CASCADE |
| voucher_lines.tenant_id | → tenants.id | CASCADE (implicit) |
| voucher_lines.account_id | → accounts.id | CASCADE (implicit) |
| ledger_entries.tenant_id | → tenants.id | CASCADE (implicit) |
| ledger_entries.voucher_id | → vouchers.id | CASCADE (implicit) |
| ledger_entries.voucher_line_id | → voucher_lines.id | CASCADE (implicit) |

### Missing FKs (Recommended)

| From | Column | To | Reason |
|------|--------|-----|--------|
| voucher_lines.product_id | → products.id | Referential integrity |
| voucher_lines.contra_account_id | → accounts.id | Referential integrity |
| ledger_entries.account_id | → accounts.id | Referential integrity |

### Tenant Consistency Risk

**voucher_lines.voucher_id + voucher_lines.tenant_id**: A voucher line could theoretically reference a voucher from a different tenant if the application passes mismatched IDs. The `tenant_id` on voucher_lines is redundant with the voucher's `tenant_id` but provides defense-in-depth. **Recommendation: Add composite FK** `FOREIGN KEY (voucher_id, tenant_id) REFERENCES vouchers(id, tenant_id)` — but PostgreSQL requires a unique constraint on the referenced columns first. **Safe alternative:** Keep current single-column FK; rely on application-level tenant scoping.

---

## 9. Tenant Isolation

### Well-Isolated Methods (tenantId in WHERE clause)

All methods on: ICOARepository (6/6), IVoucherRepository (10/10), IInventoryRepository (16/16), ICustomerRepository (7/7), ISupplierRepository (7/7), ISettingsRepository (2/2).

### Methods Without tenantId

| Interface | Method | Query By | Risk Assessment |
|-----------|--------|----------|-----------------|
| ITenantRepository | ALL (6) | id/slug | BY DESIGN — meta-entity |
| IUserRepository | findById | user.id (UUID) | Low — UUID unguessable |
| IUserRepository | isUserActive | user.id | Low |
| IUserRepository | updateUser | user.id | Low — but no tenant guard |
| IUserRepository | deactivateUser | user.id | Low — but no tenant guard |
| ISessionRepository | getSession | token_hash (SHA-256) | Low — crypto random |
| ISessionRepository | deleteSession | token_hash | Low |
| ISessionRepository | deleteAllUserSessions | user_id | Low |
| IUserCredentialsRepository | getCredentialsByUserId | user_id | Low |
| IUserCredentialsRepository | updateCredentials | user_id | Low |
| IUserCredentialsRepository | hasCredentials | user_id | Low |

**Architecture: "Session carries tenant context"** — tenantId is baked into the session at creation, carried through middleware, and trusted server-side. Unfiltered methods rely on globally unique IDs (UUIDs) and cryptographic token hashes. This is acceptable for the current architecture.

**Recommendation for RLS:** These unfiltered methods will need special handling. Since RLS policies filter by `current_setting('app.current_tenant_id')`, queries without tenant_id in WHERE will still be filtered by RLS — but only if the PostgreSQL session setting is set. For methods like `getSession(token_hash)` that legitimately need cross-tenant lookup (session validation), the application must use a service-role connection that bypasses RLS.

---

## 10. RLS Design Requirements

### Current Architecture

1. Auth middleware resolves session → extracts `tenantId` from session object
2. `tenantId` is passed to every service/repository call as a parameter
3. All repository methods filter by `tenant_id` in SQL WHERE clauses
4. No PostgreSQL-level tenant isolation exists yet

### Proposed RLS Approach

```sql
-- Set tenant context at connection acquisition
SET app.current_tenant_id = '<tenant-id>';

-- RLS policy on every tenant-owned table
CREATE POLICY tenant_isolation ON <table>
  USING (tenant_id = current_setting('app.current_tenant_id')::text);
```

### Prerequisites Before RLS Implementation

1. **Every DB connection must SET app.current_tenant_id** — The `pool.ts` `query()` and `getClient()` functions must execute `SET app.current_tenant_id` before any business query.
2. **Service-role bypass for cross-tenant operations:** `getSession()`, `deleteSession()`, `getCredentialsByUserId()`, `getPublicTenants()`, `getTenantBySlug()` need a separate connection pool or `SET ROLE service_role` to bypass RLS.
3. **Session adapter needs tenant-scoped getSession** — Currently `getSession(token_hash)` is not tenant-scoped. With RLS, this would need to be called on a bypass connection.
4. **Transaction support** — `SET app.current_property` is transaction-local. Must be set at the start of every transaction.

### Risks

- If `SET app.current_tenant_id` is forgotten, ALL queries return empty results (silent failure)
- Cross-tenant admin operations (tenant management) need separate connection handling
- Connection pooling complicates per-connection settings

---

## 11. StockMovement Reconciliation

### Gap #4: Domain has fromWarehouseId/toWarehouseId; DB has warehouse_id

**Evidence:**
- Domain type `StockMovement` (inventory.ts:257-259): `fromWarehouseId?: string`, `toWarehouseId?: string`
- DB schema (001_initial.sql:355): `warehouse_id VARCHAR(128) NOT NULL`
- Mock adapter: Uses `fromWarehouseId` and `toWarehouseId` correctly
- Postgres adapter: Uses `movement.warehouseId` (non-existent property)
- All 4 services: Use `fromWarehouseId` or `toWarehouseId` (never `warehouseId`)
- API route: Sends both `fromWarehouseId` and `toWarehouseId`
- UI: Validates and sends both fields

**Verdict:** The domain, mock adapter, services, API, and UI are all consistent with 2 fields. The DB schema and Postgres adapter are wrong.

**REQUIRED DECISION:**
- Domain representation: `fromWarehouseId?: string`, `toWarehouseId?: string` — **KEEP UNCHANGED**
- DB representation: Two columns: `from_warehouse_id VARCHAR(128)`, `to_warehouse_id VARCHAR(128)`
- Mapping required: GRN/RETURN use `to_warehouse_id`; ISSUE/ADJUSTMENT use `from_warehouse_id`; TRANSFER uses both
- Existing behavior preserved: Mock adapter already implements this correctly
- Migration impact: `ALTER TABLE stock_movements RENAME warehouse_id TO from_warehouse_id; ALTER TABLE stock_movements ADD COLUMN to_warehouse_id VARCHAR(128); ALTER TABLE stock_movements ALTER COLUMN from_warehouse_id DROP NOT NULL;`
- Domain interface must remain unchanged: **YES**

### Gap #5: PostgresInventoryAdapter uses movement.warehouseId

**Same root cause as Gap #4.** The adapter must be rewritten to use `fromWarehouseId`/`toWarehouseId`.

### TRANSFER semantics

TRANSFER is implemented in the Mock adapter (deduct from source, add to target) and available via the API/UI. However, no domain service creates TRANSFER movements — it's only available through direct stock movement creation. The Postgres adapter's TRANSFER handling is incomplete (deducts from source but never adds to target).

---

## 12. Voucher Numbering Reconciliation

### Confirmed: GLOBAL per tenant

**Evidence:**
1. `getNextVoucherNumber(tenantId)` — takes ONLY tenantId, no voucherType parameter
2. Mock adapter: Single `voucherCounter` Map keyed by tenantId only
3. Mock seed data: JV=1, SV=2,3,4,5, SRV=6, PV=7,8,12 — interleaved in single sequence
4. Postgres adapter: `SELECT MAX(voucher_number) FROM vouchers WHERE tenant_id = $1` — no type filter
5. DB constraint: `UNIQUE(tenant_id, voucher_number)` — enforces global uniqueness

**Gap #10 is NOT a gap.** The current `UNIQUE(tenant_id, voucher_number)` constraint is correct for the implemented numbering behavior.

---

## 13. Accounting Immutability

### Verified Rules

| Rule | Implementation | Evidence |
|------|---------------|----------|
| Draft vouchers can be edited | `updateVoucher()` checks `status === 'POSTED'` and throws | MockVoucherAdapter line 423, PostgresVoucherAdapter line 121 |
| Draft vouchers can be deleted | `deleteVoucher()` checks `status === 'POSTED'` and throws | MockVoucherAdapter line 437, PostgresVoucherAdapter line 171 |
| Posted vouchers cannot be mutated | Both adapters enforce this | Confirmed in tests |
| Posted vouchers cannot be deleted | Both adapters enforce this | Confirmed in tests |
| Ledger entries created on post | `postVoucher()` creates ledger_entries for each line | MockVoucherAdapter line 448, PostgresVoucherAdapter line 208 |
| Financial reports use POSTED only | `FinancialReportService` passes `status: 'POSTED'` to `getLedgerEntries()` | FinancialReportService.ts |
| Drafts don't affect reports | Reports filter by POSTED status at repository level | Confirmed in tests |

**No strengthening or weakening needed. Rules are correctly implemented.**

---

## 14. Transaction Boundaries

### Multi-Table Operations Requiring Atomicity

| Operation | Tables Affected | Current Transaction? | Required? | Risk |
|-----------|----------------|---------------------|-----------|------|
| createVoucher | vouchers + voucher_lines | YES (PostgresVoucherAdapter) | YES | Low — atomic |
| updateVoucher | vouchers + voucher_lines | YES (PostgresVoucherAdapter) | YES | Low — atomic |
| deleteVoucher | vouchers + voucher_lines | YES (PostgresVoucherAdapter) | YES | Low — atomic |
| postVoucher | vouchers + ledger_entries | YES (PostgresVoucherAdapter) | YES | Low — atomic |
| postSaleBill | voucher + ledger + stock_movement + stock_level | **NO** | YES | **HIGH** — ledger entries created before stock movement |
| postPurchaseBill | voucher + ledger + stock_movement + stock_level | **NO** | YES | **HIGH** — same risk |
| postSaleReturn | voucher + ledger + stock_movement + stock_level | **NO** | YES | **HIGH** |
| postPurchaseReturn | voucher + ledger + stock_movement + stock_level | **NO** | YES | **HIGH** |
| postStockMovement | stock_movements + stock_levels | YES (PostgresInventoryAdapter) | YES | Low — atomic |
| cancelStockMovement | stock_movements + stock_levels | YES (PostgresInventoryAdapter) | YES | Low — atomic |

**CRITICAL:** `postSaleBill` and `postPurchaseBill` in domain services write to voucherRepo (postVoucher → ledger entries) AND inventoryRepo (createStockMovement + postStockMovement → stock levels) WITHOUT a shared transaction. If the inventory operation fails after the voucher is posted, ledger entries exist without corresponding stock movements.

**This is an existing architectural limitation, not a migration blocker.** The services operate at the repository interface level and cannot share a DB transaction across different adapters.

---

## 15. Concurrency Requirements

### Voucher Numbering

- `getNextVoucherNumberTx()` uses `FOR UPDATE` on `vouchers` table to lock the max number
- **Risk:** Two concurrent `createVoucher()` calls could both read the same max number before either commits. The `FOR UPDATE` lock prevents this.
- **Status:** Adequately protected in Postgres adapter. Mock adapter is single-threaded.

### Simultaneous Stock Updates

- `postStockMovement()` uses `FOR UPDATE` on `stock_levels` row
- **Risk:** Two concurrent postings for the same product+warehouse could cause AVCO miscalculation
- **Status:** Adequately protected by row-level lock

### Simultaneous Receipts/Payments

- No special locking for customer receipts or supplier payments
- **Risk:** Two receipts for the same customer could create duplicate AR credits
- **Status:** Low risk — voucher numbering prevents duplicates; ledger entries are append-only

---

## 16. Inventory/AVCO Freeze

### Verified AVCO Formula

```
calculateAVCO(currentQty, currentCost, incomingQty, incomingCost):
  totalQty = currentQty + incomingQty
  if totalQty == 0: return 0
  return (currentQty * currentCost + incomingQty * incomingCost) / totalQty
```

**Source:** `inventory.ts:336-345`, tested in `inventory.test.ts`

### Movement Type Behavior (Verified)

| Type | Direction | AVCO Applied? | Warehouse Field Used | Stock Effect |
|------|-----------|--------------|---------------------|--------------|
| GRN | In | YES | toWarehouseId | quantityOnHand += qty; unitCost = AVCO |
| RETURN | In | YES | toWarehouseId | quantityOnHand += qty; unitCost = AVCO |
| ISSUE | Out | NO | fromWarehouseId | quantityOnHand -= qty; unitCost unchanged |
| TRANSFER | Both | YES (target only) | fromWarehouseId + toWarehouseId | Source -= qty; Target += qty at source's unitCost |
| ADJUSTMENT | Either | YES (if positive) | fromWarehouseId | quantityOnHand += qty (can be negative); AVCO if positive |

**DO NOT MODIFY.** This is the frozen, verified behavior.

---

## 17. COGS Gap

**COGS GL posting does NOT exist.** When a sale is posted:
- Voucher creates: DR Customer AR, CR Sales Revenue, CR Tax Payable
- Stock movement creates: ISSUE (deducts quantityOnHand)
- **Missing:** DR COGS (51101), CR Inventory (11301)

The `calculateCOGS(quantitySold, costRate)` function exists in `inventory.ts:352` but is never called by any service. Account 51101 (Material Purchases) exists in the COA but is never debited by any sale posting.

**SPECIFICATION GAP — SOURCE VALUE/LOGIC NOT FOUND**

The cost_rate formula is unknown (Step 45 Gap #1). COGS GL entry cannot be implemented until this is resolved.

---

## 18. Tax Logic Freeze

### Verified Tax Formula

```
Amount = Qty × Rate
Discount = Amount × (TradeDisc% / 100)
ToAmount = Amount - Discount
GST = ToAmount × (ST% / 100)
FurtherTax = ToAmount × (FST% / 100)
FED = ToAmount × (FED% / 100)
AdvanceTax = ToAmount × (ADV% / 100)
Net = ToAmount + GST + FurtherTax + FED + AdvanceTax
```

**Source:** `inventory.ts:418-437`, tested in `inventory.test.ts`

### Verified Tax Account Mapping

| Transaction | Tax Component | Account Code | Account Name | Direction |
|------------|--------------|-------------|-------------|-----------|
| Sale | GST + FurtherTax | 21201 | Sales Tax Output | CREDIT |
| Sale | FED | 21203 | FED Payable | CREDIT |
| Sale | AdvanceTax | 21202 | Withholding Tax Payable | CREDIT |
| Purchase | GST + FurtherTax | 11401 | Sales Tax Input | DEBIT |
| Purchase | FED | 11403 | FED Input | DEBIT |
| Purchase | AdvanceTax | 11402 | Advance Income Tax | DEBIT |
| Sale Return | GST + FurtherTax | 21201 | Sales Tax Output | DEBIT (reverse) |
| Sale Return | FED | 21203 | FED Payable | DEBIT (reverse) |
| Sale Return | AdvanceTax | 21202 | Withholding Tax Payable | DEBIT (reverse) |
| Purchase Return | GST + FurtherTax | 11401 | Sales Tax Input | CREDIT (reverse) |
| Purchase Return | FED | 11403 | FED Input | CREDIT (reverse) |
| Purchase Return | AdvanceTax | 11402 | Advance Income Tax | CREDIT (reverse) |

### Hardcoded Tax Account Codes

6 codes are hardcoded in:
- `SalesService.ts:35-48` (private ACCOUNT_CODES constant)
- `PurchaseService.ts:39-49` (private ACCOUNT_CODES constant)
- `SaleReturnService.ts:33-42` (private ACCOUNT_CODES constant)
- `PurchaseReturnService.ts:33-42` (private ACCOUNT_CODES constant)
- `BillDetailService.ts:239-240` (raw string literals in comparison)

`TaxAccountMapping` in `settings.ts:149-162` exists but is **completely unused by any service**. The Settings UI allows configuration, but no service reads it.

**DO NOT MODIFY.** The hardcoded values are the verified legacy-derived behavior. The unused `TaxAccountMapping` is a vestigial configuration surface.

---

## 19. Stored vs Derived Data

| Data | Classification | Stored? | Derivation |
|------|---------------|---------|------------|
| AccountHead | STORED SOURCE | Yes | — |
| VoucherHeader | STORED SOURCE | Yes | — |
| VoucherLine | STORED SOURCE | Yes | — |
| LedgerEntry | STORED SOURCE | Yes | Created on voucher post |
| Product | STORED SOURCE | Yes | — |
| Warehouse | STORED SOURCE | Yes | — |
| StockLevel.quantityOnHand | CACHE/MATERIALIZED | Yes | Updated by stock movements |
| StockLevel.unitCost | CACHE/MATERIALIZED | Yes | AVCO recalculation |
| StockMovement | STORED SOURCE | Yes | — |
| Customer | STORED SOURCE | Yes | — |
| Supplier | STORED SOURCE | Yes | — |
| LedgerEntry running balance | DERIVED | No (computed on read) | Sum of debits - credits |
| totalCost on StockMovement | DERIVED | No (not in DB) | quantity × unitCost |
| movementDate on StockMovement | DERIVED | No (not in DB) | Same as created_at |
| Financial report totals | DERIVED | No (computed on read) | Aggregation of ledger entries |
| Party balances | DERIVED | No (computed on read) | Sum of ledger entries per account |
| Aging buckets | DERIVED | No (computed on read) | Date-based ledger aggregation |
| Dashboard KPIs | DERIVED | No (computed on read) | Aggregation of vouchers/ledger |

---

## 20. Index Specification

### Existing Indexes (from 001_initial.sql)

| Table | Index | Columns | Type |
|-------|-------|---------|------|
| users | idx_users_tenant_id | tenant_id | B-tree |
| users | idx_users_username | (tenant_id, username) | Composite |
| user_credentials | idx_user_credentials_tenant | tenant_id | B-tree |
| sessions | idx_sessions_token_hash | token_hash | B-tree |
| sessions | idx_sessions_user_id | user_id | B-tree |
| sessions | idx_sessions_expires_at | expires_at | B-tree |
| accounts | idx_accounts_tenant_id | tenant_id | B-tree |
| accounts | idx_accounts_code | (tenant_id, account_code) | Composite |
| accounts | idx_accounts_parent | (tenant_id, parent_id) | Composite |
| accounts | idx_accounts_type | (tenant_id, account_type) | Composite |
| customers | idx_customers_tenant_id | tenant_id | B-tree |
| customers | idx_customers_account_head | (tenant_id, account_head_id) | Composite |
| customers | idx_customers_name | (tenant_id, name) | Composite |
| suppliers | idx_suppliers_tenant_id | tenant_id | B-tree |
| suppliers | idx_suppliers_account_head | (tenant_id, account_head_id) | Composite |
| suppliers | idx_suppliers_name | (tenant_id, name) | Composite |
| products | idx_products_tenant_id | tenant_id | B-tree |
| products | idx_products_sku | (tenant_id, sku) | Composite |
| warehouses | idx_warehouses_tenant_id | tenant_id | B-tree |
| warehouse_locations | idx_locations_tenant | tenant_id | B-tree |
| warehouse_locations | idx_locations_warehouse | warehouse_id | B-tree |
| stock_levels | idx_stock_levels_tenant | tenant_id | B-tree |
| stock_levels | idx_stock_levels_product | (tenant_id, product_id) | Composite |
| stock_levels | idx_stock_levels_warehouse | (tenant_id, warehouse_id) | Composite |
| stock_movements | idx_stock_movements_tenant | tenant_id | B-tree |
| stock_movements | idx_stock_movements_product | (tenant_id, product_id) | Composite |
| stock_movements | idx_stock_movements_warehouse | (tenant_id, warehouse_id) | Composite |
| stock_movements | idx_stock_movements_type | (tenant_id, movement_type) | Composite |
| stock_movements | idx_stock_movements_reference | (tenant_id, reference_id) | Composite |
| vouchers | idx_vouchers_tenant_id | tenant_id | B-tree |
| vouchers | idx_vouchers_type | (tenant_id, voucher_type) | Composite |
| vouchers | idx_vouchers_status | (tenant_id, status) | Composite |
| vouchers | idx_vouchers_date | (tenant_id, date) | Composite |
| vouchers | idx_vouchers_created_by | (tenant_id, created_by) | Composite |
| voucher_lines | idx_voucher_lines_voucher | voucher_id | B-tree |
| voucher_lines | idx_voucher_lines_tenant | tenant_id | B-tree |
| voucher_lines | idx_voucher_lines_account | (tenant_id, account_id) | Composite |
| voucher_lines | idx_voucher_lines_product | (tenant_id, product_id) | Composite |
| ledger_entries | idx_ledger_tenant_id | tenant_id | B-tree |
| ledger_entries | idx_ledger_voucher | (tenant_id, voucher_id) | Composite |
| ledger_entries | idx_ledger_account | (tenant_id, account_id) | Composite |
| ledger_entries | idx_ledger_date | (tenant_id, entry_date) | Composite |

### Missing Indexes (Recommended)

| Table | Recommended Index | Reason |
|-------|------------------|--------|
| ledger_entries | (tenant_id, account_id, entry_date) | Financial reports filter by account + date range |
| voucher_lines | (tenant_id, voucher_id, line_order) | Voucher detail view sorts by line_order |
| stock_movements | (tenant_id, product_id, movement_type) | Movement history filtered by type |

### Redundant Indexes

None identified — all existing indexes serve specific query patterns.

---

## 21. Constraint Audit

### CHECK Constraints in 001_initial.sql

| Table | Column | Rule | Source Evidence | Status |
|-------|--------|------|----------------|--------|
| users | role | IN ('ADMIN','MANAGER','ACCOUNTANT','SALES','PURCHASE','VIEWER') | rbac.ts SYSTEM_ROLES | ✅ Correct |
| vouchers | voucher_type | IN ('JV','CV','CP','CR','PV','SV','SRV','PRV','CPV','CRV','BPV','BRV') | voucher.ts VoucherType | ✅ Correct |
| vouchers | status | IN ('DRAFT','POSTED') | voucher.ts VoucherStatus | ✅ Correct |
| stock_movements | movement_type | IN ('GRN','ISSUE','TRANSFER','ADJUSTMENT','RETURN') | inventory.ts StockMovementType | ✅ Correct |
| stock_movements | status | IN ('DRAFT','POSTED','CANCELLED') | inventory.ts StockMovementStatus | ✅ Correct |
| accounts | level | BETWEEN 1 AND 4 | coa.ts AccountLevel | ✅ Correct |
| accounts | account_type | IN ('ASSET','LIABILITY','EQUITY','REVENUE','COGS','EXPENSE') | coa.ts AccountType | ✅ Correct |
| accounts | normal_balance | IN ('DEBIT','CREDIT') | coa.ts NormalBalance | ✅ Correct |

### Missing CHECK Constraints (Recommended)

| Table | Column | Proposed Rule | Risk |
|-------|--------|--------------|------|
| voucher_lines | debit | >= 0 | Prevents negative debits |
| voucher_lines | credit | >= 0 | Prevents negative credits |
| stock_levels | quantity_on_hand | >= 0 | Prevents negative stock (but ADJUSTMENT can make it 0) |
| stock_movements | quantity | > 0 | Prevents zero-quantity movements |

**Note:** The `quantity_on_hand >= 0` constraint would conflict with ADJUSTMENT movements that can reduce stock. The Mock adapter allows negative quantity checks to be thrown at the application level. **DO NOT add this constraint** unless the application guarantees all adjustments are validated.

### Unique Constraints

| Table | Columns | Status |
|-------|---------|--------|
| tenants.slug | UNIQUE | ✅ |
| users | UNIQUE(tenant_id, username) | ✅ |
| accounts | UNIQUE(tenant_id, account_code) | ✅ |
| products | UNIQUE(tenant_id, sku) | ✅ |
| warehouses | UNIQUE(tenant_id, code) | ✅ |
| warehouse_locations | UNIQUE(warehouse_id, code) | ✅ (note: not tenant-scoped) |
| stock_levels | UNIQUE(tenant_id, product_id, warehouse_id) | ✅ |
| vouchers | UNIQUE(tenant_id, voucher_number) | ✅ (global numbering confirmed) |
| sessions.token_hash | UNIQUE | ✅ |

---

## 22. Mock/Postgres Parity Matrix

| Repository | Method | Mock | Postgres | Parity? | Difference | Severity |
|-----------|--------|------|----------|---------|------------|----------|
| ICOA | getAccountsByTenantId | ✅ | ✅ | ✅ | — | — |
| ICOA | getAccountById | ✅ | ✅ | ✅ | — | — |
| ICOA | getAccountByCode | ✅ | ✅ | ✅ | — | — |
| ICOA | createAccount | ✅ | ✅ | ✅ | Mock validates parent level; Postgres doesn't | LOW |
| ICOA | updateAccount | ✅ | ✅ | ✅ | — | — |
| ICOA | deactivateAccount | ✅ | ✅ | ✅ | — | — |
| IVoucher | getVouchersByTenantId | ✅ | ✅ | ✅ | — | — |
| IVoucher | getVoucherById | ✅ | ✅ | ✅ | — | — |
| IVoucher | getNextVoucherNumber | ✅ | ✅ | ✅ | — | — |
| IVoucher | getVoucherLines | ✅ | ✅ | ✅ | — | — |
| IVoucher | createVoucher | ✅ | ✅ | ✅ | — | — |
| IVoucher | updateVoucher | ✅ | ✅ | ✅ | — | — |
| IVoucher | deleteVoucher | ✅ | ✅ | ✅ | — | — |
| IVoucher | postVoucher | ✅ | ✅ | ✅ | — | — |
| IVoucher | getLedgerEntries | ✅ | ✅ | ✅ | — | — |
| IVoucher | getLedgerForAccount | ✅ | ✅ | ✅ | — | — |
| IInventory | getProducts | ✅ | ✅ | ✅ | — | — |
| IInventory | createProduct | ✅ | ✅ | ✅ | Mock validates duplicate SKU | LOW |
| IInventory | getStockMovements | ✅ | ✅ | ✅ | — | — |
| IInventory | createStockMovement | ✅ | ❌ | ❌ | Postgres uses non-existent warehouseId | **CRITICAL** |
| IInventory | postStockMovement | ✅ | ❌ | ❌ | Postgres uses non-existent warehouseId; TRANSFER broken | **CRITICAL** |
| IInventory | cancelStockMovement | ✅ | ❌ | ❌ | Postgres uses non-existent warehouseId | **CRITICAL** |
| ICustomer | All 7 methods | ✅ | ✅ | ✅ | — | — |
| ISupplier | All 7 methods | ✅ | ✅ | ✅ | — | — |
| ISession | createSession | ✅ | ✅ | ✅ | — | — |
| ISession | getSession | ✅ | ✅ | ⚠️ | Mock returns session directly; Postgres hashes token first | LOW |
| ISession | deleteSession | ✅ | ✅ | ✅ | — | — |
| IUser | findByUsername | ✅ | ✅ | ✅ | — | — |
| IUser | findById | ✅ | ✅ | ✅ | — | — |
| IUser | updateUser | ✅ | ✅ | ✅ | — | — |
| ITenant | All 6 methods | ✅ | ⚠️ | ⚠️ | updateTenant has wrong UPDATE_COLUMNS | **HIGH** |
| ISettings | getSettingsByTenantId | ✅ | ❌ | ❌ | No Postgres adapter exists | **HIGH** |
| ISettings | updateSettings | ✅ | ❌ | ❌ | No Postgres adapter exists | **HIGH** |

---

## 23. API Contract Freeze

### Verified: 70+ endpoints across 15 modules

All endpoints receive tenantId from server-side session (never from client). All mutation endpoints require CSRF token. All endpoints require appropriate permission.

| Module | Endpoints | Key Routes | Domain Service |
|--------|-----------|------------|---------------|
| Auth | 3 | POST /login, GET /me, POST /logout | MockAuthService |
| Tenants | 2 | GET /, GET /:slug | ITenantRepository |
| Sales | 4 | POST /, POST /:id/post, DELETE /:id, GET / | SalesService |
| Purchases | 4 | POST /, POST /:id/post, DELETE /:id, GET / | PurchaseService |
| Sale Returns | 4 | POST /, POST /:id/post, DELETE /:id, GET / | SaleReturnService |
| Purchase Returns | 4 | POST /, POST /:id/post, DELETE /:id, GET / | PurchaseReturnService |
| Customer Receipts | 3 | POST /, POST /:id/post, DELETE /:id | CustomerReceiptService |
| Cash Book | 5 | GET /accounts, GET /, POST /, POST /:id/post, DELETE /:id | CashBookService |
| Customers | 5 | GET /, POST /, PUT /:id, DELETE /:id, GET /:id/ar-balance | ICustomerRepository |
| Suppliers | 4 | GET /, POST /, PUT /:id, DELETE /:id | ISupplierRepository |
| Products | 4 | GET /, POST /, PUT /:id, DELETE /:id | IInventoryRepository |
| Stock Levels | 1 | GET / | IInventoryRepository |
| Stock Movements | 3 | POST /, POST /:id/post, POST /:id/cancel | IInventoryRepository |
| COA | 4 | GET /, POST /, PUT /:id, DELETE /:id | ICOARepository |
| Vouchers | 5 | GET /, POST /, PUT /:id, DELETE /:id, POST /:id/post, GET /:id/lines | IVoucherRepository |
| Reports | 3 | GET /trial-balance, GET /profit-and-loss, GET /balance-sheet | FinancialReportService |
| Ledger | 2 | GET /, GET /:accountId | IVoucherRepository |
| Dashboard | 1 | GET / | DashboardService |
| Aging | 1 | GET / | AgingReportService |
| Party Balance | 2 | GET /customer-balances, GET /supplier-balances | PartyBalanceService |
| Settings | 2 | GET /, PUT / | ISettingsRepository |
| Bills | 2 | GET /, GET /:id | BillsListService, BillDetailService |

**DB schema decisions MUST NOT force API changes.** The API layer is frozen.

---

## 24. Financial Reporting Dependencies

| Report | Tables Used | Posted-Only? | Date Filter | Account Hierarchy |
|--------|------------|-------------|-------------|-------------------|
| Trial Balance | ledger_entries, accounts | YES | entry_date range | Yes (group by account) |
| P&L | ledger_entries, accounts | YES | entry_date range | Yes (Revenue, COGS, Expense types) |
| Balance Sheet | ledger_entries, accounts | YES | entry_date range | Yes (Asset, Liability, Equity types) |
| General Ledger | ledger_entries, vouchers | YES (via status filter) | entry_date range | No |
| Cash Book | ledger_entries, vouchers, accounts | YES (via status filter) | entry_date range | No (filtered by account code 11101/11102) |
| AR/AP | ledger_entries, accounts | YES | As-of date | Yes (RECEIVABLE/PAYABLE categories) |
| Aging | ledger_entries, customers, suppliers | YES | As-of date | No |
| Party Balance | ledger_entries, customers, suppliers | YES | None | No |
| Dashboard | vouchers, ledger_entries, stock_levels | Varies | Period-based | No |

**All reports require `ledger_entries` to be stored (not derived).** The current architecture stores ledger entries on voucher post and queries them for reports.

---

## 25. Authentication/Session Schema

### Flow

1. Login: `{ username, password, tenantId }` → MockAuthService.authenticate()
2. Service validates: tenant exists+active → user exists+active → credentials match → creates session
3. Session stored with: `id`, `token_hash` (SHA-256), `user_id`, `tenant_id`, `expires_at`
4. Cookie: `erp_session` = raw token (HTTP-only, secure in production)
5. Middleware: Extracts token from cookie → hashes → looks up session → attaches user+session to request
6. All subsequent routes: `req.user.tenantId` used for data scoping

### Session Properties

- Duration: 30 minutes
- Storage: SHA-256 hash of token (raw token never stored)
- Expiry: Checked on every `getSession()` call
- Cleanup: `cleanupExpiredSessions()` available but not scheduled

### Users Table

- NO email column (by design — username-only auth)
- Role stored directly on user record
- `is_active` flag for soft deactivation

### UserCredentials Table

- Separate from users (boundary isolation)
- Stores `password_hash`, `algo`, `salt`
- `ON CONFLICT (user_id) DO NOTHING` on store

---

## 26. All 10 Specification Gaps

| # | Gap | Confirmed? | Evidence | DB Impact | Domain Impact | Migration Impact | Safe to Resolve? |
|---|-----|-----------|----------|-----------|---------------|-----------------|-----------------|
| 1 | Cost_rate formula unknown; COGS GL entry deferred | YES | No service calculates or posts COGS. `calculateCOGS()` exists but is never called. | None | None | None | NO — remains OPEN |
| 2 | No real PostgreSQL database | YES | All tests use mock adapters. DB integration tests are PENDING. | N/A | N/A | This step creates the DB | N/A — being resolved |
| 3 | Supplier aging shows 0 for some suppliers | YES | FIFO allocation in AgingReportService finds no matching payments | None | None | None | NO — remains OPEN |
| 4 | StockMovement: fromWarehouseId/toWarehouseId vs warehouse_id | YES | Domain: 2 fields. DB: 1 column NOT NULL. Postgres adapter: non-existent property. | **CRITICAL** | None | Must add to_warehouse_id, rename warehouse_id, DROP NOT NULL | YES — MUST FIX |
| 5 | PostgresInventoryAdapter uses movement.warehouseId | YES | Same root cause as #4. Runtime crash on any stock movement write. | **CRITICAL** | None | Rewrite adapter | YES — MUST FIX |
| 6 | cancelStockMovement ADJUSTMENT sets qty to 0 | YES | Mock adapter line 661: `quantityOnHand: 0` instead of reversing to previous | MEDIUM | None | None | NO — remains OPEN |
| 7 | BillDetailService has 6 hardcoded tax account codes | YES | Raw string literals at lines 239-240. TaxAccountMapping in settings is unused. | None | None | None | NO — remains OPEN (frozen behavior) |
| 8 | Voucher/ledger concurrency | YES | getNextVoucherNumberTx uses FOR UPDATE; getVoucherLines does not. | Low | None | None | NO — remains OPEN |
| 9 | COA updateAccount doesn't support parentId/level changes | YES | UpdateAccountHeadDTO excludes parentId and level | Low | None | None | NO — remains OPEN |
| 10 | Voucher numbering UNIQUE constraint | NOT A GAP | Numbering is global per tenant. UNIQUE(tenant_id, voucher_number) is correct. | None | None | None | RESOLVED — no change needed |

---

## 27. Migration Blockers

| # | Blocker | Severity | Resolution Required |
|---|---------|----------|-------------------|
| 1 | stock_movements: single warehouse_id vs dual from/to | CRITICAL | Add to_warehouse_id, rename warehouse_id, DROP NOT NULL on from |
| 2 | PostgresInventoryAdapter: references non-existent movement.warehouseId | CRITICAL | Rewrite to use fromWarehouseId/toWarehouseId |
| 3 | PostgresTenantAdapter: TENANT_UPDATE_COLUMNS maps 12 wrong fields | HIGH | Fix column mapping to match UpdateTenantPayload |
| 4 | No PostgresSettingsAdapter | HIGH | Create PostgresSettingsAdapter implementing ISettingsRepository |
| 5 | stock_movements: missing movementDate column | MEDIUM | Add movement_date column or map to created_at |
| 6 | warehouse_locations: missing rack/shelf/bin columns | LOW | Add columns or remove from domain type |

---

## 28. Migration-Ready Schema Specification

### Required Schema Changes (Before Migration)

```sql
-- 1. Fix stock_movements warehouse model
ALTER TABLE stock_movements RENAME COLUMN warehouse_id TO from_warehouse_id;
ALTER TABLE stock_movements ALTER COLUMN from_warehouse_id DROP NOT NULL;
ALTER TABLE stock_movements ADD COLUMN to_warehouse_id VARCHAR(128) REFERENCES warehouses(id);
ALTER TABLE stock_movements ADD COLUMN movement_date DATE DEFAULT CURRENT_DATE;

-- 2. Update stock_movements index
DROP INDEX IF EXISTS idx_stock_movements_warehouse;
CREATE INDEX idx_stock_movements_from_wh ON stock_movements(tenant_id, from_warehouse_id);
CREATE INDEX idx_stock_movements_to_wh ON stock_movements(tenant_id, to_warehouse_id);

-- 3. Add warehouse_locations optional columns (if needed by domain)
ALTER TABLE warehouse_locations ADD COLUMN rack VARCHAR(64);
ALTER TABLE warehouse_locations ADD COLUMN shelf VARCHAR(64);
ALTER TABLE warehouse_locations ADD COLUMN bin VARCHAR(64);

-- 4. Add missing FK constraints (recommended)
ALTER TABLE voucher_lines ADD CONSTRAINT fk_voucher_lines_product
  FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE voucher_lines ADD CONSTRAINT fk_voucher_lines_contra_account
  FOREIGN KEY (contra_account_id) REFERENCES accounts(id);
ALTER TABLE ledger_entries ADD CONSTRAINT fk_ledger_account
  FOREIGN KEY (account_id) REFERENCES accounts(id);

-- 5. Add CHECK constraints (recommended)
ALTER TABLE voucher_lines ADD CONSTRAINT chk_voucher_lines_debit CHECK (debit >= 0);
ALTER TABLE voucher_lines ADD CONSTRAINT chk_voucher_lines_credit CHECK (credit >= 0);
```

---

## 29. Seed Data Rules

### Classification

| Category | Data | Source | Count |
|----------|------|--------|-------|
| **System Seed** | Tenants | Demo data (NOT legacy) | 3 |
| **System Seed** | Users | Demo data (NOT legacy) | 6 |
| **System Seed** | User Credentials | Demo data (NOT legacy) | 6 |
| **Demo Seed** | Accounts (COA) | Derived from audit/legacy structure | 62 per tenant |
| **Demo Seed** | Products | Fictional data ("Demo Wholesale") | 8 per tenant |
| **Demo Seed** | Warehouses | Fictional data | 2 per tenant |
| **Demo Seed** | Warehouse Locations | Fictional data | 6 per tenant |
| **Demo Seed** | Customers | Fictional data | 5 per tenant |
| **Demo Seed** | Suppliers | Fictional data | 5 per tenant |
| **Demo Seed** | Settings | Fictional business profile | 3 |
| **Demo Seed** | Vouchers | Fictional transactions | 18 per tenant |
| **Demo Seed** | Stock Levels | Derived from products + movements | 16 per tenant |
| **Demo Seed** | Stock Movements | Fictional GRN/ADJUSTMENT | 5 per tenant |

**ALL seed data is demo/business seed, NOT legacy master data.** Legacy ERP data is at http://38.92.47.89:8026/ and has not been migrated.

---

## 30. Migration Sequence

```
Phase 1: Schema (execute 001_initial.sql + fixes)
  1. Create all 16 tables
  2. Apply stock_movements schema fixes (dual warehouse, movement_date)
  3. Add missing CHECK constraints
  4. Add missing FK constraints
  5. Create all indexes

Phase 2: Seed Data
  6. Insert 3 tenants
  7. Insert 6 users + 6 credentials
  8. Insert 186 accounts (62 per tenant)
  9. Insert 24 products (8 per tenant)
  10. Insert 6 warehouses (2 per tenant)
  11. Insert 18 warehouse locations (6 per tenant)
  12. Insert 15 customers (5 per tenant)
  13. Insert 15 suppliers (5 per tenant)
  14. Insert 3 settings (1 per tenant)
  15. Insert 54 stock levels (16 per tenant)
  16. Insert 15 stock movements (5 per tenant)
  17. Insert 54 vouchers + lines + ledger entries (18 per tenant)

Phase 3: Adapter Fixes
  18. Fix PostgresInventoryAdapter (fromWarehouseId/toWarehouseId)
  19. Fix PostgresTenantAdapter (TENANT_UPDATE_COLUMNS)
  20. Create PostgresSettingsAdapter
  21. Fix PostgresUserCredentialsAdapter (tenant_id in getCredentialsByUserId)

Phase 4: RLS (optional, after verification)
  22. Enable RLS on all 16 tables
  23. Create tenant_isolation policies
  24. Configure connection-level tenant context setting

Phase 5: Verification
  25. Run all 496 tests against mock (should all pass)
  26. Run smoke tests against Supabase
  27. Verify RLS isolation
  28. Verify financial report parity
```

---

## 31. Pre-Migration Checklist

- [ ] stock_movements: dual warehouse columns (from_warehouse_id, to_warehouse_id)
- [ ] stock_movements: movement_date column added
- [ ] PostgresInventoryAdapter: rewritten for dual warehouse model
- [ ] PostgresTenantAdapter: TENANT_UPDATE_COLUMNS fixed
- [ ] PostgresSettingsAdapter: created
- [ ] Missing FK constraints added
- [ ] Missing CHECK constraints added
- [ ] All indexes created
- [ ] Seed data SQL prepared
- [ ] 496 tests pass
- [ ] TypeScript 0 errors
- [ ] Build success

---

## 32. Post-Migration Reconciliation Plan

1. **COA Parity:** Verify 62 accounts per tenant match mock seed data
2. **Voucher Parity:** Verify 18 vouchers per tenant with correct types, statuses, line counts
3. **Ledger Parity:** Verify ledger entries match mock for all POSTED vouchers
4. **Stock Parity:** Verify stock levels match mock (quantity + AVCO cost)
5. **Report Parity:** Run Trial Balance, P&L, Balance Sheet against Supabase and compare with mock results
6. **Tax Parity:** Verify tax amounts in ledger entries match expected calculations
7. **Tenant Isolation:** Verify Tenant A cannot read Tenant B data
8. **Auth Parity:** Verify login, session, logout flow works
9. **CRUD Parity:** Create/update/delete operations across all modules
10. **Concurrency:** Verify voucher numbering and stock updates under concurrent access

---

## 33. Final GREEN/YELLOW/RED Gate

### **YELLOW — MIGRATION POSSIBLE WITH EXPLICIT EXCEPTIONS**

**Rationale:**
- 496 tests pass, TypeScript clean, Build success — codebase is healthy
- Domain contracts are well-defined and consistent across 10 repository interfaces
- Mock/Postgres parity is high for 8 of 10 repositories
- Voucher numbering is correctly designed (global per tenant)
- Tax logic is frozen and verified
- Financial reports correctly filter by POSTED status

**YELLOW because:**
1. **CRITICAL:** stock_movements schema mismatch (Gap #4/#5) — must be fixed before any stock movement write
2. **HIGH:** PostgresTenantAdapter broken UPDATE_COLUMNS — maps `name`, `displayName`, `legalName`, `registrationNumber`, `taxNumber`, `address`, `city`, `province`, `phone`, `email`, `website`, `logo` — NONE of which exist on `UpdateTenantPayload` (which has `brandName`, `logoUrl`, `primaryColor`, `accentColor`, `isActive`). `updateTenant()` silently drops ALL mutations.
3. **HIGH:** No PostgresSettingsAdapter — settings will fall back to mock
4. **MEDIUM:** StockMovement missing movementDate column
5. **MEDIUM:** Domain services lack cross-repository transaction wrappers

**Migration CAN proceed IF:**
- Schema changes for stock_movements are applied (Phase 1 fixes)
- PostgresInventoryAdapter is rewritten (Phase 3 fix #18)
- PostgresTenantAdapter is fixed (Phase 3 fix #19)
- PostgresSettingsAdapter is created (Phase 3 fix #20)
- These fixes are completed BEFORE enabling the PostgreSQL adapters

**Files Changed:**
- `audit/46A_SCHEMA_RECONCILIATION.md` (this document)
- No production code changed (audit-only step)

**Commit:** NO COMMIT — AUDIT ONLY
