# Step 46C-4 — Tenant / Brand Switching Audit Report

**Date:** 2026-09-06
**Status:** PASS — SAFE TO PROCEED
**Baseline:** 518 tests → 536 tests (18 new) | 0 failed | TypeScript 0 errors | Build PASS

## Summary

Implemented multi-brand tenant switching for authenticated users. Users with access to multiple brands can switch context server-side. Session is rotated, role is re-derived from `user_brand_access`, and old session is invalidated.

## Files Changed

| File | Change |
|------|--------|
| `src/domain/types/auth.ts` | Added `SwitchTenantResult` type |
| `src/domain/services/IAuthService.ts` | Added `switchTenant()`, `getAuthorizedTenants()` |
| `src/domain/adapters/mock/MockAuthService.ts` | Full implementation of switch + tenant listing |
| `src/server/routes/auth.ts` | Added `POST /switch-tenant`, `GET /tenants` |
| `src/ui/lib/api.ts` | Added `switchTenant()`, `getAuthorizedTenants()` |
| `src/ui/lib/demoData.ts` | Added demo handlers for new endpoints |
| `src/domain/adapters/mock/MockTenantAdapter.ts` | Added `resetTenantStore()` |
| `src/domain/services/TenantSwitching.test.ts` | 18 security tests |

## Security Audit

### switchTenant — Flow (MockAuthService:176-225)

| Step | Check | Status |
|------|-------|--------|
| 1 | Validate current session exists (server-side store) | ✅ |
| 2 | Verify user is active | ✅ |
| 3 | Validate target tenant exists and is active | ✅ |
| 4 | Verify ACTIVE user_brand_access for target tenant | ✅ |
| 5 | Delete old session (session fixation prevention) | ✅ |
| 6 | Create new session with target tenantId | ✅ |
| 7 | Return user with access-derived role (not client input) | ✅ |

### getAuthorizedTenants — Flow (MockAuthService:232-250)

| Step | Check | Status |
|------|-------|--------|
| 1 | Filter by active brand access records | ✅ |
| 2 | Cross-reference with active tenants only | ✅ |
| 3 | Return TenantPublicConfig (no sensitive data) | ✅ |

### Route Layer — auth.ts

| Check | Status |
|-------|--------|
| Session extracted from HTTP-only cookie | ✅ |
| Input validation (tenantId required, string, max 128) | ✅ |
| Generic error messages (no enumeration) | ✅ |
| HTTP-only cookie with security flags (secure, sameSite) | ✅ |
| Session rotation on switch (new cookie set) | ✅ |

### Attack Vectors Verified

| Attack | Mitigation | Status |
|--------|-----------|--------|
| **Tenant escalation** | Role from user_brand_access, not client | ✅ |
| **Role injection** | switchTenant API takes (sessionId, tenantId) only — no role param | ✅ |
| **UserId injection** | Session is authoritative source of userId | ✅ |
| **Session fixation** | Old session deleted before new one created | ✅ |
| **Cross-user isolation** | getAuthorizedTenants filters by userId from session | ✅ |
| **Inactive access bypass** | Both authenticate and switch check isActive on brand access | ✅ |
| **Inactive tenant bypass** | Both endpoints verify tenant.isActive | ✅ |
| **Stale session after deactivation** | Auth middleware re-checks brand access per-request (46C-3) | ✅ |

## Test Coverage (18 tests)

| # | Test | Status |
|---|------|--------|
| 1 | Authorized switch A→B with role change | ✅ |
| 2 | Switch back B→A restores original role | ✅ |
| 3 | Switch to unauthorized tenant rejected | ✅ |
| 4 | Switch with inactive brand access rejected | ✅ |
| 5 | Switch to inactive tenant rejected | ✅ |
| 6 | Role from user_brand_access, not client | ✅ |
| 7 | Session identity authoritative, not client userId | ✅ |
| 8 | Three-brand switch chain (A→B→C→A) | ✅ |
| 9 | Same-tenant switch is idempotent + rotates | ✅ |
| 10 | Deactivated access after switch blocks requests | ✅ |
| 11 | getAuthorizedTenants returns only authorized brands | ✅ |
| 12 | getAuthorizedTenants excludes unauthorized brands | ✅ |
| 13 | Cross-user brand isolation | ✅ |
| 14 | Login/session/logout regression | ✅ |
| 15 | Session rotation (old invalidated, new valid) | ✅ |
| 16 | Invalid session rejected | ✅ |
| 17 | Nonexistent tenant rejected | ✅ |
| 18 | Inactive tenants excluded from brand list | ✅ |

## Bug Fix During Implementation

**Root cause of 3 failing tests (TEST 8, 11, 13):** `MockTenantAdapter` lacked a `resetTenantStore()` function. TEST 5 called `tenantRepo.deactivateTenant(APEX)` which modified the module-level `tenants` array. Since `beforeEach` didn't reset the tenant store, the deactivated APEX tenant persisted into subsequent tests, causing `getAuthorizedTenants` to filter it out.

**Fix:** Added `resetTenantStore()` to `MockTenantAdapter.ts`, called in `beforeEach`.

## Test Baseline

- **Pre-46C-4:** 518 passed, 9 skipped
- **Post-46C-4:** 536 passed, 9 skipped (+18 new tests)
- **TypeScript:** 0 errors
- **Build:** PASS

## Known Limitations

1. **No rate limiting on /switch-tenant** — authenticated endpoint, lower risk. Consider adding rate limit in production.
2. **Mock session uses Date.now() + Math.random()** — adequate for dev. Production should use crypto.randomUUID().
3. **No concurrent session limit** — user can have unlimited active sessions. Consider adding limit in production.
