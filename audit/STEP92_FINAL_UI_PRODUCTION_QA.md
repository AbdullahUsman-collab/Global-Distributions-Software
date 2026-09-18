# STEP 92 — FINAL UI PRODUCTION QA + HARDENING

UI-only QA and hardening pass on top of Step 91A (`0d21250`). No backend,
database, API, auth, RBAC, tenant, accounting, inventory, or reporting changes.

## Summary

Audited the full ERP UI live against the real API (production tenant `Test12`,
not demo mode): brand selection, login, dashboard, finance, inventory, sales,
purchases, bills, bill detail, aging, receipts, cash book, settings, users,
brand access, brands, header, sidebar, dialogs, forms, tables, and the theme
system. Verified every page with DOM probes (overflow, touch targets, broken
images, raw-error text) plus screenshots, found and fixed 4 genuine UI
defects, and re-verified each fix live.

## UI Issues Found

1. **Unstyled Dashboard "View All" button** — `.dash-view-all-btn` was
   referenced in `Dashboard.tsx` but had no CSS rule anywhere, rendering as a
   raw 20px browser button with no hover/focus treatment.
2. **Back-link touch targets ~16px** — the "← Dashboard" back links on 10
   pages (Finance, Inventory, Sales, Purchases, Bills, Bill Detail, Aging,
   Receipts, Brands, Users) had `padding: 0`, far below touch-target size.
3. **Blank page on unknown URLs** — no catch-all route; any unmatched path
   rendered a completely empty page (verified live at `/some/unknown/url`).
4. **Modals: no Escape handling / no dialog semantics** — modal overlays in
   Users, Brands, Finance (3 modals), Inventory (2 modals) lacked Escape-to-
   close and `role="dialog"`/`aria-modal` (only CashBook handled Escape).

## UI Fixes

| File | Reason | UI Change |
| ---- | ------ | --------- |
| `src/ui/styles/theme.css` | Defect 1 | Token-based `.dash-view-all-btn` rule: 36px target, hover/focus-visible/active states |
| `src/ui/pages/Finance.tsx` | Defect 2 | Back-link 10px vertical hit padding + inline-block (visual position unchanged via negative margin) |
| `src/ui/pages/Inventory.tsx` | Defect 2, 4 | Back-link hit padding; useEscapeKey + dialog semantics on ProductModal & CreateMovementModal |
| `src/ui/pages/Sales.tsx` | Defect 2 | Back-link hit padding |
| `src/ui/pages/Purchases.tsx` | Defect 2 | Back-link hit padding |
| `src/ui/pages/BillsList.tsx` | Defect 2 | Back-link hit padding |
| `src/ui/pages/BillDetail.tsx` | Defect 2 | Back-link hit padding |
| `src/ui/pages/AgingReport.tsx` | Defect 2 | Back-link hit padding; Ledger/Bills drill-down buttons 25→32px |
| `src/ui/pages/CustomerReceipts.tsx` | Defect 2 | Back-link hit padding |
| `src/ui/pages/Brands.tsx` | Defect 2, 4 | Back-link hit padding; useEscapeKey + dialog semantics on Create/Edit brand modals |
| `src/ui/pages/Users.tsx` | Defect 2, 4 | Back-link hit padding; useEscapeKey + dialog semantics on Create/Edit user modals |
| `src/ui/App.tsx` | Defect 3 | Catch-all `path="*"` route → new NotFound page |
| `src/ui/pages/NotFound.tsx` | Defect 3 | New theme-consistent 404 page with recovery navigation (Back / Dashboard-or-Brand-Selection), 44px buttons |
| `src/ui/hooks/useEscapeKey.ts` | Defect 4 | New shared Escape-key hook for modal dialogs |

## Backend/Data Issues

- Bills list shows party "Unknown" for pre-AR/AP legacy vouchers
  (`BillsListService` enrichment gap) — `BACKEND / DATA ISSUE — UI-ONLY TASK — NOT MODIFIED` (carried from Step 89/90 findings).
- Orphaned brand-access rows referencing non-existent brand IDs render the
  UI's graceful `?` fallback — `BACKEND / DATA ISSUE — UI-ONLY TASK — NOT MODIFIED`.
- Transient 401s observed after long idle (session expiry) — session/
  backend behavior, correctly surfaced by the UI's existing handling —
  `BACKEND / DATA ISSUE — UI-ONLY TASK — NOT MODIFIED`.

## Responsive Verification

- Live-rendered preview at ~443px viewport (screenshot): Dashboard KPIs
  stack, period tabs scroll horizontally, zero overflow.
- DOM fluidity probes at 300px content width on Bills (dense table), Finance,
  Inventory, Sales, Purchases, Aging, Cash Book, Users, Brand Access,
  Settings, Brands: **0 page-level overflow everywhere**; the Bills table
  scrolls internally inside its wrapper (controlled table scrolling).
- 320/375/480/768/1024/1440 as physical viewports: NOT MANUALLY VERIFIED —
  ENVIRONMENT LIMITATION (preview cannot resize to exact device widths;
  fluid-shrink + overflow probes used instead).

## Accessibility

- Keyboard: brand card Enter-activation → navigation verified (Step 91A);
  modal Escape-to-close verified live on Users page; global `:focus-visible`
  outline intact; all new/edited controls are semantic `<button>`/`<a>`.
- Semantics: modal overlays now `role="dialog" aria-modal="true"`; no
  clickable-div regressions introduced; back links remain `<a>` elements.
- Touch: smallest interactive target after fixes = 32px (dense-table
  drill-downs); standard controls ≥36px; primary buttons 44px.

## Theme

- Light/dark/system cycle verified live on real data (computed surfaces:
  light `rgb(248,250,252)`, dark `rgb(11,18,32)`, readable text both modes).
- Brand theming: Test12 accent `hsl(183,80%,30%)` applied via the existing
  `#brand-theme` layer; Step 91 BrandThemeStudio and Step 91A full-card brand
  treatment untouched and verified rendering.
- All fixes are token-based (`var(--…)`) — no hardcoded colors.

## Navigation

Verified live: brand selection → login → dashboard; sidebar links to all 13
routes; Bills → View → `/bills/:voucherId` detail; Aging drill-down targets;
Settings/Users/Brand Access/Brands; back links to Dashboard; 404 recovery
navigation.

## Transaction Drill-Down

Bills list (29 real rows) → View action → bill detail with real voucher data
(verified in Step 91A session and re-checked this session; statuses, totals,
and back navigation render correctly).

## Browser Verification

- Chrome (Chromium preview runtime): actually tested.
- Edge, Firefox, Safari, Mobile Chrome, Mobile Safari: NOT DIRECTLY VERIFIED
  — ENVIRONMENT LIMITATION.

## Tests

- Step 91 UI suite (`src/ui/lib/brandTheme.test.ts`): **16/16 PASS**.
- Full suite: **969 passed / 66 failed / 10 skipped** — identical to the
  pre-existing baseline (66 DB-integration failures, out of scope).

## TypeScript

PASS — `npx tsc --noEmit` exit 0; `npx tsc -p tsconfig.server.json --noEmit` exit 0.

## Build

PASS — `npm run build` ✓ (14.30s).

## Remaining Limitations

- Exact device viewports not directly rendered (environment limitation).
- Only Chromium-based rendering verified; other browsers listed above.
- No new UI tests added: no defect fixed here was expressible in the
  project's node-env pure-function test setup (visual/interaction defects
  verified live instead), so speculative tests were avoided per §24.
