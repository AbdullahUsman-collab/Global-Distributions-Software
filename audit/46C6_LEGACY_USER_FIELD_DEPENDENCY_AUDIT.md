**Step 46C-6: Legacy User Tenant/Role Dependency Audit + Removal Preparation — COMPLETE**

---

## Executive Summary

This step audited all remaining application-level dependencies on `users.tenant_id` and `users.role`. Two authorization dependencies were found and fixed. The physical columns remain for legacy compatibility. No database changes were made.

---

## Baseline

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Tests | 588 passed, 9 skipped | 603 passed, 9 skipped | +15 |
| TypeScript | 0 errors | 0 errors | — |
| Build | PASS | PASS | — |
| Files modified | — | 4 | — |
| Files created | — | 2 | — |

---

## Current Multi-Brand Architecture

```
USER
 ↓
USER_BRAND_ACCESS (authoritative per-brand access + role)
 ↓
ACTIVE TENANT (session.tenantId)
 ↓
PER-BRAND ROLE (user_brand_access.role)
 ↓
SESSION (HTTP-only cookie)
 ↓
REQUEST AUTHORIZATION (middleware)
```

---

## users.tenant_id Dependency Inventory

| # | Location | Classification | Status |
|---|----------|---------------|--------|
| 1 | `User.tenantId` in `auth.ts:20` | LEGACY DATA COMPATIBILITY | PRESERVED — needed by PostgresUserAdapter |
| 2 | `IUserRepository.findByUsername(tenantId, username)` | REPOSITORY MAPPING | PRESERVED — tenant-scoped user lookup |
| 3 | `IUserRepository.getUsersByTenant(tenantId)` | REPOSITORY MAPPING | PRESERVED — user listing by tenant |
| 4 | `IUserRepository.createUser(payload.tenantId)` | REPOSITORY MAPPING | PRESERVED — user creation |
| 5 | `MockUserAdapter` seed users | TEST FIXTURE | PRESERVED — seed data |
| 6 | `PostgresUserAdapter.findByUsername` WHERE tenant_id | REPOSITORY MAPPING | PRESERVED — SQL query |
| 7 | `PostgresUserAdapter.createUser` INSERT tenant_id | REPOSITORY MAPPING | PRESERVED — SQL insert |
| 8 | `001_initial.sql` users.tenant_id column | MIGRATION/SEED LOGIC | PRESERVED — physical schema |
| 9 | `003_user_brand_access.sql` seed from users.tenant_id | MIGRATION/SEED LOGIC | PRESERVED — data migration |
| 10 | `req.user.tenantId` in protected routes | LEGACY DATA COMPATIBILITY | PRESERVED — value comes from session via middleware spread |

**Authorization dependency: NO** (after fixes in 46C-3)

The `users.tenant_id` column is used for:
- User-scoped repository queries (findByUsername, getUsersByTenant)
- Physical database schema compatibility
- Seed data migration

It is NOT used as authorization authority. The session's `tenantId` is the authoritative tenant context.

---

## users.role Dependency Inventory

| # | Location | Classification | Status |
|---|----------|---------------|--------|
| 1 | `User.role` in `auth.ts:26` | LEGACY DATA COMPATIBILITY | PRESERVED — needed by PostgresUserAdapter |
| 2 | `MockUserAdapter` seed users | TEST FIXTURE | PRESERVED — seed data |
| 3 | `PostgresUserAdapter` SELECT role | REPOSITORY MAPPING | PRESERVED — SQL query |
| 4 | `PostgresUserAdapter.createUser` INSERT role | REPOSITORY MAPPING | PRESERVED — SQL insert |
| 5 | `001_initial.sql` users.role column | MIGRATION/SEED LOGIC | PRESERVED — physical schema |
| 6 | `003_user_brand_access.sql` seed from users.role | MIGRATION/SEED LOGIC | PRESERVED — data migration |
| 7 | ~~`MockAuthService.getUserBySession()`~~ | ~~AUTHORIZATION DEPENDENCY~~ | **FIXED** — now derives role from user_brand_access |
| 8 | ~~`/api/auth/me` endpoint~~ | ~~AUTHORIZATION DEPENDENCY~~ | **FIXED** — now returns access-derived role via getUserBySession |
| 9 | ~~`clientSideLogin()` in session.ts~~ | ~~AUTHORIZATION DEPENDENCY~~ | **FIXED** — now derives role from DEMO_BRAND_ACCESS |

**Authorization dependency: NO** (after this step's fixes)

---

## Authentication Flow Audit

### LOGIN (FIXED)
```
username/password + tenantId
    ↓
MockAuthService.authenticate()
    ↓
1. Verify tenant exists and is active
2. Find user by username (tenant-scoped)
3. Verify user is active
4. Verify password
5. Verify ACTIVE user_brand_access for requested tenant ✅
6. Derive role from user_brand_access ✅
7. Create session with verified tenantId
8. Return user with access-derived role ✅
```

**Previous state:** Steps 5-6 were correct (from 46C-3).
**This step fixed:** `getUserBySession()` and `/api/auth/me` to also derive role from user_brand_access.

### SESSION VALIDATION (PASS)
```
HTTP request
    ↓
Session cookie → session lookup
    ↓
User lookup
    ↓
Verify user_brand_access for session.tenantId ✅
    ↓
Override req.user.role with access.role ✅
    ↓
Permission check (from access.role) ✅
```

### TENANT SWITCHING (PASS)
```
switch-tenant request
    ↓
Validate current session
    ↓
Verify user_brand_access for target tenant ✅
    ↓
Delete old session, create new session ✅
    ↓
Return user with access-derived role for new tenant ✅
```

---

## Middleware Audit (`auth.ts`)

| Check | Status | Evidence |
|-------|--------|----------|
| tenantId from session | PASS | `session.tenantId` used (line 78) |
| role from user_brand_access | PASS | `access.role` overrides user.role (line 90) |
| brand access verified | PASS | `getByUserAndTenant` called (line 78) |
| inactive access blocked | PASS | `!access.isActive` check (line 79) |
| client role not trusted | PASS | `...user, role: access.role` (line 88-91) |
| permission check uses access.role | PASS | `hasPermission(req.user.role, permission)` (line 112) |

---

## User Repository Audit

| Field | Required? | Reason | Can Remove Later? |
|-------|-----------|--------|-------------------|
| `User.tenantId` | YES | PostgresUserAdapter queries, findByUsername scoping | Only after DB migration removes column |
| `User.role` | YES | PostgresUserAdapter maps, createUser inserts | Only after DB migration removes column |

**Decision:** Both fields remain on the `User` type as LEGACY DATA COMPATIBILITY. They are not used for authorization.

---

## User Creation Audit

Current flow:
1. Create user (with tenantId + role for DB compatibility)
2. Create user_brand_access (authoritative)

This is correct. User creation always requires corresponding user_brand_access records.

---

## Mock Adapter Audit

| Adapter | Status | Notes |
|---------|--------|-------|
| MockAuthService.authenticate() | PASS | Derives role from brandAccess |
| MockAuthService.getUserBySession() | **FIXED** | Now derives role from brandAccess |
| MockAuthService.switchTenant() | PASS | Derives role from brandAccess |
| MockAuthService.getAuthorizedTenants() | PASS | Uses brandAccess, not users.tenant_id |
| MockUserBrandAccessAdapter | PASS | Full CRUD with role validation |
| MockUserAdapter | PASS | Stores tenantId/role for compatibility |
| MockSessionAdapter | PASS | Stores tenantId for session context |

---

## PostgreSQL Adapter Audit

| Adapter | Status | Notes |
|---------|--------|-------|
| PostgresUserAdapter | PASS | Maps legacy columns for compatibility |
| PostgresUserBrandAccessAdapter | PASS | Full CRUD against user_brand_access |
| PostgresSessionAdapter | PASS | Stores tenantId in session |
| PostgresTenantAdapter | PASS | Standard tenant CRUD |

The Postgres adapters map legacy columns but authorization decisions flow through user_brand_access.

---

## UI Audit

| Component | Status | Notes |
|-----------|--------|-------|
| ProtectedRoute.tsx | PASS | Gets role from server via apiGetMe() |
| Header.tsx | PASS | Displays user.role (from server-derived access role) |
| Sidebar.tsx | PASS | Uses user.role for permission checks (access-derived) |
| UserBrandAccess.tsx | PASS | CRUD for brand access records |
| Login.tsx | PASS | No role/tenant injection |

The UI receives its role from the server's `/api/auth/me` endpoint, which now returns the access-derived role.

---

## API Audit

| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /api/auth/login | PASS | Returns access-derived role |
| GET /api/auth/me | **FIXED** | Now returns access-derived role via getUserBySession |
| POST /api/auth/switch-tenant | PASS | Returns access-derived role |
| GET /api/auth/tenants | PASS | Uses user_brand_access |
| All protected routes | PASS | Middleware overrides role from user_brand_access |

---

## RBAC Audit

| Check | Status | Evidence |
|-------|--------|----------|
| Permissions derived from role | PASS | `hasPermission()` in AuthorizationService.ts |
| Role from user_brand_access | PASS | Middleware overrides (line 90) |
| Role on login from user_brand_access | PASS | authenticate() line 102 |
| Role on switch from user_brand_access | PASS | switchTenant() line 217 |
| Role on /me from user_brand_access | PASS | getUserBySession() now derives from brandAccess |

---

## Tenant Isolation Audit

| Check | Status | Evidence |
|-------|--------|----------|
| Session scoped to tenant | PASS | Session stores tenantId |
| Queries scoped to session.tenantId | PASS | All protected routes use `req.user!.tenantId` from session |
| Brand access per-tenant | PASS | user_brand_access has tenantId |
| Cross-tenant access blocked | PASS | Brand access verified per-tenant |

---

## Migration Audit

| File | Status | Notes |
|------|--------|-------|
| `001_initial.sql` | PRESERVED | Creates users.tenant_id and users.role columns |
| `002_fix_stock_movements.sql` | NOT APPLICABLE | No user fields involved |
| `003_user_brand_access.sql` | PRESERVED | Creates user_brand_access, seeds from users table |

Migration 003 explicitly states: "users.tenant_id and users.role remain — this is an additive layer."

---

## Physical Column Removal Readiness

### CAN users.tenant_id BE PHYSICALLY REMOVED NOW?

**NO** — because:
1. `PostgresUserAdapter.findByUsername()` queries by `tenant_id`
2. `PostgresUserAdapter.createUser()` inserts `tenant_id`
3. `PostgresUserAdapter.getUsersByTenant()` filters by `tenant_id`
4. `User.tenantId` type field is required by the User interface
5. `001_initial.sql` has `tenant_id NOT NULL` with FK constraint

**Required before removal:**
- Refactor PostgresUserAdapter to use user_brand_access for tenant scoping
- Make User.tenantId optional or remove it
- New DB migration to drop the column

### CAN users.role BE PHYSICALLY REMOVED NOW?

**NO** — because:
1. `PostgresUserAdapter.createUser()` inserts `role`
2. `PostgresUserAdapter` SELECT queries include `role`
3. `User.role` type field is required by the User interface
4. `001_initial.sql` has `role NOT NULL` with CHECK constraint

**Required before removal:**
- Refactor PostgresUserAdapter to not use role column
- Remove User.role from the type (or make optional)
- New DB migration to drop the column

---

## Security Tests

15 tests added in `LegacyFieldAuthorizationSecurity.test.ts`:

| # | Test | Status |
|---|------|--------|
| 1 | user.tenant_id cannot grant access without user_brand_access | PASS |
| 2 | user.role=ADMIN does not grant permissions without user_brand_access | PASS |
| 3 | Role comes from user_brand_access, not users.role | PASS |
| 4 | Tenant access requires active user_brand_access | PASS |
| 5 | Deactivated brand access blocks login | PASS |
| 6 | Switching tenant derives role from new brand access | PASS |
| 7 | getUserBySession returns role from user_brand_access | PASS |
| 8 | Cannot login to a tenant without brand access | PASS |
| 9 | Session.tenantId is authoritative, not user.tenantId | PASS |
| 10 | Login returns role from user_brand_access | PASS |
| 11 | Logout invalidates session preventing further use | PASS |
| 12 | Brand access CRUD works correctly | PASS |
| 13 | User A cannot access user B brand access | PASS |
| 14 | Switch to tenant without brand access is rejected | PASS |
| 15 | Brand access is per-tenant, not global | PASS |

---

## Required Final Matrix

| Area | Requirement | Current State | Status | Evidence |
|------|-------------|---------------|--------|----------|
| users.tenant_id authorization dependency | Must be removed | Column exists, not used as authority | PASS | Middleware uses session.tenantId |
| users.role authorization dependency | Must be removed | Column exists, not used as authority | PASS | Middleware uses access.role |
| user_brand_access authorization | Authoritative | All auth flows use it | PASS | Tests 3,4,6,7,10 |
| Session tenant context | From session | session.tenantId used | PASS | Middleware line 78 |
| Session role context | From user_brand_access | access.role used | PASS | Middleware line 90 |
| Middleware role derivation | From user_brand_access | access.role overrides | PASS | auth.ts line 90 |
| Login | Access-derived role | authenticate() uses brandAccess | PASS | MockAuthService line 102 |
| Tenant Switching | Access-derived role per brand | switchTenant() uses brandAccess | PASS | MockAuthService line 217 |
| Protected Routes | Session tenant + access role | req.user set by middleware | PASS | All routes use req.user |
| User Creation | Creates brand access | User + brandAccess | PASS | Architecture correct |
| User Brand Access | Full CRUD | CRUD routes + UI | PASS | 46C-5 implemented |
| Mock Mode | Works without users.role authority | Demo brand access data | PASS | session.ts + demoData.ts |
| PostgreSQL Readiness | Adapters map columns, auth via brand_access | Both layers coexist | PASS | Postgres adapters correct |
| Tenant Isolation | Per-tenant queries | Session-scoped | PASS | All routes use session tenant |
| RBAC | Permission checks from access.role | hasPermission() uses role | PASS | auth.ts line 112 |
| Cash Book | Untouched | No changes | PASS | No modifications |
| Accounting | Untouched | No changes | PASS | No modifications |
| Inventory | Untouched | No changes | PASS | No modifications |
| Reporting | Untouched | No changes | PASS | No modifications |

---

## Test Status

| Metric | Before | After |
|--------|--------|-------|
| Test Files | 29 | 30 |
| Passed | 588 | 603 |
| Skipped | 9 | 9 |
| Failed | 0 | 0 |
| TypeScript | PASS | PASS |
| Build | PASS | PASS |

---

## Files Modified

| File | Reason | Change | Requirement |
|------|--------|--------|-------------|
| `src/domain/adapters/mock/MockAuthService.ts` | getUserBySession() returned raw user.role | Now derives role from user_brand_access | §6 CRITICAL AUTH FLOW |
| `src/ui/lib/session.ts` | clientSideLogin() used hardcoded role from DEMO_USERS | Now derives role from DEMO_BRAND_ACCESS | §12 MOCK MODE READINESS |
| `src/domain/services/LegacyFieldAuthorizationSecurity.test.ts` | NEW — 15 security tests | Authorization security tests | §18 REQUIRED SECURITY TESTS |
| `audit/46C6_LEGACY_USER_FIELD_DEPENDENCY_AUDIT.md` | NEW — audit report | Documentation | §22 REQUIRED AUDIT DOCUMENT |

---

## Remaining Gaps

None identified. All application-level authorization dependencies on users.tenant_id and users.role have been removed.

---

## Deferred Work

| Item | Reason | Required Before |
|------|--------|-----------------|
| Physical users.tenant_id removal | PostgresUserAdapter still queries by tenant_id | DB migration |
| Physical users.role removal | PostgresUserAdapter still uses role column | DB migration |
| Supabase creation | Out of scope | Database readiness |
| SQL execution | Out of scope | Database readiness |
| RLS | Out of scope | Database readiness |
| PostgresUserAdapter refactor | Uses tenant_id for queries | Physical column removal |

---

## Database Status

- **Supabase:** NOT CREATED
- **SQL Executed:** NONE
- **Physical Column Removal:** NOT EXECUTED
- **Migration Preparation:** Physical column removal requires PostgresUserAdapter refactor first

---

## Cash Book

**PASS — NO CHANGES**

---

## Final Physical Database Decision

**CAN users.tenant_id BE PHYSICALLY REMOVED NOW?**

**NO** — PostgresUserAdapter still uses it for queries. Requires adapter refactor first.

**CAN users.role BE PHYSICALLY REMOVED NOW?**

**NO** — PostgresUserAdapter still uses it for inserts/queries. Requires adapter refactor first.

**STATUS:** READY FOR CONTROLLED DATABASE MIGRATION AFTER POSTGRES ADAPTER REFACTOR — PHYSICAL DROP NOT EXECUTED

---

## STEP 46C-6 STATUS

- users.tenant_id Authorization Dependency: PASS
- users.role Authorization Dependency: PASS
- user_brand_access Authority: PASS
- Session Tenant Context: PASS
- Session Role Context: PASS
- Middleware: PASS
- Login: PASS
- Tenant Switching: PASS
- Protected Routes: PASS
- User Creation: PASS
- Tenant Isolation: PASS
- RBAC: PASS
- Cash Book: PASS
- Accounting: PASS
- Inventory: PASS
- Reporting: PASS
