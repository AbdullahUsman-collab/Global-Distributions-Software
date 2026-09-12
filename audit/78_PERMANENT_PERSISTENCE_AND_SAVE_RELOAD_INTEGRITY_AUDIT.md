# Step 78 — Permanent Persistence & Save/Reload Integrity Audit

**Date:** 2026-09-11
**Status:** COMPLETED

## 1. Client-Reported Problem

"When an item, setting, or other data is updated, the change does not permanently stay saved."

The UI may appear to save the change, but after reload/re-login/re-fetch, the old value can return.

## 2. Definition of Permanent Persistence

A change is only considered PERSISTED when:
UI input → DTO → API request → server → domain service → repository → PostgreSQL adapter → DB COMMIT → fresh DB read → API response → UI display returns the new value. Then: browser refresh → value remains. Navigate away → return → value remains. Logout → login → value remains.

## 3. Current Persistence Architecture

```
React UI → api.ts → Express API → Domain Service → Repository Interface → Adapter (Mock or Postgres) → Supabase PostgreSQL
```

- **Demo mode:** Mock adapters (in-memory, lost on reload)
- **Production mode:** PostgreSQL adapters (Supabase, permanent)

The API client (`api.ts`) has a demo data fallback: when the server is unreachable or returns an error, it falls back to client-side mock data.

## 4. Root Causes Found

### ROOT CAUSE #1: Demo Mode Silent Fallback (PRIMARY)

**File:** `src/ui/lib/api.ts:81-93, 110-121`

The API client silently fell back to demo data for ALL requests (GET, POST, PUT, DELETE) when the server returned an error or was unreachable.

**Before fix:**
```
Server returns 404/500 → demo handler returns { success: true } → UI shows "saved"
Server unreachable → demo handler returns mock data → UI shows "saved"
```

User sees success message. Data is lost on reload.

**Impact:** Every create/update operation appeared to succeed but was lost. This is the PRIMARY cause of the client's complaint.

### ROOT CAUSE #2: Settings Shallow Merge

**File:** `src/server/db/repositories/postgresSettingsAdapter.ts:40`

The Settings adapter used `{ ...existing, ...partial }` (shallow merge). This could lose nested fields when the partial only partially covers a section.

## 5. Fixes Applied

### Fix #1: API Client Persistence Guard

**File:** `src/ui/lib/api.ts`

**For state-changing requests (POST/PUT/DELETE):**
- Server returns non-OK status → **throw error** (not demo fallback)
- Network error (server unreachable) → **throw error** with clear message: "Server unavailable — changes were NOT saved. Please try again."

**For read-only requests (GET):**
- Demo fallback still works (preserves Vercel demo mode)

### Fix #2: Settings Deep Merge

**File:** `src/server/db/repositories/PostgresSettingsAdapter.ts`

Replaced shallow merge with recursive `deepMerge()` function. Nested objects (like `profile`, `taxAccounts`, `financial`) are merged field-by-field instead of replaced wholesale.

## 6. Full Persistence Chain Verification

Traced every create/update path through: UI → API Client → Route → Service → Repository → Adapter → SQL → DB.

| Entity | Create | Update | Read | Tenant Scoping | Verdict |
|--------|--------|--------|------|----------------|---------|
| Products | ✅ | ✅ | ✅ | ✅ | **PASS** |
| Accounts | ✅ | ✅ | ✅ | ✅ | **PASS** |
| Customers | ✅ | ✅ | ✅ | ✅ | **PASS** |
| Suppliers | ✅ | ✅ | ✅ | ✅ | **PASS** |
| Settings | ✅ | ✅ | ✅ | ✅ | **PASS** (after deep merge fix) |
| Users | ✅ | ✅ | ✅ | ✅ | **PASS** |
| Vouchers | ✅ | ✅ | ✅ | ✅ | **PASS** |

### Product Tax Fields (Post-Step 77)

All 6 tax fields verified persisted:
- `furtherTaxPercent` — INSERT ✅, UPDATE ✅, SELECT ✅, RETURNING ✅
- `gstPercent` — ✅
- `fedPercent` — ✅
- `advanceTaxSalePercent` — ✅
- `advanceTaxPurchasePercent` — ✅
- `margin` / `costRate` — ✅

### Settings After Step 77

4 tabs remain: Business Profile, Tax Accounts, Financial Rules, Change Password.
Removed tabs (Sales Tax, Further Tax, FED, Advance Tax) remain removed.
Save sends `{ profile, taxAccounts, financial }` → deep merged with existing.

## 7. PostgreSQL Verification

Integration tests (`PostgresSalesWorkflow.integration.test.ts`) verify:
- Login → create sale draft → post → retrieve bill → ledger entries
- Cross-tenant isolation
- All run against live Supabase PostgreSQL

Migration 005 (`further_tax_percent`) applied and verified.

## 8. Tenant Isolation

All Postgres adapters use `WHERE tenant_id = $1 AND id = $2` pattern.
Settings are stored per-tenant in `tenant_settings` table.
Users are scoped through `user_brand_access` join table.

## 9. Demo vs PostgreSQL Source-of-Truth

| Mode | Behavior |
|------|----------|
| **PostgreSQL** (DATABASE_URL set) | Express server handles all requests. API client calls real server. Data persists in Supabase. |
| **Demo** (DATABASE_URL not set) | Express server uses mock adapters. API client falls back to client-side demo data on server errors. Data is in-memory only. |
| **Vercel** (static, no backend) | API calls fail → GET fallback to demo data. POST/PUT/DELETE now throw errors (user sees failure). |

## 10. Tests

22 focused regression tests in `src/domain/services/Step78_PersistenceAudit.test.ts`:
- API client persistence guard (3 tests)
- Settings deep merge (2 tests)
- Product persistence chain (5 tests)
- Account persistence chain (2 tests)
- Settings persistence chain (3 tests)
- Settings tax tabs removal (1 test)
- Migration 005 (2 tests)
- Tenant isolation (4 tests)

## 11. Verification

- **TypeScript:** `npx tsc --noEmit` — clean (0 errors)
- **Tests:** `npx vitest run` — **771 passed / 0 failed** (37 files)
- **Build:** `npm run build` — successful
