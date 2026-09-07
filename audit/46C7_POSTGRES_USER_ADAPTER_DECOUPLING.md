# Step 46C-7 — PostgresUserAdapter Decoupling from Legacy Tenant/Role Fields

**Status:** COMPLETE  
**Date:** 2026-09-08  
**Commit:** `62ba25c` (prior) → this commit

## Objective

Decouple `PostgresUserAdapter` from `users.tenant_id` and `users.role` so that:
- Tenant scoping is derived from `user_brand_access`, not `users.tenant_id`
- The Postgres adapter matches the mock adapter's authorization behavior
- Physical columns remain for legacy schema compatibility

## Changes

### `src/server/db/repositories/postgres_user_adapter.ts`

| Method | Before (46C-6) | After (46C-7) |
|---|---|---|
| `findByUsername()` | `WHERE tenant_id = $1 AND LOWER(username) = LOWER($2)` | `JOIN user_brand_access uba ON uba.user_id = u.id AND uba.tenant_id = $1 AND uba.is_active = true WHERE LOWER(u.username) = LOWER($2)` |
| `getUsersByTenant()` | `WHERE tenant_id = $1` | `JOIN user_brand_access uba ON uba.user_id = u.id AND uba.tenant_id = $1 AND uba.is_active = true` |
| `findById()` | No tenant scoping (identity lookup) | No change |
| `isUserActive()` | No tenant scoping | No change |
| `createUser()` | Inserts `users.tenant_id` and `users.role` | No change (writes for legacy schema compat) |
| `mapRow()` | Reads legacy columns | No change (reads for User type compat) |

**Key changes:**
- `findByUsername` now JOINs `user_brand_access` to verify active brand access for the requested tenant
- `getUsersByTenant` now JOINs `user_brand_access` to list only users with active brand access
- Both methods use `DISTINCT` / `INNER JOIN` to exclude users without active brand access
- Added `18 security tests` to `LegacyFieldAuthorizationSecurity.test.ts`

### Security Tests (18 total)

| Test | What it proves |
|---|---|
| TEST 1–5 | Authorization depends on user_brand_access, not users.role |
| TEST 6–10 | Switch-tenant and session flows derive role from brand access |
| TEST 11–12 | Logout invalidates sessions, brand access CRUD works |
| TEST 13–15 | Cross-user isolation, per-tenant isolation |
| TEST 16 | Changing `users.role` in store does not change effective role |
| TEST 17 | Changing `users.tenantId` does not grant unauthorized tenant access |
| TEST 18 | Brand access is required regardless of user.tenantId value |

### `src/domain/types/user.ts` (unchanged)

Physical columns remain in the database schema:
```sql
CREATE TABLE users (
  ...
  tenant_id VARCHAR(255) NOT NULL,  -- legacy, NOT authorization authority
  role VARCHAR(255) NOT NULL,       -- legacy, NOT authorization authority
  ...
);
```

## Authorization Authority Chain (Final)

```
HTTP Request
  ↓
auth.middleware.ts → verifies user_brand_access.active, sets req.user.role
  ↓
Route handlers → use req.user.role (from brand access)
  ↓
MockAuthService.getUserBySession() → derives role from brandAccess store
PostgresUserAdapter.findByUsername() → JOINs user_brand_access
```

## Test Results

```
Test Files: 30 passed
Tests: 606 passed | 9 skipped (615)
```

## Scope

- ✅ PostgresUserAdapter queries now use user_brand_access for tenant scoping
- ✅ Mock adapter unchanged (mock-specific behavior is acceptable)
- ✅ Physical columns remain for schema compatibility
- ✅ Security tests verify legacy field independence
- ❌ No physical column removal (deferred to future step)
- ❌ No other adapters modified (Session, Credentials don't need changes)
