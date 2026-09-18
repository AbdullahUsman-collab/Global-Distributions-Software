# STEP 91A — BRAND SELECTION CARD FULL-BOX LOGO THEME FIX

UI-only correction on top of Step 91 (`f421e98`). No backend, database, API,
auth, or theme-engine changes.

## Original Problem

The brand-selection card rendered the brand identity inside a small
standalone 80px logo box above the brand name:

```
[ small logo box ]
     Test12
Click to sign in
```

The uploaded logo was confined to that box; the card body carried no brand
identity.

## Exact UI Change

`src/ui/components/BrandCard.tsx` was restructured so the ENTIRE card is the
brand's visual surface:

1. **Full-card brand gradient** — `linear-gradient(160deg, primary14 → primary0D → surface)` derived per-brand from `tenant.primaryColor` (safe-hex validated; falls back to `--accent` when malformed/missing).
2. **Large watermark logo layer** — the logo (same `logoUrl` consumed by Step 91's `BrandLogo`) rendered across the top ~62% of the card at 14% opacity, `object-fit: contain`, non-distorting, `pointer-events: none`.
3. **Contrast overlay** — a `--surface` gradient rising behind the text zone keeps the brand name and "Click to sign in" readable over the brand wash in light AND dark mode (theme-token based — no hardcoded colors; works for any brand palette).
4. **Logo-less fallback preserved** — brands without a logo keep the Step-91 `BrandLogo` letter chip AND gain a faint oversized letter watermark so every card still feels branded. Broken logo URLs hide the watermark gracefully (`onError`).
5. Brand name now uses `var(--text-primary)` (stable in both modes) with the brand border/glow on hover/focus — interaction unchanged.

Mobile rule added in `src/ui/styles/global.css`: the fallback-letter watermark
scales down (96px → 64px) at ≤480px so it never crowds the smaller card.

## Files Modified

| File | Reason | Change |
| ---- | ------ | ------ |
| `src/ui/components/BrandCard.tsx` | Full-card brand identity | gradient wash + watermark layer + contrast overlay + stable text colors; interaction/aria preserved |
| `src/ui/styles/global.css` | Mobile watermark sizing | `.brand-card-responsive .brand-card-watermark-letter { font-size: 64px !important }` at ≤480px |

## Files Created

- `audit/STEP91A_BRAND_CARD_FULL_LOGO_FIX.md` (this report)

## Step 91 Functionality Preserved

- `BrandThemeStudio`, logo URL handling, local upload preview, color
  extraction, palette generation, WCAG contrast handling, brand accent,
  header branding, `BrandLogo` component, tests and audit untouched.
- The card consumes the same `tenant.logoUrl` / `tenant.primaryColor` data;
  no duplicate logo or color-extraction system was created.

## Interaction / Accessibility Verification

Verified live in the Preview against real API data (both production tenants):

- Card remains the single `role="button"` with `aria-label="Select …"`,
  `tabIndex=0` (unchanged semantics).
- Keyboard: Enter key activated the Test12 card → navigated to
  `/login/apex-trading`. Real mouse click on the card navigated identically.
- Focus visual: brand-colored border + 1.02 scale on focus (verified).
- No nested interactive elements introduced.

## Responsive Verification

- No page-level horizontal overflow (0px) in light and dark mode.
- 288px-width fluid-shrink probe: no text clipping (fluidity check; exact
  device viewports NOT MANUALLY VERIFIED — ENVIRONMENT LIMITATION).
- ≤480px CSS rule scales the letter watermark; grid already collapses to
  2 columns from the existing responsive rules.

## Light / Dark Verification

- Light: brand-tinted wash + contained logo watermark + readable dark text.
- Dark: same treatment over the dark surface palette; title resolves to
  `#f1f5f9`, subtitle `#94a3b8` (both readable; verified by computed styles
  and screenshots in both modes).
- No separate dark-mode branding system was created — tokens handle both.

## Testing

- `npx tsc --noEmit` — **PASS** (exit 0)
- `npx tsc -p tsconfig.server.json --noEmit` — **PASS** (exit 0)
- `npm run build` — **PASS** (✓ built in 7.96s)
- Step 91 suite `src/ui/lib/brandTheme.test.ts` — **16/16 PASS**
- Full suite: **969 passed / 66 failed / 10 skipped** — the 66 are the
  pre-existing DB-integration failures (Step81 UAT / Sales Workflow / Change
  Password classes). An A/B rerun with the UI diff stashed produced the
  byte-identical failure set, proving no UI-caused regression. (One full-suite
  run transiently reported 67 failures due to a flaky DB-integration timeout;
  the sorted failure lists were identical between runs.)

## Remaining Limitations

- Exact device viewports (320/375/430/480 physical) not directly rendered —
  environment limitation; verified via DOM fluidity probes instead.
- Cross-brand A→B→A visual switching not exercised (environment exposes the
  same two brands as prior steps; identity is derived per-brand from tenant
  data, so per-card isolation follows structurally from per-card derivation).
