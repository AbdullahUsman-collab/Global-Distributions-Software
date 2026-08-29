# Step 26 — Finance Mobile Horizontal Overflow Fix

**Status:** COMPLETE  
**Commit:** pending  
**Date:** 2026-08-29

## Summary

Fixed the Finance page horizontal overflow on mobile caused by inline `minWidth` values on tree headers, rows, and child elements. These forced elements wider than the viewport, bypassing the `.table-wrap` scroll containment.

## Root Cause

The Finance page used `minWidth` on multiple flex row elements inside `.table-wrap` containers:

| Element | Line | minWidth | Issue |
|---------|------|----------|-------|
| COA tree header | 297 | 730px | Forces header wider than mobile viewport |
| COA account row | 1204 | 730px | Forces each row wider than viewport |
| Voucher tree header | 474 | 860px | Forces header wider than mobile viewport |
| Voucher row | 550 | 860px | Forces each row wider than viewport |
| Voucher lines header | 588 | 860px | Forces lines wider than viewport |
| Voucher line item row | 605 | 860px | Forces each line wider than viewport |
| Voucher lines footer | 628 | 860px | Forces footer wider than viewport |
| Ledger tree header | 1148 | 620px | Forces header wider than mobile viewport |
| Ledger row | 1158 | 620px | Forces each row wider than viewport |

These `minWidth` values on *child* divs inside `.table-wrap` (which has `overflow-x: auto`) caused the children to expand beyond the container. The browser's overflow scroll only works when the *container* itself is constrained — but the `minWidth` on children forced them to push the container wider.

Additionally, the `.page` container had no `overflow-x: hidden`, so the expanded children propagated upward to cause whole-page horizontal scrolling.

## Fix Applied

### 1. Removed all `minWidth` from Finance table children

**Before:** Tree headers and rows had inline `minWidth: 730/860/620`  
**After:** Tree headers and rows use base `styles.treeHeader` / `styles.voucherRow` / `styles.row` / `styles.lineRow` / `styles.linesFooter` without `minWidth`

This allows the `.table-wrap` container (which already has `overflow-x: auto` on mobile) to be the scroll boundary.

### 2. Added `finance-page` class with mobile overflow control

**File:** `src/ui/styles/global.css`

```css
@media (max-width: 768px) {
  .finance-page {
    overflow-x: hidden !important;
  }
  .finance-page .table-wrap {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }
}
```

This ensures:
- The Finance page itself never scrolls horizontally on mobile
- `.table-wrap` containers provide localized horizontal scrolling for tables
- iOS momentum scrolling is enabled for smooth touch experience

### 3. Applied `finance-page` class to Finance component

```tsx
<div className="page-pad finance-page" style={styles.page}>
```

## Why This Works

**Before fix:**
```
#root → .page-pad → .card (table-wrap, overflow-x: auto)
                         → treeHeader (minWidth: 860) ← EXPANDS BEYOND CARD
                         → voucherRow (minWidth: 860) ← EXPANDS BEYOND CARD
```
The `minWidth` on children forced the card wider, and since `.page-pad` had no overflow constraint, the entire page expanded.

**After fix:**
```
#root → .page-pad.finance-page (overflow-x: hidden)
         → .card.table-wrap (overflow-x: auto on mobile)
              → treeHeader (no minWidth — uses flex column widths)
              → voucherRow (no minWidth — uses flex column widths)
```
The `.table-wrap` container is the scroll boundary. Children use their flex column widths (totalling ~370-460px for fixed columns) and flex columns shrink to fit. On mobile, if total exceeds viewport, `.table-wrap` scrolls horizontally.

## Flex Column Width Analysis (Mobile 320px)

### Ledger Table
- Fixed columns: Date(110) + V#(60) + Type(50) + Debit(100) + Credit(100) + Balance(100) = 520px
- Flexible: Narration (flex: 1) — shrinks to fit
- With 16px page padding: available = 288px → horizontal scroll within `.table-wrap`

### COA Table
- Fixed columns: Toggle(40) + Code(80) + Level(100) + Type(120) + Balance(70) + Status(70) + Actions(80) = 560px
- Flexible: Account Name (flex: 1) — shrinks to fit
- Horizontal scroll within `.table-wrap`

### Voucher Table
- Fixed columns: #(60) + Type(110) + Date(110) + Debit(100) + Credit(100) + Status(80) + Actions(100) = 660px
- Flexible: Narration (flex: 1) — shrinks to fit
- Horizontal scroll within `.table-wrap`

## Desktop Verification

At 1024px+, `.table-wrap` has `overflow-x: visible` (from global.css responsive rule), so tables expand naturally without scroll. The removal of `minWidth` does not damage desktop layout because:

1. Fixed flex columns (e.g., `flex: '0 0 110px'`) still maintain their specified widths
2. Flexible columns (`flex: '1'`) expand to fill available space
3. No content is clipped — all data is visible

## Files Modified

### `src/ui/pages/Finance.tsx`
- Added `finance-page` className to main page div
- Removed `minWidth` from 9 inline styles (COA header, COA row, voucher header, voucher row, lines header, line row, lines footer, ledger header, ledger row)

### `src/ui/styles/global.css`
- Added `.finance-page` responsive CSS rules for mobile overflow control

## Verification

- [x] TypeScript clean (0 errors)
- [x] 210/210 tests pass (13 test files)
- [x] Build passes (594 kB)
- [x] No `body { overflow-x: hidden }` workaround used
- [x] Root cause documented
- [x] Desktop layout preserved
- [x] Localized table scrolling via `.table-wrap`
- [x] All Finance functionality intact (COA, Vouchers, Ledger, Reports)

## Browser Compatibility

- **Chrome/Edge:** `overflow-x: auto` + `-webkit-overflow-scrolling: touch` — smooth scroll
- **Firefox:** `overflow-x: auto` + `scrollbar-width: none` (from global.css) — smooth scroll, hidden scrollbar
- **Safari/iOS:** `-webkit-overflow-scrolling: touch` enables momentum scrolling; `overflow-x: hidden` on `.finance-page` prevents page-level scroll
- **Mobile Chrome/Safari:** Touch scrolling works within `.table-wrap` containers
