# STEP 91 — BRAND LOGO + AUTOMATIC COLOR THEME ENGINE (UI-ONLY) — AUDIT REPORT

## Summary

Implemented a UI-only brand-logo and automatic color-theme engine. A new
**Brand Theme Studio** (rendered inside the existing Brand Management page)
lets an admin provide a brand logo by **URL** or by **local file upload**, sees
an immediate **aspect-safe preview**, gets **deterministic client-side color
extraction** from the logo, a **live light/dark theme preview** built from the
extracted palette, and an explicit **Apply to Live Theme** action that
persists through the **existing** brand-update API (`PUT /api/brands/:id`,
fields `logoUrl` + `primaryColor` — both fields already exist in the schema,
the API contract, and the update payload type).

A shared **BrandLogo** component now renders the logo (with the previous
letter-chip as fallback) in the Header brand button, the header brand-switcher
dropdown, the Brands table, and the Brand Selection (BrandCard) page.

No backend, database, API-contract, auth, tenant-authorization, accounting, or
inventory code was modified.

## Logo Sources

* **URL** — a `Logo URL` field + `Preview` button. Validation (§4/§16):
  http(s)/data-image URLs only; rejects javascript:, ftp:, file: schemes;
  rejects obvious document URLs (`.pdf`, `.docx`, `.zip`, …) with a clear
  message; rejects URLs > 2048 chars; extensionless CDN URLs are allowed
  (many CDNs serve images without extensions).
* **Local upload** — file picker (PNG/JPG/WEBP/GIF/AVIF; SVG rejected for
  uploads to avoid unsafe SVG processing; 2 MB cap). Loaded via
  `URL.createObjectURL`, with `revokeObjectURL` on replace/unmount (no leaks).
* **Persistence status**
  * Logo URL → **persists** via the existing API (verified end-to-end live:
    value round-tripped through `PUT /api/brands/:id` and `/api/auth/me`).
  * Local file upload → **preview-only**. There is no existing upload
    endpoint or storage mechanism to persist a local image.
    `BACKEND CAPABILITY GAP — UI-ONLY TASK — NOT MODIFIED`. Apply on a
    file-based source persists only the *extracted colors* (existing
    `primaryColor` field) and states this explicitly in the success message.

## Color Extraction

`src/ui/lib/brandTheme.ts` — pure browser APIs, no new dependencies.

1. Image loaded into an offscreen canvas, downsampled so max(width, height) ≤
   512 (§26 performance cap; large photos don't stall the UI).
2. **Fixed 48×48 sampling grid** — the basis of determinism (not random
   pixel picks). Same image + same browser → same palette.
3. Pixel filtering: alpha < 200 excluded (transparent), luminance > 242
   excluded (near-white backgrounds), luminance < 18 excluded (near-black).
4. 15-bit RGB quantization into bins; each bin keeps averaged color + count
   (noise averaging, not first-pixel selection).
5. Ranking score = frequency × (0.5 + saturation) × lightness penalty —
   saturated, mid-lightness dominant colors win over background washes.
6. Grayscale-only logos (top bin saturation < 0.12) → extraction declines and
   the existing theme stays (fallback, §19).

CORS handling: `crossOrigin='anonymous'` + try/catch around `getImageData`;
tainted-canvas (cross-origin without CORS headers) produces a clear message
instead of a crash, and local uploads (object URLs) always extract.

## Theme Generation

* **Primary** = dominant hue clamped to lightness 0.30–0.42, then iteratively
  darkened until **white text reaches ≥ 4.5:1 WCAG AA contrast**; if the hue
  can't get there (e.g. yellow), the loop stops at L 0.18 and `contrastText`
  flips to black (verified by test for hue 55°).
* **Secondary** = a genuinely different companion hue sampled from the logo
  when one exists (circular hue distance > 50°), else an analogous fallback.
* **Accent (dark mode)** = dominant hue at L 0.62 — bright enough on dark
  surfaces, visibly the same brand hue (not an inversion of light mode).
* **Surface tint** = near-white (L 0.96) desaturated wash for light branded
  surfaces; a test asserts luminance > 0.85.
* **Fallback chain** (§19/§25): invalid URL → alert, no state change; broken
  image → clear error message, no crash; monochrome/no-color logo → logo
  previews fine but theme unchanged; extraction exception → message + existing
  theme retained. `applyBrandTheme` (existing) clears its override when the
  color is achromatic, falling back to app defaults — no undefined CSS
  variables, no transparent buttons at any point.
* **Manual override remains authoritative** (§20): the generated primary is
  written through the same `primaryColor` field the manual color pickers use.
  The user opts out of color application via checkbox and can restore any
  color in the existing pickers. Nothing is applied without an explicit
  "Apply to Live Theme" click.

## Brand Button

The Header brand button now shows `[logo] Brand Name` via the shared
`BrandLogo` component (image with `object-fit: contain`, fixed 32px box,
transparent PNGs rendered over the brand color). With no logo the exact
previous letter chip renders — verified live both ways (§12/§35).

## Brand Selection

`BrandCard` (brand selection grid) renders the brand logo via the same
component when `logoUrl` is set; letter chip otherwise. Verified live: only
the brand with a logo showed the image. No redesign of the page (§13).

## Header / Sidebar

* Header: brand button + switcher dropdown entries show logos (28px in the
  dropdown). Navigation, user menu, theme controls, demo badge, and
  brand-switch behavior untouched.
* Sidebar: inspected — it renders **only module navigation** and contains no
  brand identity element (§15 "where currently displayed" condition). No
  changes; adding one would be new design, not polish.

## Multi-Brand

Isolation is inherent in the architecture: logo + accent are per-tenant
columns applied from the auth context of the active brand
(`applyBrandTheme(tenant)` in ProtectedRoute re-runs on brand switch, and
Header re-renders from `authContext.tenant`). Verified live: after applying
the test theme to Test12, System Administration's record retained its own
color (`#6366f1`) — no cross-brand leak. The live switch test was limited to
one authorized brand for this admin user (single-brand session in the real
data) — the switch path itself is untouched code (`switchTenant` →
`refreshAuth` → reload), and the isolation property was verified at the data
level. `NOT MANUALLY VERIFIED` for a full A→B→A visual switch due to having
only one authorized brand in this environment.

## Responsive

* Studio grids use `repeat(auto-fit, minmax(...))` so inputs/preview/palette/
  theme cards stack fluidly below ~640px; logo box is width-based (`height:
  96px`, `object-fit: contain`).
* Action buttons set to 44px height (touch target, §23).
* Live-verified pages used the preview environment's actual viewport with
  fluid-width probes (0 page overflow observed at all probed widths). Exact
  320/375/480/768/1024/1440 device-viewport sweeps: **NOT MANUALLY VERIFIED —
  ENVIRONMENT LIMITATION** (same limitation as prior UI steps: popup/device
  emulation unavailable in the preview harness).

## Accessibility

* Inputs: `<label htmlFor>` for Logo URL; file input has an explicit
  `aria-label` and a visually-hidden native input with a labeled trigger.
* Status/announcements: `role="alert"` for validation/load errors,
  `role="status"` for analysis/save messages (screen-reader friendly, §24).
* Keyboard: URL input → Preview button are native form controls; studio
  action buttons are native `<button>`s (Enter/Space activate); live
  keyboard checks (Enter on brand card, form submit) performed.
* Contrast: white-on-primary guaranteed ≥ 4.5:1 by the generation loop
  (unit-tested across five hues); focus visuals inherited from the app's
  existing focus-visible system.
* No `@ts-ignore` / `@ts-expect-error` anywhere.

## Testing

`src/ui/lib/brandTheme.test.ts` — 16 tests, all passing:

* URL validation: https accepted, extensionless accepted, data URLs accepted,
  empty rejected, `javascript:`/`ftp:`/`file:` rejected, `.pdf` rejected with
  reason, overlong rejected. (Test 1/2 subset)
* Determinism: identical inputs → identical palette. (Test 4)
* Contrast: white-vs-black = 21:1; WCAG anchor luminances; primary vs white
  ≥ 4.5:1 across blue/red/green/yellow/purple; yellow case flips contrast
  text to black with ≥ 4.5:1 against its own primary. (Tests 7)
* Dark accent lighter than primary; surface tint near-white; companion-hue
  selection and analogous fallback verified. (Tests 5/6/13)

Canvas/DOM extraction, preview rendering, brand-switch visuals, and
responsive layout were verified manually in the live app (below) rather than
unit tests — the project's vitest setup is node-environment and has no
component-testing library (verified before writing tests; adding jsdom/
testing-library was avoided per §18 "do not over-engineer"/no unnecessary
dependencies).

## TypeScript

PASS — `npx tsc --noEmit` (root, exit 0) and `npx tsc -p tsconfig.server.json
--noEmit` (exit 0).

## Build

PASS — `npm run build` ✓ (9.02s; only the pre-existing >500 kB chunk warning).

## Files Modified

| File | Reason | Change |
| ---- | ------ | ------ |
| `src/ui/components/layout/Header.tsx` | §12/§14 | Brand button + switcher use shared `BrandLogo`; removed the two inline letter-chip blocks |
| `src/ui/components/BrandCard.tsx` | §13 | Renders logo via `BrandLogo` when available |
| `src/ui/pages/Brands.tsx` | §4 | Brands table chips use `BrandLogo`; Edit modal gains a Logo URL field; Brand Theme Studio embedded below the table |
| `src/ui/components/branding/BrandThemeStudio.tsx` | §4–§12 | (new) logo input/preview/extraction/live theme preview/apply |
| `src/ui/components/BrandLogo.tsx` | §12/§13 | (new) shared logo-with-fallback component |
| `src/ui/lib/brandTheme.ts` | §6–§8 | (new) validation, loader, deterministic extraction, theme generation, contrast math |
| `src/ui/lib/brandTheme.test.ts` | §28 | (new) 16 focused frontend tests |

## Files Created

* `src/ui/components/BrandLogo.tsx`
* `src/ui/components/branding/BrandThemeStudio.tsx`
* `src/ui/lib/brandTheme.ts`
* `src/ui/lib/brandTheme.test.ts`
* `audit/STEP91_BRAND_LOGO_AUTOMATIC_THEME.md` (this report)

## Backend

`NO BACKEND CHANGES` — all persistence uses the existing
`PUT /api/brands/:id` route and existing schema fields (`logo_url`,
`primary_color`), verified live end-to-end. Local image upload has no existing
backend mechanism: `BACKEND CAPABILITY GAP — UI-ONLY TASK — NOT MODIFIED`.

## Database

`NO DATABASE CHANGES` — no SQL, migrations, or schema changes.

## Known Limitations

1. **Local upload persistence** — preview + color extraction only (no
   existing upload endpoint; capability gap documented above). The UI states
   this honestly next to the Apply button and in the success message.
2. **Cross-origin logo extraction** — extraction of a *remote* URL requires
   the host to send CORS headers (same restriction as any canvas-based
   extraction). The UI surfaces a clear message and the logo itself still
   previews/persists. Same-origin and data URLs always work.
3. **SVG width/height-less extraction** — SVGs without intrinsic dimensions
   can preview but not extract; clear message shown. (Existing safe handling;
   no SVG processing was added.)
4. **Full A→B→A brand-switch visuals** — verified at data level + single
   live brand session; see Multi-Brand section.
5. **Exact device viewports** — fluid/overflow probes performed; the fixed
   320–1920 matrix was not directly rendered (environment limitation, same as
   prior steps).
