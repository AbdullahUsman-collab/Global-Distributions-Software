# Step 50: Demo Readiness + SPA Routing + Legacy Data Audit

**Date:** 2026-09-08
**Status:** PASS WITH NOTES

---

## Executive Summary

SPA routing is fully operational. Server-side fallback now correctly serves `index.html` for all non-API GET requests, enabling React Router to handle client-side routing on page refresh or direct URL navigation.

---

## 1. SPA Routing Fix

### Problem
Direct URL access (e.g., `/finance`, `/cash-book`, `/inventory`) or page refresh returned 404 because the Express server had no SPA fallback route. Only the Vite dev server handled this correctly.

### Solution
Added SPA fallback route in `src/server/index.ts` (lines 214-229):
```typescript
app.get(/^(?!\/api\/).*/, (req, res) => {
  if (hasDist) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'SPA not built. Run "npm run build" first.' });
  }
});
```

Also added `vercel.json` for Vercel deployment:
```json
{ "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }] }
```

### Verification
All 8 SPA routes return HTTP 200 with `id="root"` div:
- `/dashboard`, `/finance`, `/inventory`, `/cash-book`, `/settings`, `/customers`, `/suppliers`, `/brand-access`

---

## 2. Legacy Data Import Discovery

**Finding:** The legacy ERP runs on a remote SQL Server instance at `38.92.47.89:8026`. No authorized data export or migration tool exists. Direct database access is not available.

**Decision:** Demo data will be seeded via application APIs and PostgreSQL seed scripts. The new ERP uses fictional data ("Demo Wholesale") — never "MotherCare".

---

## 3. Demo Data Strategy

| Data Type | Seed Method | Status |
|-----------|-------------|--------|
| Tenants (3) | Migration 001 | ✅ Seeded |
| Users (6) | Migration 001 + manual credential seeding | ✅ Seeded |
| User Brand Access (6) | Migration 003 | ✅ Seeded |
| Warehouses (2) | `seed_warehouses.mjs` | ✅ Seeded |
| COA (16 accounts) | `seed_coa.mjs` | ✅ Seeded |
| Customers, Suppliers, Products | Created via API at runtime | ✅ Working |
| Vouchers, Ledger Entries | Created via API at runtime | ✅ Working |

---

## 4. Changes Made

| File | Change |
|------|--------|
| `src/server/index.ts` | Added `path`/`fs` imports, SPA fallback route, health endpoint moved before auth middleware |
| `vercel.json` | Created for Vercel deployment SPA routing |

---

## 5. Remaining Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| COGS → GL posting not implemented | Medium | `calculateCOGS()` exists but is never called |
| Cost_rate formula unknown | Low | Specification gap |
| Legacy data import not possible | Info | No authorized data source |

---

## Gate Verdict

**READY** — SPA routing verified, demo data seeded, all routes functional.
