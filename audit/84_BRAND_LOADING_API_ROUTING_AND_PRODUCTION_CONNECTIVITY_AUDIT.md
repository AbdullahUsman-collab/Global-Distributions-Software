# Step 84 — Brand Loading Fix, API Routing Audit & Production Connectivity

## Executive Summary

Step 84 identifies and fixes the root cause of the "Failed to load brands" error:

**Root Cause**: The server (`src/server/index.ts`) never loaded the `.env` file. `dotenv` was installed as a dependency but never imported. `process.env.DATABASE_URL` was always `undefined` at startup, so the server always started in mock mode (in-memory). The frontend received mock data locally, but on production (Vercel) there was no backend at all — API requests returned SPA HTML instead of JSON.

**Fixes Applied**:
1. Added `import 'dotenv/config'` as the FIRST import in `src/server/index.ts` — server now reads `.env` and connects to PostgreSQL
2. Added HTML response detection in `session.ts` — frontend now detects Vercel SPA fallback and shows a clear error
3. Added HTML response detection on 200 OK in `api.ts` — prevents misinterpreting HTML as JSON
4. Added 26 new tests covering brand loading, API routing audit, deployment config, and CORS

**Result**: 43 test files, 924 tests passing. TypeScript clean. Build 6.77s.

## Root Cause Analysis

### Primary Root Cause: Missing dotenv Loading

```
src/server/index.ts line 77:
  const usePg = !!process.env.DATABASE_URL;
```

This line executes at module load time. Without `import 'dotenv/config'` at the top of the file, `process.env.DATABASE_URL` was always `undefined`, so `usePg` was always `false`, and the server always used `MockTenantAdapter` instead of `PostgresTenantAdapter`.

The `dotenv` package was listed in `package.json` as a devDependency but was never imported anywhere in the server code. Tests passed because vitest auto-injects `.env` (seen in test output: `injected env (6) from .env`), but the actual server did not.

### Secondary Root Cause: No Backend on Vercel

On Vercel, the frontend has no Express backend. When `VITE_API_URL` is not set, `fetch('/api/tenants')` goes to Vercel, which returns the SPA HTML (via `vercel.json` rewrite) or a 404. The frontend received HTML where it expected JSON, causing a parse error and the "Failed to load brands" message.

### Tertiary: No HTML Response Detection

Neither `session.ts` nor `api.ts` checked the `Content-Type` header before calling `res.json()`. When the response was HTML, `res.json()` threw a parse error, which was caught and converted to a generic error message.

## Fixes Applied

### Fix 1: dotenv Loading (`src/server/index.ts`)

```typescript
// Load .env BEFORE any other imports so process.env is populated
import 'dotenv/config';

import express from 'express';
```

**Effect**: Server now reads `.env`, finds `DATABASE_URL`, connects to PostgreSQL, and uses `PostgresTenantAdapter`. Verified by health endpoint returning `mode: "PostgreSQL"`.

### Fix 2: HTML Response Detection (`src/ui/lib/session.ts`)

Added `Content-Type` check in `apiGetTenants()`:
- If response `Content-Type` is `text/html`, throws `BACKEND_NOT_DEPLOYED` error
- Provides clear error message: "Unable to connect to the ERP server. The backend API is not available."
- Also handles network failures with: "Unable to connect to the ERP server. Please check your network connection."

### Fix 3: HTML Response Detection on 200 (`src/ui/lib/api.ts`)

Added check after `res.status === 204`:
- If response is `text/html` on any successful status, throws clear error
- Prevents Vercel SPA HTML from being interpreted as API JSON

### Fix 4: 26 New Tests (`src/server/Step84_BrandLoadingAPIRouting.test.ts`)

| Category | Tests |
|----------|-------|
| Brand Loading | 4 — endpoint success, JSON content-type, slug lookup, 404 handling |
| Health Endpoint | 1 — returns PostgreSQL mode |
| dotenv Loading | 2 — DATABASE_URL set, PostgreSQL mode |
| API Base URL | 3 — session.ts config, api.ts config, consistent formula |
| Frontend API Audit | 5 — no direct fetch, no hardcoded URLs, HTML detection |
| Vite Proxy | 1 — /api proxy to localhost:3000 |
| Deployment Config | 4 — render.yaml, Dockerfile, .env.example, dotenv import order |
| CORS | 2 — middleware presence, cross-origin cookies |
| Demo Mode | 3 — defaults to false, no production fallback |
| E2E | 1 — complete brand loading flow |

## Complete Frontend API Audit

All frontend API calls go through two centralized files:

| File | Purpose | API Base | Direct fetch? |
|------|---------|----------|---------------|
| `src/ui/lib/api.ts` | General API client | `API_BASE` from `VITE_API_URL` | Yes (this IS the centralized client) |
| `src/ui/lib/session.ts` | Auth/tenant API | `API_BASE` from `VITE_API_URL` | Yes (deliberately independent) |
| All `src/ui/pages/*.tsx` | UI pages | Via `api.ts` functions | No |
| All `src/ui/components/**/*.tsx` | UI components | Via `api.ts` functions | No |
| `src/ui/lib/demoData.ts` | Mock router | N/A (string matching) | No |

**Verdict**: No violations. Zero direct API calls from pages or components. All API requests use the centralized `API_BASE` configuration.

## Vite Proxy Configuration

```
localhost:5173/api/*
    ↓ (Vite proxy)
localhost:3000/api/*
    ↓ (Express)
PostgreSQL
```

Verified in `vite.config.ts`:
- Proxy target: `http://localhost:3000`
- `changeOrigin: true`
- Path: `/api`

## Production Architecture

```
Browser → Vercel (VITE_API_URL set) → Render Backend → Supabase PostgreSQL
```

### Configuration Required

| Platform | Variable | Value |
|----------|----------|-------|
| Vercel | `VITE_API_URL` | `https://distribution-erp.onrender.com/api` |
| Render | `DATABASE_URL` | Supabase connection string |
| Render | `SESSION_SECRET` | Auto-generated |
| Render | `ALLOWED_ORIGINS` | `https://global-distributions-software-mauve.vercel.app` |
| Render | `NODE_ENV` | `production` |

## Deployment Status

**DEPLOYMENT NOT EXECUTED — ENVIRONMENT LIMITATION**

Configuration files (`render.yaml`, `Dockerfile`) are ready. Actual deployment requires:
1. Render account credentials
2. Setting `VITE_API_URL` in Vercel dashboard

## Test Results

- **Previous tests**: 898 passing (42 files)
- **New tests**: 26 (Step 84 brand loading & API audit)
- **Final tests**: 924 passing (43 files)
- **Failed**: 0
- **Skipped**: 0

## TypeScript

PASS — 0 errors

## Build

PASS — 6.77s

## Files Created

| File | Purpose |
|------|---------|
| `src/server/Step84_BrandLoadingAPIRouting.test.ts` | 26 tests for brand loading, API audit, deployment config |
| `audit/84_BRAND_LOADING_API_ROUTING_AND_PRODUCTION_CONNECTIVITY_AUDIT.md` | This audit document |

## Files Modified

| File | Change |
|------|--------|
| `src/server/index.ts` | Added `import 'dotenv/config'` as first import |
| `src/ui/lib/session.ts` | Added HTML response detection, better error messages |
| `src/ui/lib/api.ts` | Added HTML response detection on 200 OK responses |

## Remaining Limitations

1. **Backend not deployed to Render** — requires Render account + manual deployment
2. **Vercel `VITE_API_URL` not set** — must be set after backend deployment
3. **Browser testing not executed** — CLI environment limitation
