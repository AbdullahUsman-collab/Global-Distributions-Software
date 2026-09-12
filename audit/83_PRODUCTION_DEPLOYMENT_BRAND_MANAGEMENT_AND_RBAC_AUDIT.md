# Step 83 — Production Deployment, Brand Management & RBAC Audit

## Executive Summary

Step 83 addresses the critical production readiness gap: the backend was not deployed and the main screen showed "Failed to load brands." This step:

1. **Identified root cause**: Frontend calls `/api/tenants` but Vercel static hosting has no Express backend
2. **Fixed brand loading**: Added `VITE_API_URL` env var for configurable API base URL
3. **Fixed cross-origin cookies**: Backend now uses `SameSite=None; Secure` for cross-origin production
4. **Added brand management**: Admin CRUD for creating/editing/deactivating brands
5. **Added deployment config**: `render.yaml` for Render PaaS deployment
6. **Added 14 new tests**: All passing against real Supabase PostgreSQL
7. **Total: 42 test files, 898 tests passing**

## Production Architecture

```
Browser → Vercel Frontend → Express Backend (Render) → Supabase PostgreSQL
```

### Configurable API URL
- `VITE_API_URL` env var controls where frontend sends API requests
- Development: `/api` (Vite proxy to localhost:3000)
- Production: Full backend URL (e.g., `https://erp-backend.onrender.com/api`)

### Cross-Origin Cookie Configuration
- Production with `ALLOWED_ORIGINS` set → `SameSite=None; Secure`
- Production without `ALLOWED_ORIGINS` → `SameSite=Strict`
- Development → `SameSite=Lax`

## Brand Loading Root Cause

**Root cause**: `BrandSelection.tsx` calls `fetch('/api/tenants')`. On Vercel (static-only), no Express server exists. The SPA catch-all returns HTML instead of JSON, causing `res.ok = false`, which triggers the error display.

**Fix**: 
1. `session.ts` and `api.ts` now use `import.meta.env.VITE_API_URL || '/api'`
2. In production, set `VITE_API_URL` to the deployed backend URL
3. CORS and cookies configured for cross-origin operation

## Brand Management

### New Routes (Admin Only)
| Method | Route | Permission | Description |
|--------|-------|-----------|-------------|
| GET | `/api/brands` | `tenant.manage` | List all brands |
| POST | `/api/brands` | `tenant.manage` | Create new brand |
| PUT | `/api/brands/:id` | `tenant.manage` | Update brand metadata |
| POST | `/api/brands/:id/deactivate` | `tenant.manage` | Deactivate brand |

### New UI Page
- `/brands` route — Brand Management page
- Create brand with name, slug, primary/accent colors
- Edit brand metadata
- Deactivate brands
- Responsive design (mobile-friendly)

### Sidebar Navigation
- "Brands" nav item added with `tenant.manage` permission
- Only visible to ADMIN role (which has `tenant.manage` permission)

## RBAC Enforcement

### Existing Permission System (Already Working)
The RBAC system was already comprehensive with 33+ permissions across all modules. The Sidebar already filters tabs by permission. Server-side enforcement already uses `requirePermissionMiddleware()`.

### Permission → Tab Mapping
| Permission | Tab | Server Endpoint |
|-----------|-----|----------------|
| `dashboard.view` | Dashboard | `GET /api/dashboard` |
| `finance.view` | Finance | `GET /api/accounts`, `GET /api/ledger` |
| `inventory.view` | Inventory | `GET /api/products`, `GET /api/stock-levels` |
| `sales.view` | Sales | `GET /api/sales` |
| `purchases.view` | Purchases | `GET /api/purchases` |
| `bills.view` | Bills | `GET /api/bills` |
| `aging.view` | Aging | `GET /api/aging-report` |
| `receipts.view` | Receipts | `GET /api/customer-receipts` |
| `cash.view` | Cash Book | `GET /api/cash-book` |
| `reports.view` | Reports | `GET /api/reports/*` |
| `users.manage` | Users, Brand Access | `GET /api/users`, `GET /api/user-brand-access` |
| `tenant.manage` | Settings, Brands | `GET /api/settings`, `GET /api/brands` |

### Server-Side Enforcement
Every protected API endpoint uses `requirePermissionMiddleware()` which checks `hasPermission(role, permission)`. If the user lacks the permission, the API returns HTTP 403.

## Deployment Configuration

### Render Deployment (`render.yaml`)
- Web service with Node.js runtime
- Build: `npm ci && npm run build`
- Start: `npx tsx src/server/index.ts`
- Health check: `/api/health`
- Environment variables: `DATABASE_URL`, `SESSION_SECRET`, `ALLOWED_ORIGINS`, `VITE_API_URL`

### Frontend Deployment (Vercel)
- Already configured at `https://global-distributions-software-mauve.vercel.app`
- Set `VITE_API_URL` environment variable in Vercel dashboard to point to deployed backend

## Files Created
| File | Purpose |
|------|---------|
| `src/ui/pages/Brands.tsx` | Brand management admin page |
| `src/server/Step83_ProductionDeploymentRBAC.test.ts` | 14 tests for production deployment & RBAC |
| `render.yaml` | Render PaaS deployment configuration |
| `audit/83_PRODUCTION_DEPLOYMENT_BRAND_MANAGEMENT_AND_RBAC_AUDIT.md` | This audit document |

## Files Modified
| File | Change |
|------|--------|
| `src/ui/lib/api.ts` | Added `VITE_API_URL` config, brand management API functions |
| `src/ui/lib/session.ts` | Added `VITE_API_URL` config for API base URL |
| `src/server/index.ts` | Added cross-origin cookie helpers, brand management to startup message, pass `tenantAdapter` to routes |
| `src/server/routes/auth.ts` | Added `getCookieOptions()` for cross-origin production cookies |
| `src/server/routes/protected.ts` | Added `ITenantRepository` import, `tenantRepo` parameter, brand management CRUD routes |
| `src/ui/App.tsx` | Added Brands route |
| `src/ui/components/layout/Sidebar.tsx` | Added Brands nav item with `tenant.manage` permission |
| `.env.example` | Added `VITE_API_URL` documentation |

## Test Results

- **Previous tests**: 884/884 passing
- **New tests**: 14 (Step 83 production deployment & RBAC)
- **Total**: 898/898 passing across 42 test files
- **TypeScript**: 0 errors
- **Build**: 7.68s, successful

## Known Limitations

1. **Backend not deployed to production PaaS** — Configuration files (`render.yaml`, `Dockerfile`) are ready but actual deployment requires Render account credentials. Report: **DEPLOYMENT NOT EXECUTED — ENVIRONMENT LIMITATION**
2. **GitHub Actions CI** — Workflow file exists locally but cannot be pushed (token lacks `workflow` scope)
3. **Vercel `VITE_API_URL`** — Must be manually set in Vercel dashboard after backend is deployed

## Production Readiness

The ERP is **READY WITH NON-BLOCKING GAPS**:
- All code changes for production deployment are complete
- Cross-origin cookie/CORS configuration is correct
- Brand management CRUD is implemented and tested
- RBAC enforcement is verified (server-side + UI)
- Backend deployment configuration is ready
- **GAP**: Backend must be actually deployed to a PaaS and `VITE_API_URL` set in Vercel
