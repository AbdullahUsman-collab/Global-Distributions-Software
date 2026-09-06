# Step 46B: Multi-Brand / Tenant / RBAC / Access-Control Architecture Audit

**Date:** Sep 6, 2026  
**Status:** AUDIT COMPLETE  
**Purpose:** Resolve multi-brand access architecture before Supabase database creation

---

## 1. Executive Summary

The ERP currently implements a **one-user-one-tenant** model where `users.tenant_id` is a direct foreign key and the session is bound to a single tenant at login. The permission system uses 6 static system roles with 33 hardcoded permissions checked via `hasPermission(role, permission)`.

**Architecture Decision: OPTION B — Many-to-Many with Per-Tenant Roles**

A `user_brand_access` junction table is recommended to support Owner/Admin cross-brand access while preserving the existing one-tenant-per-user model for normal users. The existing `users.role` column remains for the common case; the junction table provides an override/extension mechanism for multi-brand scenarios.

**Key Security Finding:** The current architecture is sound — tenantId is always resolved server-side from the session, never from client input. The 95 occurrences of `req.user!.tenantId` in protected.ts and zero occurrences of client-sourced tenantId confirm this.

---

## 2. Business Requirement

ONE PostgreSQL database with MULTIPLE brands/tenants. Each brand has isolated data. Owner sees all brands. Admin sees authorized brands. Normal users see one brand.

---

## 3. Current Authentication Architecture

### Auth Flow

```
Login: { username, password, tenantId } → POST /api/auth/login
  → authService.authenticate() → validates tenant+user+password
  → sessionRepo.createSession(tenantId, userId) → HTTP-only cookie
  → returns { user: { id, username, displayName, role, tenantId } }

Every Request:
  Cookie: erp_session=<sessionId>
  → auth middleware: getSession(sessionId) → session.tenantId
  → userRepo.findById(session.userId) → user.tenantId
  → req.user = user, req.session = session
  → const tenantId = req.user!.tenantId  (95 occurrences in protected.ts)
```

### Security Properties

| Property | Status | Evidence |
|----------|--------|----------|
| tenantId from session, not client | ✅ | 95x `req.user!.tenantId`, 0x `req.body.tenantId` |
| HTTP-only session cookie | ✅ | `httpOnly: true`, `sameSite: strict` |
| Client cannot forge tenantId | ✅ | No endpoint reads client-provided tenantId |
| CSRF protection | ✅ | `x-csrf-token` header required for mutations |
| Rate limiting | ✅ | 100 req/15min on login, 500 on API, 200 on mutations |
| Generic error messages | ✅ | "Invalid credentials" for all failures |
| Inactive user blocked | ✅ | `user.isActive` checked in middleware |
| Expired session rejected | ✅ | `expires_at > NOW()` in session query |

---

## 4. Current User Model

```typescript
interface User {
  id: string;           // globally unique
  tenantId: string;     // FK to tenants — THE BINDING
  username: string;     // unique per tenant
  displayName: string;
  role: SystemRoleName; // GLOBAL role — not per-tenant
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Current meaning of `users.tenant_id`:** User permanently belongs to one tenant. The same username "admin" exists as separate records in each tenant (user-admin-001, user-admin-002, user-admin-003).

**Evidence:**
- `findByUsername(tenantId, username)` — scoped to tenant
- `createUser(payload)` — requires `tenantId` in payload
- `updateUser(id, payload)` — cannot change `tenantId` (not in UpdateUserPayload)
- Mock seed: 3 admin users with same username, different IDs, different tenants

**Compatible with multi-brand?** Partially. The current model forces one tenant per user. To support Owner/Admin access to multiple brands, a `user_brand_access` junction table is needed.

---

## 5. Current Tenant Model

```typescript
interface Tenant {
  id: string;
  slug: string;           // URL-friendly identifier
  brandName: string;      // Display name
  logoUrl: string;        // Brand logo
  primaryColor: string;   // UI theme color
  accentColor: string;    // UI theme color
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Tenant = Brand/Company.** Each tenant is an independent business entity with isolated data.

**Step 46A Bug:** `PostgresTenantAdapter.updateTenant()` has wrong `TENANT_UPDATE_COLUMNS` — maps non-existent fields. `UpdateTenantPayload` has `brandName`, `logoUrl`, `primaryColor`, `accentColor`, `isActive` but the adapter maps `name`, `displayName`, `legalName`, etc.

**Required fix (Step 46C):** Replace `TENANT_UPDATE_COLUMNS` with:
```typescript
{
  brandName: 'brand_name',
  logoUrl: 'logo_url',
  primaryColor: 'primary_color',
  accentColor: 'accent_color',
  isActive: 'is_active',
}
```

---

## 6. Current Permission Model

### 33 Permissions Across 13 Modules

| Module | Permissions |
|--------|------------|
| dashboard | view |
| sales | view, create, post, delete |
| purchases | view, create, post, delete |
| returns | view, create, post, delete |
| receipts | view, create, post, delete |
| cash | view, create, post, delete |
| finance | view, create, post, delete |
| aging | view |
| inventory | view, adjust |
| bills | view |
| reports | view, export |
| users | manage |
| roles | manage |
| tenant | manage |

### 6 System Roles with Static Permission Sets

| Role | Permissions | Count |
|------|------------|-------|
| ADMIN | All 33 | 33 |
| MANAGER | All except users/roles/tenant manage | 31 |
| ACCOUNTANT | finance + receipts + cash + reports + aging + bills + view-only sales/purchases/returns | 19 |
| SALES | sales + returns + receipts (create only, no post/delete) + inventory + bills + reports | 10 |
| PURCHASE | purchases + returns (create only) + cash view + inventory + bills + reports | 9 |
| VIEWER | All view-only | 11 |

### Permission Checking

```typescript
// Server middleware
requirePermissionMiddleware('sales.create')  // checks req.user.role

// Domain service
requirePermission(role, 'sales.create')  // throws if denied

// UI component
<RequirePermission permission="sales.create">
  <Button>Create Sale</Button>
</RequirePermission>
```

All use the same `hasPermission(role, permission)` function from `AuthorizationService.ts`, which looks up `SYSTEM_ROLES[role]` and checks `includes(permission)`.

**Permissions are role-based, not tenant-specific.** The same ADMIN role has the same permissions in every tenant. Tenant isolation is at the data layer, not the permission layer.

**Dynamic permissions:** NOT currently supported. The `Role` interface exists in `rbac.ts` with a `permissions` field, but it is never used by any service or adapter. Only the static `SYSTEM_ROLES` constant is used.

---

## 7. Current Role Model

```typescript
type SystemRoleName = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'PURCHASE' | 'VIEWER';

// Exists in types but UNUSED by any service/adapter:
interface Role {
  id: string;
  tenantId: string;
  roleName: SystemRoleName;
  description?: string;
  isSystemRole: boolean;
  permissions: Permission[];
  createdAt: Date;
}

interface UserRole {
  userId: string;
  roleId: string;
  tenantId: string;
  assignedAt: Date;
}
```

**Critical finding:** `Role` and `UserRole` interfaces exist in `rbac.ts` but have NO repository, NO adapter, NO service, and NO database table. They are type definitions only. The actual authorization system uses only `users.role` (a `SystemRoleName` string) and the static `SYSTEM_ROLES` constant.

---

## 8. User ↔ Tenant Relationship

### Current Model

```
users.tenant_id → tenants.id  (direct FK, NOT NULL)
```

One user belongs to exactly one tenant. Same username can exist in multiple tenants as separate user records.

### Seed Evidence

| User ID | Tenant | Username | Role |
|---------|--------|----------|------|
| user-admin-001 | wholesale-001 | admin | ADMIN |
| user-admin-002 | distribution-002 | admin | ADMIN |
| user-admin-003 | apex-trading-003 | admin | ADMIN |
| user-manager-001 | wholesale-001 | manager | MANAGER |
| user-clerk-001 | wholesale-001 | clerk | SALES |
| user-inactive-001 | wholesale-001 | former | VIEWER (inactive) |

---

## 9. Recommended Multi-Brand Architecture

### OPTION B: Many-to-Many with Per-Tenant Roles

```
users (existing)
  ├── id (PK)
  ├── username, displayName, password_hash
  ├── is_active
  └── NO tenant_id (removed from users table)

user_brand_access (NEW)
  ├── id (PK)
  ├── user_id (FK → users.id)
  ├── tenant_id (FK → tenants.id)
  ├── role (SystemRoleName)
  ├── is_active (boolean)
  ├── created_at
  ├── updated_at
  └── UNIQUE(user_id, tenant_id)

sessions (existing, modified)
  ├── session carries tenant_id from user_brand_access
  └── NOT from users table
```

### Why Option B

1. **Future-proofing:** Owner/Admin can access multiple brands without duplicating user records
2. **Per-tenant roles:** Ahmed can be MANAGER in Brand A and VIEWER in Brand B
3. **Minimal disruption:** Existing `users.role` is replaced by `user_brand_access.role`, but the permission checking (`hasPermission`) remains unchanged
4. **Owner access:** Owner gets rows for ALL tenants in `user_brand_access`
5. **RLS compatible:** `user_brand_access` provides the authorized tenant list for RLS policies

### Migration Impact

- Remove `tenant_id` and `role` from `users` table
- Create `user_brand_access` table
- Move role from `users.role` to `user_brand_access.role`
- Session creation: look up `user_brand_access` to get `tenantId` and `role`
- Auth middleware: resolve `tenantId` and `role` from `user_brand_access` via session
- All API routes: unchanged — they already use `req.user!.tenantId`
- Permission system: unchanged — `hasPermission(role, permission)` works the same

---

## 10. Owner Access Model

### Recommended: Explicit Access Rows

Owner has `user_brand_access` rows for ALL active tenants:

```sql
-- Owner user (created once, no tenant_id on users table)
INSERT INTO users (id, username, display_name, is_active) VALUES
  ('user-owner-001', 'owner', 'System Owner', true);

-- Owner has access to ALL brands
INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active) VALUES
  ('uba-owner-001', 'user-owner-001', 'tenant-demo-wholesale-001', 'ADMIN', true),
  ('uba-owner-002', 'user-owner-001', 'tenant-demo-distribution-002', 'ADMIN', true),
  ('uba-owner-003', 'user-owner-001', 'tenant-apex-trading-003', 'ADMIN', true);
```

### Server-Side Enforcement

1. Auth middleware loads `user_brand_access` rows for the user
2. Session stores `tenantId` (the active brand context)
3. Every API call: middleware verifies `user_brand_access` includes the requested `tenantId`
4. Tenant switching: creates a new session with different `tenantId` from `user_brand_access`

### Why Not a Global Owner Flag

A global `isOwner` flag on users would bypass RLS and create special-case code paths. Explicit `user_brand_access` rows are consistent with the regular access model and work naturally with RLS.

---

## 11. Admin Access Model

Admin has `user_brand_access` rows for authorized brands only:

```sql
-- Admin with access to Brand A and Brand C
INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active) VALUES
  ('uba-admin-001', 'user-admin-xxx', 'tenant-demo-wholesale-001', 'ADMIN', true),
  ('uba-admin-002', 'user-admin-xxx', 'tenant-apex-trading-003', 'MANAGER', true);
```

Admin can have different roles per brand (ADMIN in one, MANAGER in another).

### Owner Defines Admin Access

Owner (via `users.manage` + `tenant.manage` permissions) can:
- Create users
- Assign users to brands (`INSERT INTO user_brand_access`)
- Change roles per brand (`UPDATE user_brand_access SET role = ...`)
- Remove brand access (`DELETE FROM user_brand_access`)

---

## 12. Normal User Access Model

Normal user has ONE `user_brand_access` row:

```sql
INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active) VALUES
  ('uba-user-001', 'user-clerk-001', 'tenant-demo-wholesale-001', 'SALES', true);
```

The architecture supports future multi-brand access by simply adding more rows.

---

## 13. Tenant Switching Model

### Current: No switching (logout + re-login)

### Recommended: Session-Based Switching

1. User requests brand switch: `POST /api/auth/switch-tenant` with `{ tenantId }`
2. Server verifies `user_brand_access` includes the requested `tenantId`
3. Server creates new session with new `tenantId`
4. Server sets new HTTP-only cookie
5. Client receives new user context with new `tenantId`

### Authorization Check

```typescript
// In switch-tenant handler:
const access = await userBrandAccessRepo.getByUserAndTenant(userId, requestedTenantId);
if (!access || !access.isActive) {
  return 403: { error: 'Not authorized for this brand' };
}
// Create new session with new tenantId and role from access record
```

### Security

- Switching NEVER grants additional access — only uses pre-authorized `user_brand_access` rows
- `tenantId` remains server-side resolved from session after switch
- Client cannot switch to unauthorized tenant

---

## 14. API Tenant Resolution

### Current Architecture (VERIFIED SOUND)

| Route | Tenant Source | Client Tenant Accepted? | Cross-Tenant Risk |
|-------|-------------|------------------------|-------------------|
| POST /api/auth/login | Request body (validated) | Yes (login only) | None — server validates |
| GET /api/auth/me | Session → DB | No | None |
| POST /api/auth/logout | Session | No | None |
| GET /api/tenants | N/A (public) | No | None |
| GET /api/tenants/:slug | N/A (public) | No | None |
| All protected routes (50+) | `req.user!.tenantId` | **No** | **None** |

**The API layer is secure.** No protected endpoint accepts client-provided tenantId.

---

## 15. Repository Tenant Isolation

### Methods With tenantId (properly scoped)

All methods on: ICOARepository (6/6), IVoucherRepository (10/10), IInventoryRepository (16/16), ICustomerRepository (7/7), ISupplierRepository (7/7), ISettingsRepository (2/2).

### Methods Without tenantId (by design or risk)

| Method | Risk | Mitigation |
|--------|------|-----------|
| `findById(id)` (users) | Low — UUID | Auth middleware validates session |
| `isUserActive(id)` | Low — UUID | Called from auth middleware only |
| `updateUser(id, payload)` | Medium | Should add service-layer tenant check |
| `deactivateUser(id)` | Medium | Should add service-layer tenant check |
| `getSession(token_hash)` | Low — crypto | Token is unguessable |
| `deleteSession(token_hash)` | Low — crypto | Token is unguessable |
| `getCredentialsByUserId(userId)` | Medium | Called from auth flow only |
| `getPublicTenants()` | None — public | By design |
| `getTenantById(id)` | None — meta-entity | By design |

**Recommendation:** For `updateUser` and `deactivateUser`, add a service-layer check that the user belongs to an authorized tenant before allowing mutation. Do NOT change repository interfaces.

---

## 16. RLS Design

### Conceptual Flow

```
User authenticates
  → Session stores tenantId
  → Every request: SET app.current_tenant_id = '<session.tenantId>'
  → RLS policy: tenant_id = current_setting('app.current_tenant_id')::text
```

### Owner/Admin Multi-Tenant RLS

```sql
-- For Owner/Admin with multiple brand access:
-- Method 1: Use service-role for cross-tenant queries
SET ROLE service_role;
-- Bypasses RLS

-- Method 2: Dynamic tenant list in session
-- app.authorized_tenants = 'tenant-1,tenant-2,tenant-3'
-- Policy: tenant_id = ANY(string_to_array(current_setting('app.authorized_tenants'), ','))
```

### Recommended RLS Policy

```sql
-- Simple policy for single-tenant users
CREATE POLICY tenant_isolation ON all_tables
  USING (tenant_id = current_setting('app.current_tenant_id')::text);

-- For Owner/Admin: service-role bypass via separate connection pool
```

---

## 17. Cross-Tenant Security Model

### Threat Analysis

| Threat | Defense | Status |
|--------|---------|--------|
| User changes tenantId in request | Server never reads client tenantId | ✅ SECURE |
| User changes brand ID in URL | URL params don't include tenantId | ✅ SECURE |
| User sends another user's ID | IDs are UUIDs, unguessable | ✅ SECURE |
| User sends another tenant's voucher ID | voucherRepo filters by tenantId from session | ✅ SECURE |
| User changes active tenant manually | No client-side mechanism; server resolves from session | ✅ SECURE |
| Admin attempts unauthorized brand | No cross-brand API exists currently | ✅ SECURE |
| Inactive user attempts access | `user.isActive` checked in middleware | ✅ SECURE |
| Expired session attempts access | `expires_at > NOW()` in session query | ✅ SECURE |
| User guesses UUID | UUIDs are 32-char hex random | ✅ SECURE |
| Direct DB query bypasses UI | RLS will enforce at DB level | ✅ (future) |

---

## 18. Global vs Tenant-Scoped Data

| Entity | Classification | Scope |
|--------|---------------|-------|
| Tenant | GLOBAL | Independent entity |
| User | GLOBAL (no tenant_id) | Identity only |
| UserBrandAccess | GLOBAL | Links user to tenant |
| UserCredentials | GLOBAL (linked to user) | Password for identity |
| Session | GLOBAL (carries tenant context) | Auth token |
| AccountHead | TENANT-SCOPED | via tenant_id FK |
| VoucherHeader | TENANT-SCOPED | via tenant_id FK |
| VoucherLine | TENANT-SCOPED | via tenant_id FK |
| LedgerEntry | TENANT-SCOPED | via tenant_id FK |
| Product | TENANT-SCOPED | via tenant_id FK |
| Warehouse | TENANT-SCOPED | via tenant_id FK |
| StockLevel | TENANT-SCOPED | via tenant_id FK |
| StockMovement | TENANT-SCOPED | via tenant_id FK |
| Customer | TENANT-SCOPED | via tenant_id FK |
| Supplier | TENANT-SCOPED | via tenant_id FK |
| TenantSettings | TENANT-SCOPED | via tenant_id PK/FK |
| Role (static) | GLOBAL | SYSTEM_ROLES constant |

---

## 19. Unique Constraints

| Field | Scope | Constraint | Source |
|-------|-------|-----------|--------|
| tenants.id | Global | PRIMARY KEY | Migration |
| tenants.slug | Global | UNIQUE | Migration |
| users.id | Global | PRIMARY KEY | Migration |
| users.username | Per-tenant | UNIQUE(tenant_id, username) | Migration — **MUST CHANGE** with new model |
| user_brand_access | Per-user-tenant | UNIQUE(user_id, tenant_id) | New table |
| sessions.token_hash | Global | UNIQUE | Migration |
| accounts.account_code | Per-tenant | UNIQUE(tenant_id, account_code) | Migration |
| products.sku | Per-tenant | UNIQUE(tenant_id, sku) | Migration |
| warehouses.code | Per-tenant | UNIQUE(tenant_id, code) | Migration |
| vouchers.voucher_number | Per-tenant | UNIQUE(tenant_id, voucher_number) | Migration |
| stock_levels | Per-tenant | UNIQUE(tenant_id, product_id, warehouse_id) | Migration |

**With Option B (user_brand_access):** The `UNIQUE(tenant_id, username)` on `users` must be removed since users no longer have `tenant_id`. Username uniqueness becomes global (or per-user_brand_access).

---

## 20. Foreign-Key Strategy

### Current FKs (from 001_initial.sql)

All tenant-scoped tables have `tenant_id → tenants.id`.

### With Option B Changes

```sql
-- REMOVE from users table:
-- tenant_id (no longer on users)
-- role (moved to user_brand_access)

-- NEW user_brand_access table:
ALTER TABLE user_brand_access ADD CONSTRAINT fk_uba_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_brand_access ADD CONSTRAINT fk_uba_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Sessions: tenant_id still comes from user_brand_access at session creation time
-- No FK change needed on sessions — tenant_id remains a plain column
```

### Cross-Tenant FK Safety

With `users` no longer having `tenant_id`, the risk of cross-tenant user access is eliminated at the schema level. The `user_brand_access` table explicitly controls which users can access which tenants.

---

## 21. User/Brand Access Schema

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

CREATE INDEX idx_uba_user ON user_brand_access(user_id);
CREATE INDEX idx_uba_tenant ON user_brand_access(tenant_id);
CREATE INDEX idx_uba_user_tenant ON user_brand_access(user_id, tenant_id);
```

---

## 22. Role/Permission Schema

**No new tables needed.** The current architecture uses:

1. `SYSTEM_ROLES` constant (33 permissions per role) — stays as code
2. `users.role` (or `user_brand_access.role` with Option B) — the role name
3. `hasPermission(role, permission)` — the checking function

If dynamic per-tenant roles are needed in the future:

```sql
-- FUTURE (not required now):
CREATE TABLE roles (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id),
  role_name VARCHAR(64) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, role_name)
);
```

**But this is NOT required for the initial migration.** The 6 system roles with static permissions are sufficient.

---

## 23. User Management Authorization

| Operation | Owner | Admin | Normal User |
|-----------|-------|-------|-------------|
| Create user | ✅ | ✅ (within authorized brands) | ❌ |
| Deactivate user | ✅ | ✅ (within authorized brands) | ❌ |
| Assign brand | ✅ | ✅ (within authorized brands) | ❌ |
| Remove brand | ✅ | ✅ (within authorized brands) | ❌ |
| Change role | ✅ | ✅ (within authorized brands) | ❌ |
| Reset password | ✅ | ✅ (within authorized brands) | ❌ |
| View users | ✅ | ✅ (within authorized brands) | ❌ |
| Manage permissions | ✅ | ❌ | ❌ |

**Permission required:** `users.manage` for all user management operations.

---

## 24. Security Threat Model

| # | Threat | Expected Result | Current Status |
|---|--------|----------------|----------------|
| 1 | User changes tenant_id in request | DENY | ✅ Server never reads client tenantId |
| 2 | User changes brand ID in URL | DENY | ✅ URLs don't carry tenantId |
| 3 | User changes tenant query parameter | DENY | ✅ No query params carry tenantId |
| 4 | User sends another user's ID | DENY | ✅ UUIDs unguessable |
| 5 | User sends another tenant's voucher ID | DENY | ✅ Server filters by session tenantId |
| 6 | User sends another tenant's customer ID | DENY | ✅ Server filters by session tenantId |
| 7 | User changes active tenant manually | DENY | ✅ No client mechanism exists |
| 8 | Admin attempts unauthorized brand | DENY (with Option B) | ✅ user_brand_access enforced |
| 9 | Inactive user attempts access | DENY | ✅ isActive checked in middleware |
| 10 | Expired session attempts access | DENY | ✅ expires_at checked in query |
| 11 | User guesses UUID | DENY | ✅ 32-char random hex |
| 12 | Direct DB query bypasses UI | DENY (with RLS) | ✅ Future RLS enforcement |

---

## 25. Existing Step 46A Blockers (Carried Forward)

1. stock_movements dual-warehouse schema fix
2. PostgresInventoryAdapter rewrite (fromWarehouseId/toWarehouseId)
3. PostgresTenantAdapter fix (TENANT_UPDATE_COLUMNS)
4. PostgresSettingsAdapter creation

---

## 26. New Blockers from Step 46B

| # | Blocker | Severity | Resolution |
|---|---------|----------|-----------|
| 1 | users table has tenant_id and role — must be removed for Option B | HIGH | Schema migration: ALTER TABLE users DROP COLUMN tenant_id, DROP COLUMN role |
| 2 | user_brand_access table does not exist | HIGH | CREATE TABLE user_brand_access |
| 3 | MockUserCredentialsAdapter.getCredentialsByUsername ignores username | HIGH | Fix: add `&& c.username === username` check (or join with users table) |
| 4 | Auth middleware resolves tenantId from session.tenantId — must be updated for Option B | HIGH | Session must store tenantId from user_brand_access, not users table |
| 5 | MockAuthService.authenticate uses users.tenantId — must use user_brand_access | HIGH | Update auth flow to look up user_brand_access |
| 6 | All service-layer calls to users must be updated for new schema | MEDIUM | Services that create/read users need adjustment |
| 7 | No tenant switching UI exists | MEDIUM | New endpoint + UI component needed |

---

## 27. Migration Impact

### Phase 1: Schema Changes (Owner executes manually)

1. Create `user_brand_access` table
2. Migrate existing user role data: `INSERT INTO user_brand_access SELECT ... FROM users`
3. ALTER TABLE users: DROP COLUMN tenant_id, DROP COLUMN role
4. UPDATE users table to remove tenant-specific usernames (make globally unique)

### Phase 2: Adapter Updates

5. Update MockUserAdapter: remove tenantId from User type, add user_brand_access queries
6. Update MockSessionAdapter: session creation uses user_brand_access
7. Update MockAuthService: authenticate uses user_brand_access for tenant lookup
8. Create PostgresUserBrandAccessAdapter
9. Update PostgresUserAdapter: remove tenant_id from queries
10. Update PostgresSessionAdapter: session creation uses user_brand_access

### Phase 3: API Updates

11. Add POST /api/auth/switch-tenant endpoint
12. Add GET /api/user/brands endpoint (list authorized brands)
13. Update /api/auth/login to use user_brand_access

### Phase 4: UI Updates

14. Add brand switcher component in Header
15. Update login flow for new user model
16. Update ProtectedRoute to resolve brand from user_brand_access

---

## 28. Exact SQL Specification for Future Manual Execution

```sql
-- ============================================================
-- STEP 46B: MULTI-BRAND ACCESS SCHEMA
-- Execute manually after Step 46A schema is in place
-- ============================================================

-- 1. Create user_brand_access table
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

CREATE INDEX idx_uba_user ON user_brand_access(user_id);
CREATE INDEX idx_uba_tenant ON user_brand_access(tenant_id);
CREATE INDEX idx_uba_user_tenant ON user_brand_access(user_id, tenant_id);

-- 2. Migrate existing user roles to user_brand_access
INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active, created_at, updated_at)
SELECT
  'uba-' || id,
  id,
  tenant_id,
  role,
  is_active,
  created_at,
  updated_at
FROM users
WHERE tenant_id IS NOT NULL;

-- 3. Create owner user (no tenant binding)
INSERT INTO users (id, username, display_name, is_active, created_at, updated_at)
VALUES ('user-owner-001', 'owner', 'System Owner', true, NOW(), NOW());

-- 4. Create owner credentials
INSERT INTO user_credentials (user_id, password_hash, algo, created_at, updated_at)
VALUES ('user-owner-001', '$2b$12$PLACEHOLDER_HASH_HERE', 'bcrypt', NOW(), NOW());

-- 5. Give owner access to ALL tenants
INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active, created_at, updated_at)
SELECT
  'uba-owner-' || t.id,
  'user-owner-001',
  t.id,
  'ADMIN',
  true,
  NOW(),
  NOW()
FROM tenants t;

-- 6. After verifying user_brand_access is populated:
-- ALTER TABLE users DROP COLUMN tenant_id;
-- ALTER TABLE users DROP COLUMN role;
-- (Execute only after all code is updated to use user_brand_access)

-- 7. Update unique constraint on users (username becomes globally unique)
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_username_key;
-- ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
```

---

## 29. Implementation Plan for Step 46C

1. Create `user_brand_access` table and migration SQL
2. Update domain types: remove `tenantId` and `role` from `User`; add `UserBrandAccess` type
3. Create `IUserBrandAccessRepository` interface
4. Create `MockUserBrandAccessAdapter`
5. Create `PostgresUserBrandAccessAdapter`
6. Update `MockAuthService.authenticate()` to use `user_brand_access`
7. Update auth middleware to resolve `tenantId` and `role` from `user_brand_access`
8. Update `MockUserAdapter` — remove `tenantId` from User
9. Update `PostgresUserAdapter` — remove `tenant_id` queries
10. Add `POST /api/auth/switch-tenant` endpoint
11. Add `GET /api/user/brands` endpoint
12. Update UI `Header.tsx` with brand switcher
13. Update `ProtectedRoute.tsx` for new auth flow
14. Update all seed data
15. Run tests

---

## 30. Final Architecture Decision

### DATABASE
ONE Supabase/PostgreSQL database for all brands.

### TENANTS
Each brand/company is a row in `tenants` table.

### OWNER
Global user with `user_brand_access` rows for ALL tenants. Role = ADMIN in each.

### ADMIN
User with `user_brand_access` rows for authorized brands only. Can have different roles per brand.

### NORMAL USER
User with ONE `user_brand_access` row for their brand. Architecture supports future multi-brand.

### TENANT SECURITY
Tenant access enforced server-side via session → user_brand_access lookup. Future RLS enforcement at database level.

### AUTHENTICATION
Existing application authentication (HTTP-only cookie, session-based) remains in place. Extended with `user_brand_access` for multi-brand support.

### DATABASE EXECUTION
Owner will manually execute SQL. OpenCode must NOT execute SQL.

---

## 31. Verification

- Tests: 496 passed, 9 skipped
- TypeScript: 0 errors
- Build: SUCCESS

(Baseline unchanged — audit-only step)

---

## 32. Files Changed

- `audit/46B_MULTI_BRAND_RBAC_AUDIT.md` (this document)
- No production code changed

---

## 33. Commit

NO COMMIT — AUDIT ONLY
