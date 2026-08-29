# Step 25 — Print, PDF & Export System

**Status:** COMPLETE  
**Commit:** pending  
**Date:** 2026-08-29

## Summary

Implemented a centralized print, CSV export, and PDF-ready export system across the ERP. Browser-native `window.print()` handles PDF output via the browser's built-in PDF printer — no third-party libraries needed.

## Files Created

### `src/ui/utils/export.ts`
Reusable export utilities:
- `escapeCsvField()` — RFC 4180 CSV escaping (commas, quotes, newlines)
- `generateCsv()` — Full CSV with UTF-8 BOM for Excel
- `downloadFile()` / `downloadBinary()` — Trigger browser file download
- `sanitizeFilename()` — Strip unsafe chars, normalize, truncate
- `generateExportFilename()` — Dated filenames (`Sales-Invoice-2026-08-29.csv`)
- `printWindow()` / `printElement()` — Wrapper for `window.print()`
- `formatCsvNumber()` — Consistent 2-decimal rounding
- `formatExportDate()` — `YYYY-MM-DD` date formatting

### `src/ui/utils/export.test.ts`
26 unit tests covering CSV escaping, generation, filename sanitization, formatting.

## Files Modified

### `src/ui/styles/global.css`
- Global `@media print` rules: hides nav/sidebar/controls, forces table readability
- `print-color-adjust: exact` for preserving colors
- `page-break-inside: avoid` on table rows
- `.print-only` / `.no-print` utility classes

### `src/ui/pages/BillDetail.tsx`
- **Print button** → `printWindow()` (hides UI chrome via `@media print`)
- **Export CSV button** → Downloads line items + tax summary CSV
- Buttons placed in header bar next to navigation

### `src/ui/pages/BillsList.tsx`
- **Print button** → Prints filtered bill register
- **Export CSV button** → Downloads all visible bills with columns: Voucher #, Type, Date, Party, Items, Total, Status, Narration
- Both respect active filters (type, status, search, date range)
- Disabled when no bills match current filters

### `src/ui/pages/AgingReport.tsx`
- Upgraded `window.print()` → `printWindow()` (consistent)
- **Export CSV button** → Downloads aging with all bucket columns + totals row
- CSV includes: Party, Account Code, Current, 1-30, 31-60, 61-90, 91-120, 120+, Total
- Filename adapts to mode: `Customer-Aging-2026-08-29.csv` or `Supplier-Aging-...`

### `src/ui/pages/Finance.tsx` (LedgerTab)
- **Export CSV button** → Downloads ledger entries for selected account with date range
- **Print button** → Prints ledger view
- Both buttons appear only when ledger is loaded with entries
- Filename: `General-Ledger-11101-2026-08-29.csv`

## Design Decisions

1. **Browser-native PDF** — No jspdf/pdfmake needed. `window.print()` → "Save as PDF" in browser covers 95% of use cases. Client-side library can be added later if programmatic PDF is needed.

2. **CSV with BOM** — UTF-8 BOM prefix ensures Excel correctly reads special characters (Arabic names, etc.)

3. **Respect active filters** — CSV exports and print outputs reflect whatever filters the user has applied, not the full unfiltered dataset.

4. **Centralized utilities** — All export logic in `src/ui/utils/export.ts` for reuse across modules.

## Test Results

- **210/210 tests pass** (13 test files)
- TypeScript: clean
- Build: pass
- New test file: `src/ui/utils/export.test.ts` (26 tests)
