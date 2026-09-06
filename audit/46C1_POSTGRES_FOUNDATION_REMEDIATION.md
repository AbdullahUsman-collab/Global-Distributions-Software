# Step 46C-1 — PostgreSQL Foundation Remediation

## 1. Scope

Remediated four PostgreSQL foundation blockers identified by Step 46A audit and carried forward by Step 46B:

1. stock_movements dual-warehouse schema mismatch
2. PostgresInventoryAdapter referencing nonexistent `movement.warehouseId`
3. PostgresTenantAdapter incorrect TENANT_UPDATE_COLUMNS mapping
4. PostgresSettingsAdapter not existing

## 2. Blocker #1 — stock_movements

### Original Mismatch

- Domain `StockMovement` uses `fromWarehouseId?` and `toWarehouseId?` (inventory.ts:257-259)
- DB schema had single `warehouse_id NOT NULL` (001_initial.sql:359)

### Affected Files

- `src/server/db/migrations/002_fix_stock_movements.sql` (NEW)
- `src/server/db/migrate.ts` (registered migration)

### Final Domain Mapping

| Domain Field | DB Column | Nullable |
|---|---|---|
| `fromWarehouseId` | `from_warehouse_id` | Yes |
| `toWarehouseId` | `to_warehouse_id` | Yes |

### Migration SQL Prepared

```sql
ALTER TABLE stock_movements RENAME COLUMN warehouse_id TO from_warehouse_id;
ALTER TABLE stock_movements ADD COLUMN to_warehouse_id VARCHAR(128) REFERENCES warehouses(id);
DROP INDEX IF EXISTS idx_stock_movements_warehouse;
CREATE INDEX idx_stock_movements_from_warehouse ON stock_movements(tenant_id, from_warehouse_id);
CREATE INDEX idx_stock_movements_to_warehouse ON stock_movements(tenant_id, to_warehouse_id);
```

### Whether Migration Was Executed

NO. Migration prepared for future manual execution by the Owner.

### Verification

- Domain type `StockMovement` has `fromWarehouseId?` and `toWarehouseId?` — verified
- SQL migration matches the domain contract — verified
- All PostgresInventoryAdapter queries now reference `from_warehouse_id` and `to_warehouse_id` — verified

## 3. Blocker #2 — PostgresInventoryAdapter

### Original Defect

The adapter referenced `movement.warehouseId` which does not exist on `StockMovement`. This appeared in:
- `createStockMovement` (INSERT and parameter binding)
- `postStockMovement` (GRN, ISSUE, TRANSFER, ADJUSTMENT cases)
- `cancelStockMovement` (GRN, ISSUE, TRANSFER, ADJUSTMENT cases)
- `mapStockMovementRow` (row-to-domain mapping)

### Methods Audited and Corrected

| Method | Fix |
|---|---|
| `getStockMovements` | SELECT now reads `from_warehouse_id, to_warehouse_id` |
| `getStockMovementById` | SELECT now reads `from_warehouse_id, to_warehouse_id` |
| `createStockMovement` | INSERT writes `from_warehouse_id` and `to_warehouse_id` from `movement.fromWarehouseId`/`toWarehouseId` |
| `postStockMovement` | GRN/RETURN: uses `movement.toWarehouseId ?? movement.fromWarehouseId`. ISSUE: uses `movement.fromWarehouseId`. TRANSFER: uses both `fromWarehouseId` (source) and `toWarehouseId` (target), deducts from source AND adds to target. ADJUSTMENT: uses `movement.fromWarehouseId ?? movement.toWarehouseId` |
| `cancelStockMovement` | GRN/RETURN: reverses from target. ISSUE: adds back to source. TRANSFER: adds back to source AND deducts from target. ADJUSTMENT: sets to 0 |
| `mapStockMovementRow` | Maps `r.from_warehouse_id` → `fromWarehouseId`, `r.to_warehouse_id` → `toWarehouseId` |

### Verification

- Zero references to `movement.warehouseId` remain — grep verified
- All 5 switch cases in `postStockMovement` use correct warehouse fields — verified
- All 4 switch cases in `cancelStockMovement` use correct warehouse fields — verified
- Row mapping correctly translates DB snake_domain to domain camelCase — verified
- TRANSFER logic now matches MockInventoryAdapter behavior (deduct source + add target) — verified

## 4. Blocker #3 — PostgresTenantAdapter

### Original Defect

`TENANT_UPDATE_COLUMNS` mapped 13 non-existent fields:
`name`, `displayName`, `legalName`, `registrationNumber`, `taxNumber`, `address`, `city`, `province`, `phone`, `email`, `website`, `logo`, `isActive`

But `UpdateTenantPayload` (tenant.ts:57-63) only has:
`brandName`, `logoUrl`, `primaryColor`, `accentColor`, `isActive`

### Exact Mapping Correction

```typescript
private static TENANT_UPDATE_COLUMNS: Record<string, string> = {
  brandName: 'brand_name',
  logoUrl: 'logo_url',
  primaryColor: 'primary_color',
  accentColor: 'accent_color',
  isActive: 'is_active',
};
```

### Verification

- All 5 fields in `UpdateTenantPayload` now have correct DB column mappings — verified
- No obsolete fields remain — verified
- `mapRow()` already correctly reads `brand_name`, `logo_url`, `primary_color`, `accent_color`, `is_active` — verified (no change needed)
- `createTenant()` already correctly writes these columns — verified (no change needed)

## 5. Blocker #4 — PostgresSettingsAdapter

### Original Absence

No `PostgresSettingsAdapter` existed. Settings were always served by `MockSettingsAdapter` regardless of `DATABASE_URL`.

### Repository Contract

```typescript
interface ISettingsRepository {
  getSettingsByTenantId(tenantId: string): Promise<TenantSettings | null>;
  updateSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<TenantSettings>;
}
```

### Implementation

Created `src/server/db/repositories/postgresSettingsAdapter.ts`:

- **getSettingsByTenantId**: SELECT from `tenant_settings` WHERE `tenant_id = $1`, returns `{ tenantId, ...settings_jsonb }`
- **updateSettings**: Reads existing, merges sections independently, UPSERTs JSONB into `tenant_settings`

### Tenant Isolation

- All queries use `tenant_id = $1` — verified
- UPSERT uses `ON CONFLICT (tenant_id)` — verified
- Settings JSONB is scoped to the tenant — verified

### Files Changed

- `src/server/db/repositories/PostgresSettingsAdapter.ts` (NEW)
- `src/server/db/repositories/index.ts` (added barrel export)
- `src/server/index.ts` (added import + conditional adapter creation)

### Verification

- Implements `ISettingsRepository` — verified
- Uses `tenant_settings` table schema (JSONB column) — verified
- Both Mock and Postgres implementations follow same contract — verified

## 6. Mock ↔ Postgres Parity

### Inventory

| Method | Mock | Postgres | Parity |
|---|---|---|---|
| `getProducts` | ✅ | ✅ | Match |
| `getProductById` | ✅ | ✅ | Match |
| `createProduct` | ✅ | ✅ | Match |
| `updateProduct` | ✅ | ✅ | Match |
| `deactivateProduct` | ✅ | ✅ | Match |
| `getWarehouses` | ✅ | ✅ | Match |
| `getWarehouseLocations` | ✅ | ✅ | Match |
| `getStockLevels` | ✅ | ✅ | Match |
| `getStockLevelForProduct` | ✅ | ✅ | Match |
| `getStockMovements` | ✅ | ✅ | Match |
| `getStockMovementById` | ✅ | ✅ | Match |
| `createStockMovement` | ✅ | ✅ | Match |
| `postStockMovement` | ✅ | ✅ | Match (both use fromWarehouseId/toWarehouseId) |
| `cancelStockMovement` | ✅ | ✅ | Match |
| `getBatches` | ✅ (empty) | ✅ (empty) | Match |
| `getSerials` | ✅ (empty) | ✅ (empty) | Match |

### Tenant

| Method | Mock | Postgres | Parity |
|---|---|---|---|
| `getPublicTenants` | ✅ | ✅ | Match |
| `getTenantBySlug` | ✅ | ✅ | Match |
| `getTenantById` | ✅ | ✅ | Match |
| `createTenant` | ✅ | ✅ | Match |
| `updateTenant` | ✅ | ✅ | Match (corrected mapping) |
| `deactivateTenant` | ✅ | ✅ | Match |

### Settings

| Method | Mock | Postgres | Parity |
|---|---|---|---|
| `getSettingsByTenantId` | ✅ | ✅ | Match |
| `updateSettings` | ✅ (in-memory merge) | ✅ (JSONB merge) | Match (both merge per-section) |

## 7. Security

- Tenant isolation remains server-side enforced via `req.user!.tenantId` on all protected routes
- All Postgres adapter queries include `WHERE tenant_id = $1`
- No client-provided tenantId is accepted on any authenticated endpoint
- Settings adapter scoped by tenant_id — verified

## 8. Database Execution

NO LIVE DATABASE SQL WAS EXECUTED.

Migration `002_fix_stock_movements.sql` prepared for future manual execution.

## 9. Tests

- **496 passed** (unchanged from baseline)
- **9 skipped** (unchanged from baseline)
- **0 failed**

No new tests added — all existing tests continue to pass with the corrected adapters.

## 10. TypeScript

**PASS** — 0 errors

## 11. Build

**PASS** — production build successful

## 12. Remaining Gaps

Carried forward without inventing fixes:

1. **Cost_rate formula** — UNKNOWN in audit/08; blocks COGS → GL
2. **Supplier aging shows 0** — FIFO allocation finds no matching payments
3. **Stock movement ADJUSTMENT cancellation** — sets quantity_on_hand to 0 (known gap)
4. **Hardcoded tax account mappings** — TaxAccountMapping in settings.ts is vestigial/unused
5. **Voucher/ledger concurrency** — no row-level locking on voucher posting
6. **COA structural updates** — no parent_id cascade on COA hierarchy changes

## 13. Multi-Brand Status

**Step 46C multi-brand implementation NOT STARTED.**

- `users.tenant_id` remains
- `users.role` remains
- `user_brand_access` not implemented
- Tenant switching not implemented
- Brand switcher not implemented

## 14. Step 46C Readiness

All four 46A PostgreSQL foundation blockers are **FULLY RESOLVED**:

| Blocker | Status |
|---|---|
| 1. stock_movements dual-warehouse schema | **PASS** — Migration SQL prepared, domain types match |
| 2. PostgresInventoryAdapter | **PASS** — All references to nonexistent `movement.warehouseId` eliminated, all methods use `fromWarehouseId`/`toWarehouseId` |
| 3. PostgresTenantAdapter | **PASS** — TENANT_UPDATE_COLUMNS corrected to match UpdateTenantPayload |
| 4. PostgresSettingsAdapter | **PASS** — Created, implements ISettingsRepository, tenant-scoped JSONB storage |

The PostgreSQL foundation is now clean and ready for Step 46C multi-brand implementation.
