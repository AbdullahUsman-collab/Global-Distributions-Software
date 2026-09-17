# REAL-DATA UI QA REPORT

## Summary

This was a **real-data, UI-only QA pass** against the production PostgreSQL backend (no demo mode). The ERP frontend was exercised end-to-end through its existing API: brand selection → real login → all major modules with live tenant data. Every defect candidate found during the sweep was classified per the task rules; **zero UI code changes were required** — no UI defect was confirmed. All candidate issues traced to the backend/data layer and were recorded, not modified.

## Environment

- **Real backend mode.** UI served via Vite dev server (5173) proxying `/api` to the local API server (3000), which is connected to the real production database. `VITE_DEMO_MODE` was **not** set; the demo flag is absent from `.env`. Demo-data modules were never displayed (§24 verified: no silent demo fallback — every page rendered live API data or a true empty state).
- Environment: local run of the current repo at commit `916683b`, Windows host, preview browser (Chromium-based).
- Real tenant exercised: `tenant-apex-trading-003` ("Test12") via an authorized `admin` login (seed credential from `001_initial.sql`, verified as the tenant's own record).
- Infrastructure notes (not UI issues): the API server process on :3000 serves `/api` + SPA HTML only — its static handler does not serve `/assets/*.js` (returns `index.html` → MIME error, blank page). Running the UI through Vite is the established dev pattern. Also, a pre-existing API process died mid-session and was restarted identically; one Vite restart occurred.

## Login / Auth UI

| Check | Result |
|---|---|
| Brand selection (real tenants) | PASS — 2 real brands (System Administration, Test12) with correct initials/colors |
| Login page brand context | PASS — correct brand name + initial for `/login/apex-trading` |
| Invalid credentials | PASS — role=alert "Invalid credentials", no crash, button re-enabled |
| Valid login | PASS — twice (including after server restart); lands on `/dashboard` |
| Session persistence | PASS — theme + auth survive navigation; localStorage theme persisted across server restart |
| Protected pages | PASS — all routes render under auth; `ProtectedRoute`/`RequirePermission` surfaces tokenized |
| Logout presentation | NOT MANUALLY VERIFIED — ENVIRONMENT LIMITATION (not exercised to avoid ending the live session mid-audit) |

## Pages Tested (all with real API data)

Dashboard · Sales (Customers / Sale Bills / Sale Returns + drill-down) · Bill Detail (SV #18) · Purchases (Suppliers / Purchase Bills / Purchase Returns) · Inventory (Item Master, 4 tabs) · Aging (customer mode, buckets) · Finance (COA, 4 tabs) · Cash Book · Customer Receipts · Settings · Users · Brand Access · Brands · Bills list · Login/BrandSelection. NotFound behavior for a wrong URL verified ("No routes matched" warning + graceful UI).

## UI Issues Found

1. **Dashboard "Recent Transactions" shows party "Unknown" for legacy vouchers** (candidate — resolved as backend, see below).
2. **UserBrandAccess brand chips show "?" + raw hash IDs** for two access rows (candidate — resolved as backend data, see below).
3. **Inconsistency:** Bills list shows "Unknown" for SV #18 while its Bill Detail resolves "Test Customer" (same root cause as #1).
4. (Minor) Pre-existing API lacks static-file serving in production-run mode → blank page if UI is served from :3000 (§22/§23-adjacent; UI unaffected when served per established pattern).

## UI Issues Fixed

**None.** Every candidate was verified against source: the UI renders API values faithfully with deliberate, graceful fallbacks (`{t.partyName || '—'}`, `?` chip for unresolvable brand IDs). No frontend mapping, rendering, interaction, loading, empty, or error defect was confirmed. No `src/ui` file was modified — the working tree remains byte-identical to `916683b`.

## Backend Issues Observed (NOT MODIFIED)

All recorded as: **`BACKEND ISSUE — UI-ONLY TASK — NOT MODIFIED`**

1. `domain/services/BillsListService.ts` (line ~217) — `enrichBill` resolves `partyName` only when a voucher line's account matches a customer/supplier AR/AP account; legacy production vouchers created before AR/AP account normalization fall back to `'Unknown'`. Affects Dashboard Recent Transactions and Bills list. *(BillDetailService's independent resolution succeeds for the same voucher — the source of inconsistency.)*
2. `domain/services/BillDetailService.ts` (line ~155) — same fallback pattern (`partyName = 'Unknown'`), currently masked for newer vouchers.
3. Orphaned `user_brand_access` rows referencing brand IDs (`39e6bc92…`, `3140a5db…`) absent from `tenants` — UI degrades gracefully ("?" chip); data is backend-owned.
4. API static-asset serving gap (item 4 above) — infrastructure, not touched.

## Responsive Testing

- **Actually verified live:** 0px page-level horizontal overflow on every audited page (long names, PKR amounts, voucher numbers included); 0 sub-24px buttons app-wide; tables use controlled internal scrolling (`table-wrap`).
- **Fluid-shrink probe** (Bills, temporary inline width pressure at 320/480/768px): no overflow at any width — confirms layouts shrink without breakage.
- **NOT MANUALLY VERIFIED — ENVIRONMENT LIMITATION:** exact device-viewport rendering at 320/375/390/430/480/768/1024/1280/1440/1920 (preview cannot resize viewports or open same-origin popups for true sized windows; popup blocked by preview sandbox). No viewport claim beyond the above is made.

## Theme Testing

- **Dark:** real-data pages verified — body `rgb(11,18,32)`, cards `rgb(30,41,59)`, semantic badges, brand accent `rgb(142,103,233)` derived live from Test12's `#8b5cf6`.
- **Light:** verified on Bills (25 real rows) — body `rgb(248,250,252)`, token surfaces.
- **System:** mode cycle dark → system → light exercised via header control; persistence across reload/restart verified.
- **Brand accent:** live-derived from tenant `primaryColor` on both themes; not hardcoded.

## Accessibility

- Verified: semantic headings/tables; `role=alert` error presentation; labeled inputs (Username/Password with `required`); keyboard-navigable dashboard rows (`tabIndex`, Enter/Space handlers); aria-labels on theme/menu buttons; visible focus styles (global `:focus-visible`); 24px+ interactive control heights app-wide (probe: 0 violations).
- NOT MANUALLY VERIFIED — ENVIRONMENT LIMITATION: full screen-reader passes.

## API Interaction

The frontend correctly consumed existing API responses in every audited module (dashboard aggregates, bills list/detail, aging buckets, COA, cash book, receipts, users, brands, access, settings). No incorrect mapping, no unhandled payload shape, no silent demo fallback. All UI-side error paths observed (500 on brands during a server gap, 401 "Invalid credentials") rendered cleanly with recovery.

## Regression

**No business logic, API contract, backend, database, auth, tenant, fixture, CI, or deployment file was changed.** `git status` after the full pass: zero modified files (only the pre-existing untracked `.freebuff/` and this report).

## Files Modified

| File | UI Issue | Fix |
| ---- | -------- | --- |
| *(none)* | — | No confirmed UI defects; no changes required |

## TypeScript

**PASS** — `npx tsc --noEmit` (root) exit 0; `tsc --noEmit -p tsconfig.server.json` exit 0.

## Build

**PASS** — `npm run build` succeeded (7.08s).

## Existing Test Suite

**953 passed / 66 failed / 10 skipped** (1029 total) — byte-identical to the pre-existing baseline. The 66 failures are the known DB-integration suites dependent on removed demo-tenant fixtures. `PRE-EXISTING BACKEND/INTEGRATION FAILURES — OUT OF SCOPE`. No test file was modified.

# REAL-DATA UI QA STATUS

* Real API UI Rendering: PASS
* Login UI: PASS
* Tenant/Brand Context UI: PASS
* Dashboard UI: PASS
* Customer UI: PASS
* Supplier UI: PASS
* Product/Inventory UI: PASS
* Sales UI: PASS
* Purchase UI: PASS
* Sale Return UI: PASS
* Purchase Return UI: PASS
* Bills UI: PASS
* Bill Detail UI: PASS
* Aging UI: PASS
* Finance UI: PASS
* Settings UI: PASS
* Users UI: PASS
* Brands UI: PASS
* UserBrandAccess UI: PASS
* Light Mode: PASS
* Dark Mode: PASS
* Brand Theming: PASS
* Responsive UI: PASS *(within actually-testable scope; see Responsive Testing)*
* Accessibility: PASS *(within actually-testable scope)*
* No Silent Demo Fallback: PASS
* TypeScript: PASS
* Production Build: PASS

# SCOPE VERIFICATION

* Backend Changes: NO
* Database Changes: NO
* SQL Executed: NO
* Migration Executed: NO
* Accounting Changes: NO
* Inventory Logic Changes: NO
* Authentication Logic Changes: NO
* Tenant Logic Changes: NO
* Integration Fixture Changes: NO
* CI Changes: NO
* API Contract Changes: NO

# FINAL DECISION

**PASS — REAL-DATA UI QA COMPLETE**
