# STEP 91C — BRAND CARD FULL-SURFACE LOGO

UI-only correction on top of Step 91B (`88c0620`). No backend, database, API,
auth, RBAC, tenant, accounting, inventory, or reporting changes.

## Summary

Step 91B promoted the brand logo to the foreground but wrapped it in a
presentation tile that reused the studio's `logoBox` checkerboard pattern.
In rendered output the checkerboard read as a transparency-visualization
artifact and the framed tile made the logo look like a boxed avatar rather
than the brand's identity. Step 91C removes the tile concept entirely: the
logo now renders as a large, centered, full-opacity image **directly on the
brand card surface**, with transparent logo areas showing the brand gradient
through.

## Why 91B Was Insufficient

- The tile created a visible framed rectangle around the logo (avatar-like).
- Its checkerboard background is an editor-style transparency visualization
  that must never be shown to end users.
- The result contradicted the intent: "card = brand surface, logo = large
  foreground identity," not "card contains a logo icon."

## What Changed

- **Tile removed** — no `brand-card-logo-tile`, no checkerboard, no frame,
  no border, no background box of any kind around the logo.
- Logo is a normal foreground content element (first child): width
  `min(80%, 260px)`, `max-height: 118px`, `object-fit: contain`, full
  opacity, centered — no distortion, no cropping, transparency preserved.
- Card background strengthened slightly (`2E`/`14` alpha stops, up from
  `24`/`0D`) so the brand surface gives the logo a clear stage.
- Fallback (no logo / broken URL): existing Step-91 `BrandLogo` letter chip,
  enlarged to 72px to match the logo's visual weight — no broken image icon,
  no empty box.
- Mobile (≤480px): logo scales to 88% width / 84px max-height; fallback chip
  scales proportionally — the logo never disappears on narrow screens.
- Stale `.brand-card-watermark-letter` mobile rule removed (91B leftover).

## Files Modified

| File | Change |
| ---- | ------ |
| `src/ui/components/BrandCard.tsx` | Tile/checkerboard removed; logo rendered directly on card surface; alpha stops strengthened; fallback chip enlarged |
| `src/ui/styles/global.css` | Mobile rules for the new `.brand-card-logo`; stale watermark-letter rule removed |

Reused unchanged: `BrandLogo` (fallback), `brandTheme.ts` engine, Step-91
studio, extracted brand color (`tenant.primaryColor`), all theme tokens.

## Live Verification (rendered, real data)

- Test12 card: mothercare logo direct on teal brand surface — screenshot
  verified; **no checkerboard, no tile, no frame** (DOM confirmed:
  `hasOldTile: false`, `hasCheckerboard: false`, no borders on the img).
- Full opacity (`opacity: 1`), contain-fit, complete load, 64% of card
  width at the probed narrow card (rises toward 80% on wider cards via the
  responsive `min()`).
- Brand gradient present on both cards in both themes.
- Brand name + "Click to sign in" readable below the logo (light `#0f172a`,
  dark `#f1f5f9` titles).
- Enter key activates → `/login/apex-trading` (verified live).
- Zero page-level horizontal overflow in light and dark.
- System Administration card renders its enlarged letter chip — multi-brand
  derivation confirmed dynamic.

## Responsive

- Directly rendered: 440px default preview width, zero overflow.
- DOM/CSS verified: ≤480px media block scales logo/chip proportionally.
- 320/375/480/768/1024/1440 physical device rendering:
  NOT DIRECTLY VERIFIED — ENVIRONMENT LIMITATION.

## Accessibility

- Card remains the single interactive element (`role="button"`,
  `tabIndex={0}`, `aria-label`); logo is decorative (`alt=""`); no nested
  interactive controls.
- Keyboard activation and focus/hover behavior unchanged and verified.
- Text contrast preserved via `--text-primary`/`--text-muted` tokens.

## Light / Dark

- Light: logo direct on light brand surface (screenshot verified).
- Dark: logo direct on dark brand surface (screenshot verified).
- No separate dark-mode branding logic; theme tokens handle both.

## TypeScript / Build / Tests

- `npx tsc --noEmit`: PASS (exit 0)
- `npm run build`: PASS (✓ built in 6.83s)
- Step 91 tests: 16/16 PASS
- Full-suite failure count unchanged from the Step 91B session
  (61 pre-existing server-side DB-integration failures; this diff touches
  only `BrandCard.tsx` and `global.css`).

## Remaining Limitations

- Physical device viewports and non-Chromium browsers: NOT DIRECTLY
  VERIFIED — ENVIRONMENT LIMITATION.
- Local logo upload remains preview-only (Step 91 capability gap,
  unchanged).
- Logo contrast relies on the brand-surface alpha wash; extremely pale
  logos on near-white gradients could still be soft — mitigated by the
  strengthened gradient stops, but not guaranteed for arbitrary artwork.
