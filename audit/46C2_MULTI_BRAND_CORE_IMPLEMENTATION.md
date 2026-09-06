# Step 46C-2 — Multi-Brand Core Access Architecture

## A. Architecture

### Approved Architecture

```
users (global identity)
  ↓
user_brand_access (per-brand authorization)
  ↓
per-brand role (SystemRoleName)
```

Owner = global user with ADMIN access rows for all authorized brands.
Admin = user with access to one or more brands.
Normal user = typically one brand initially, architecture supports multi-brand.

### What Was Implemented

- `UserBrandAccess` domain type
- `IUserBrandAccessRepository` interface (8 methods)
- `MockUserBrandAccessAdapter` (in-memory, seeded with demo data)
- `PostgresUserBrandAccessAdapter` (parameterized SQL)
- Migration SQL `003_user_brand_access.sql` (prepared, NOT executed)
- 9 security/isolation tests

### What Was Deliberately Deferred

- `users.tenant_id` removal → 46C-6
- `users.role` removal → 46C-6
- Login/session changes → 46C-3
- Tenant/brand switching → 46C-4
- Brand switcher UI → 46C-5
- Owner global authorization → 46C-3/46C-4
- RLS policies → later step
- Authentication migration → 46C-3

## B. Domain

### UserBrandAccess Model

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (UUID) |
| `userId` | `string` | FK → users.id |
| `tenantId` | `string` | FK → tenants.id |
| `role` | `SystemRoleName` | Per-brand role (ADMIN, MANAGER, ACCOUNTANT, SALES, PURCHASE, VIEWER) |
| `isActive` | `boolean` | Whether access is currently active |
| `createdAt` | `Date` | Creation timestamp |
| `updatedAt` | `Date` | Last update timestamp |

### Role Representation

Uses existing `SystemRoleName` from `rbac.ts`:

```typescript
type SystemRoleName = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'PURCHASE' | 'VIEWER';
```

No new role enum created. OWNER is not a value in `user_brand_access.role` — Owner access is expressed via ADMIN rows.

### DTOs

- `CreateUserBrandAccessPayload` — userId, tenantId, role, isActive?
- `UpdateUserBrandAccessPayload` — role?, isActive?

## C. Repository

### Methods

| Method | Description | Security |
|---|---|---|
| `getByUserId(userId)` | All access records for a user | User-scoped |
| `getByUserAndTenant(userId, tenantId)` | Specific user+tenant pair | User-scoped |
| `getActiveByUserId(userId)` | Active-only access records | User-scoped |
| `create(payload)` | Create new access record | Rejects duplicates |
| `update(id, payload)` | Update role/isActive | Record-scoped |
| `deactivate(id)` | Soft-disable access | Record-scoped |
| `activate(id)` | Re-enable access | Record-scoped |
| `isActive(userId, tenantId)` | Check active access exists | User-scoped |

### Security Behavior

- All queries are parameterized
- Duplicate (userId, tenantId) rejected at DB level via UNIQUE constraint
- Deactivation is soft-disable (is_active = false), not deletion
- No client-provided tenantId is accepted — all lookups are by userId

## D. Mock Adapter

### Implementation

- In-memory `Map`-based store
- Seeded with 6 access records matching existing demo users:
  - user-admin-001 → wholesale-001 (ADMIN)
  - user-admin-002 → distribution-002 (ADMIN)
  - user-admin-003 → apex-trading-003 (ADMIN)
  - user-manager-001 → wholesale-001 (MANAGER)
  - user-clerk-001 → wholesale-001 (SALES)
  - user-inactive-001 → wholesale-001 (VIEWER, inactive)

### Test Coverage

9 tests in `UserBrandAccess.test.ts`:
1. User access lookup ✓
2. Multiple brand access with independent roles ✓
3. Unauthorized brand returns null ✓
4. Duplicate access rejection ✓
5. Deactivation excludes from active lookup ✓
6. Reactivation restores access ✓
7. Tenant isolation (user A ≠ user B) ✓
8. Role preservation across updates ✓
9. Seed data verification ✓

## E. PostgreSQL Adapter

### Implementation

- Uses `query()` from `pool.js` (existing connection pool)
- All SQL parameterized ($1, $2, etc.)
- Follows existing adapter patterns (uuid(), mapRow(), error handling)

### Tenant/Security Behavior

- All queries scoped by userId or id (record-level)
- No cross-user data leakage possible
- UNIQUE(user_id, tenant_id) enforced at DB level
- Parameterized queries prevent SQL injection

## F. Migration

### File

`src/server/db/migrations/003_user_brand_access.sql`

### Schema

```sql
CREATE TABLE user_brand_access (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'PURCHASE', 'VIEWER')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);
```

### Indexes

- `idx_uba_user` ON user_brand_access(user_id)
- `idx_uba_tenant` ON user_brand_access(tenant_id)
- `idx_uba_user_tenant` ON user_brand_access(user_id, tenant_id)
- `idx_uba_active` ON user_brand_access(user_id, is_active)

### Foreign Keys

- user_id → users(id) ON DELETE CASCADE
- tenant_id → tenants(id) ON DELETE CASCADE

### Uniqueness

UNIQUE(user_id, tenant_id) — prevents duplicate access rows.

### Data Migration Preparation

Includes INSERT...SELECT to populate from existing users.tenant_id + users.role:

```sql
INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active, created_at, updated_at)
SELECT 'uba-' || id, id, tenant_id, role, is_active, created_at, updated_at
FROM users WHERE tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;
```

### Execution Status

**NOT EXECUTED** — Prepared for future manual execution by the Owner.

## G. Regression

### Authentication

Existing authentication flow unchanged:
- Login still uses `users.tenant_id` and `users.role`
- Session creation unchanged
- Middleware tenant resolution unchanged

### Sessions

No session behavior changes.

### Tenant Resolution

All protected routes still resolve tenantId from `req.user!.tenantId` (from users table via session).

### Permissions

`hasPermission(role, permission)` unchanged. SYSTEM_ROLES constant unchanged. No new permission mappings.

### Existing Protected Routes

All 50+ protected routes in `protected.ts` unchanged. No API behavior changes.

## H. Tests

- **505 passed** (496 baseline + 9 new)
- **9 skipped** (unchanged)
- **0 failed**

## I. TypeScript

**PASS** — 0 errors

## J. Production Build

**PASS**

## K. Files Modified

| File | Reason | Change | 46C-2 Requirement |
|---|---|---|---|
| `src/domain/types/user-brand-access.ts` | NEW — Domain type | UserBrandAccess, CreateUserBrandAccessPayload, UpdateUserBrandAccessPayload | Required |
| `src/domain/types/index.ts` | Add export | Added `export * from './user-brand-access'` | Required |
| `src/domain/repositories/IUserBrandAccessRepository.ts` | NEW — Repository interface | 8 methods | Required |
| `src/domain/repositories/index.ts` | Add export | Added export for IUserBrandAccessRepository | Required |
| `src/domain/adapters/mock/MockUserBrandAccessAdapter.ts` | NEW — Mock adapter | In-memory implementation with seed data | Required |
| `src/domain/adapters/mock/index.ts` | Add export | Added MockUserBrandAccessAdapter | Required |
| `src/server/db/repositories/PostgresUserBrandAccessAdapter.ts` | NEW — PostgreSQL adapter | Parameterized SQL implementation | Required |
| `src/server/db/repositories/index.ts` | Add export | Added PostgresUserBrandAccessAdapter | Required |
| `src/server/db/migrations/003_user_brand_access.sql` | NEW — Migration SQL | Table creation + seed data | Required |
| `src/server/db/migrate.ts` | Register migration | Added version 003 | Required |
| `src/domain/services/UserBrandAccess.test.ts` | NEW — Security tests | 9 tests | Required |

## L. Remaining Gaps

1. `user_brand_access` table not yet created in database (migration NOT executed)
2. Owner global authorization not yet implemented
3. Tenant/brand switching not yet implemented
4. Authentication not yet migrated to use user_brand_access
5. RLS policies not yet defined for user_brand_access

---

# STEP 46C-2 STATUS

- UserBrandAccess Domain Model: **PASS**
- Repository Interface: **PASS**
- Mock Adapter: **PASS**
- PostgreSQL Adapter: **PASS**
- Migration Prepared: **PASS**
- Migration Executed: **NO**
- Legacy users.tenant_id Preserved: **PASS**
- Legacy users.role Preserved: **PASS**
- Existing Authentication Preserved: **PASS**
- Existing Tenant Isolation Preserved: **PASS**
- Existing Permissions Preserved: **PASS**
- Tests: **PASS** (505 passed, 9 skipped, 0 failed)
- TypeScript: **PASS**
- Production Build: **PASS**

# IMPLEMENTATION DECISION

**PASS — SAFE TO PROCEED TO STEP 46C-3**
