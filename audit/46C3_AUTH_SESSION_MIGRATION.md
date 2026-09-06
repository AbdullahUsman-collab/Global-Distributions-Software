# 46C-3 — Authentication & Session Migration Audit Report

**Date:** 2026-09-06
**Status:** PASS — ALL GATES GREEN

## Executive Summary

Authentication and session middleware now derive the user's role and brand access from `user_brand_access` (the new junction table) instead of `users.role` and `users.tenant_id`. Login UX is unchanged — users still provide `{username, password, tenantId}`. The migration is fully backwards-compatible with existing mock mode behavior.

## What Changed

### 1. MockAuthService — Login Verification
**File:** `src/domain/adapters/mock/MockAuthService.ts`

- Added `IUserBrandAccessRepository` as 5th constructor parameter
- **Step 5 of authenticate()** now calls `brandAccessRepository.getByUserAndTenant(user.id, tenantId)` to verify the user has an ACTIVE access record
- **Step 7** derives the role from `access.role` (NOT from `users.role`)
- The returned `authorizedUser` has `role: accessDerivedRole`, overriding `user.role`

### 2. Auth Middleware — Per-Request Verification
**File:** `src/server/middleware/auth.ts`

- Added `IUserBrandAccessRepository` as 3rd parameter to `createAuthMiddleware()`
- New **Step 5**: Verifies `brandAccessRepo.getByUserAndTenant(user.id, session.tenantId)` returns an active record
- If no active access exists → `401 Not authorized for this brand`
- **Step 6**: `req.user.role` is overridden with `access.role` (NOT from `users.role`)

### 3. Server Wiring
**File:** `src/server/index.ts`

- Imports `MockUserBrandAccessAdapter` / `PostgresUserBrandAccessAdapter`
- Creates `brandAccessAdapter` based on `DATABASE_URL`
- Passes `brandAccessAdapter` to `MockAuthService` constructor (5th arg)
- Passes `brandAccessAdapter` to `createAuthMiddleware()` (3rd arg)

### 4. Mock Adapter Enhancements
**Files:** `MockUserAdapter.ts`, `MockUserCredentialsAdapter.ts`, `MockUserBrandAccessAdapter.ts`

- Added `resetUserStore()`, `resetPasswordStore()`, `resetBrandAccessStore()` functions for test isolation
- Added `registerTestPassword()` and `getBrandAccessStore()` for test setup

### 5. Existing Test Compatibility
**Files:** `ProductionSecurity.test.ts`, `SecurityHardening.test.ts`

- Updated both files to import `MockUserBrandAccessAdapter` and pass it to `MockAuthService` constructor
- All existing tests continue passing (518 total, 0 regressions)

## Test Results

| Metric | Value |
|--------|-------|
| TypeScript | 0 errors |
| Tests | 518 passed, 9 skipped, 0 failed |
| Build | PASS |

### New Auth Migration Tests (13 tests)
| Test | Description | Result |
|------|-------------|--------|
| TEST 1 | Valid login with active brand access | PASS |
| TEST 2 | Login rejected when user has no access to requested brand | PASS |
| TEST 3 | Login rejected when user is inactive | PASS |
| TEST 3b | Deactivated brand access blocks login for active user | PASS |
| TEST 4 | Role derived from user_brand_access, not users.role | PASS |
| TEST 4b | Same user gets different roles per brand | PASS |
| TEST 5 | Session role comes from user_brand_access | PASS |
| TEST 6 | User without access to brand cannot authenticate into it | PASS |
| TEST 7 | Deactivated access blocks authentication | PASS |
| TEST 8 | Multi-brand user has independent access per brand | PASS |
| TEST 9 | Authorization uses user_brand_access.role, not users.role | PASS |
| TEST 10 | Brand access is sole authorization source | PASS |
| Demo regression | Demo users authenticate correctly | PASS |

## Authentication Flow (Post-46C-3)

```
Client sends: { username, password, tenantId }
         ↓
1. Verify tenant exists and is active
         ↓
2. findByUsername(tenantId, username)  ← legacy scoped
         ↓
3. Verify user.isActive
         ↓
4. Verify password (bcrypt on server, plain-text in mock)
         ↓
5. getByUserAndTenant(user.id, tenantId)  ← NEW: verify brand access
         ↓
6. Return user with role = access.role  ← NEW: overrides users.role
         ↓
7. Create session(tenantId, userId)
         ↓
8. Set HTTP-only cookie erp_session
```

### Per-Request Middleware Flow
```
Extract session from cookie → validate session → find user → verify active
         ↓
5. getByUserAndTenant(user.id, session.tenantId)  ← NEW: verify brand access
         ↓
6. req.user.role = access.role  ← NEW: overrides users.role
         ↓
7. next()
```

## What Did NOT Change

- `users.tenant_id` and `users.role` columns remain physically present
- Login form still accepts `{username, password, tenantId}` (UX unchanged)
- `User.role` type definition unchanged
- `UserSession` structure unchanged
- `hasPermission(role, permission)` unchanged — still uses role string
- All protected routes still use `req.user!.tenantId` (unchanged)
- Session creation still uses `tenantId` from the login request

## Backward Compatibility

- **Mock mode**: Fully backward-compatible. `MockUserBrandAccessAdapter` seeds 6 access records matching existing demo user/tenant assignments. All demo users authenticate with same credentials.
- **PostgreSQL mode**: `PostgresUserBrandAccessAdapter` uses parameterized SQL. Requires `003_user_brand_access.sql` migration to be executed.
- **users.role fallback**: No fallback. If a user has no `user_brand_access` record for a tenant, login is rejected. This is intentional — the new model replaces the old.

## Seed Data Mapping

| User | Tenant | users.role | user_brand_access.role | uba ID |
|------|--------|------------|----------------------|--------|
| user-admin-001 | wholesale-001 | ADMIN | ADMIN | uba-001 |
| user-admin-002 | distribution-002 | ADMIN | ADMIN | uba-002 |
| user-admin-003 | apex-trading-003 | ADMIN | ADMIN | uba-003 |
| user-manager-001 | wholesale-001 | MANAGER | MANAGER | uba-004 |
| user-clerk-001 | wholesale-001 | SALES | SALES | uba-005 |
| user-inactive-001 | wholesale-001 | VIEWER | VIEWER (inactive) | uba-006 |

## Owner Architecture Note

Owner = global system authority, NOT a value in `user_brand_access.role`. Owner access is expressed via ADMIN rows for each authorized brand. Owner bypass is handled at the application layer (not via the RBAC role system).

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `src/domain/adapters/mock/MockAuthService.ts` | MODIFIED | Added brandAccessRepository, verify access during login |
| `src/server/middleware/auth.ts` | MODIFIED | Added brandAccessRepository, verify access per-request |
| `src/server/index.ts` | MODIFIED | Wire brandAccessAdapter to auth service and middleware |
| `src/domain/adapters/mock/MockUserAdapter.ts` | MODIFIED | Added resetUserStore(), getUserStore() |
| `src/domain/adapters/mock/MockUserCredentialsAdapter.ts` | MODIFIED | Added registerTestPassword(), resetPasswordStore() |
| `src/domain/adapters/mock/MockUserBrandAccessAdapter.ts` | MODIFIED | Added resetBrandAccessStore(), getBrandAccessStore() |
| `src/domain/services/AuthMigration.test.ts` | CREATED | 13 authorization tests |
| `src/server/ProductionSecurity.test.ts` | MODIFIED | Added brandAccessAdapter to MockAuthService |
| `src/domain/services/SecurityHardening.test.ts` | MODIFIED | Added brandAccessAdapter to MockAuthService |

## Next Steps

- **Step 46C-4**: Tenant/Brand Switching — switch between authorized brands without re-login
- **Step 46C-5**: `users.tenant_id` + `users.role` physical column removal (migration to prepare)
- **Owner bypass integration**: Wire Owner check in protected routes if needed
