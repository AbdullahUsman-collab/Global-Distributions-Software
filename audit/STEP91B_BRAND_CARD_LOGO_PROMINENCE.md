# STEP 91B — BRAND CARD LOGO PROMINENCE FIX

UI-only correction on top of Step 91A. No backend, database, API, auth, RBAC,
tenant, accounting, inventory, or reporting changes.

## Summary

Step 91A made the brand-selection card carry the brand's full-card identity,
but presented the logo as a faint background watermark (`opacity: 0.14`),
which read as a dull secondary element rather than the brand's primary
identity. Step 91B promotes the logo to a **prominent foreground element**:
a large, centered, full-opacity presentation tile in the card content flow,
placed above the brand name — without removing the 91A brand-gradient
background or changing any interaction behavior.

## Original Problem

- Logo rendered as an absolute-positioned watermark at `opacity: 0.14`
  behind the card content.
- Visually faint, low-contrast, secondary — the opposite of a brand
  identity element.

## New Foreground Behavior

- Logo lives in the normal content flow (first child of the card): a
  `brand-card-logo-tile` presentation surface — `min(72%, 240px)` wide ×
  108px tall, rounded 14px, subtle shadow, brand-colored border on
  hover/focus.
- Tile interior is `var(--surface)` with the existing studio `logoBox`
  checkerboard pattern (transparent-PNG affordance), guaranteeing contrast
  for white, dark, transparent, and colorful logos in both themes.
- Logo renders at **full opacity** (`opacity: 1`), `object-fit: contain`,
  never stretched, never cropped, centered.
- Hierarchy: **logo tile → brand name → "Click to sign in"**.
- Card keeps the 91A brand-gradient wash (`tenant.primaryColor` →
  safe-hex-validated, `var(--accent)` fallback), hover glow, brand border,
  and 1.02 scale interaction.
- Brands without a logo (or broken logo URL) fall back to the existing
  Step-91 `BrandLogo` letter chip, enlarged to the same prominent scale
  (64px chip) inside the same tile — no blank or broken cards.
- Min card height raised 210px → 250px to give the prominent logo room.

## Exact Files Changed

| File | Change |
| ---- | ------ |
| `src/ui/components/BrandCard.tsx` | Logo watermark removed; prominent foreground tile added; letter-chip fallback enlarged; min-height 250px |
| `src/ui/styles/global.css` | Mobile rules: tile 76px height, fallback chip 40px; removed stale watermark-letter rule |

## Reuse (no new systems)

Reused existing `BrandLogo` component (fallback), existing Step-91 extracted
brand color (`tenant.primaryColor`), existing studio `logoBox` contrast
pattern, existing `brand-card-responsive` hooks. No new logo component, no
new color extraction, no new theme engine, no new branding data source.

## Multi-Brand

Card identity is derived per-tenant at render time (verified live:
System Administration renders its purple letter chip; Test12 renders its
mothercare logo image). Nothing is hardcoded to any brand.

## Responsive Verification

- Directly rendered: 440px viewport (default preview) — tile occupies ~59%
  of card width, full opacity, title below tile, **zero page-level
  horizontal overflow**.
- DOM/CSS verified: mobile ≤480px media block reduces the tile to 76px and
  scales the fallback chip — the logo shrinks proportionally, never hides.
- 320/375/480/768/1024/1440 physical device rendering:
  NOT DIRECTLY VERIFIED — ENVIRONMENT LIMITATION (fluid layout + media
  blocks verified via DOM/CSS instead).

## Accessibility

- Card remains the single interactive element (`role="button"`,
  `tabIndex={0}`, `aria-label="Select <brand>"`) — the logo is decorative
  (`alt=""`), no nested interactive controls.
- Enter-key activation verified live: navigates to `/login/apex-trading`.
- Focus indicator verified live: brand-colored border + 1.02 scale on
  `focusin`.
- Click-to-sign-in verified live via real pointer click.
- Brand name/subtitle use `--text-primary`/`--text-muted` tokens over the
  surface tile — contrast preserved in both themes.

## Light / Dark Verification

- Light: white surface tile + checkerboard, dark slate title, logo
  full-opacity (directly rendered + computed-style verified).
- Dark: slate `#0f172a` tile, light `#f1f5f9` title, logo full-opacity
  (directly rendered + computed-style verified + screenshot).
- The foreground logo is identical in both themes — dark mode cannot turn
  it back into a watermark.

## TypeScript / Build / Tests

- `npx tsc --noEmit`: PASS (exit 0)
- `npx tsc -p tsconfig.server.json --noEmit`: PASS (exit 0)
- `npm run build`: PASS (✓ built in 6.77s)
- Step 91 tests (`src/ui/lib/brandTheme.test.ts`): 16/16 PASS
- Full suite: 974 passed / 61 failed / 10 skipped. All 61 failures are
  server-side DB-integration classes (Step81/Step82/Step85/SalesWorkflow/
  RBAC/DatabaseIntegration). Baseline before this session was 969/66/10;
  the shift is attributable to concurrent backend commits (`9d49f25`
  BillsListService fix, `a3b958c` code splitting) — this diff touches only
  `BrandCard.tsx` and `global.css`, which no server test imports. No UI
  test failures.

## Remaining Limitations

- Physical device viewports and non-Chromium browsers: NOT DIRECTLY
  VERIFIED — ENVIRONMENT LIMITATION.
- Local logo upload remains preview-only (Step 91 capability gap,
  unchanged).
