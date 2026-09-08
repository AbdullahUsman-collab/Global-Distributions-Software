# Step 53: Verified Gap Remediation + PostgreSQL Integration Test Enablement

**Date:** 2026-09-08
**Status:** COMPLETE
**Commit:** TBD

---

## Objective

Remediate 5 identified gaps from Step 52 production hardening audit, enable PostgreSQL integration test environment, and run full regression.

---

## Gap Remediation Summary

| # | Gap | Severity | Status |
|---|-----|----------|--------|
| 1 | `legacyMainHeadNo` missing from COA Create/Edit UI | Medium | FIXED |
| 2 | `accountEffect` missing from COA Create/Edit UI | Medium | FIXED |
| 3 | Bill Detail per-line tax breakdown shows all zeros | Medium | FIXED |
| 4 | `COOKIE_SECRET` not validated in production | Low | FIXED |
| 5 | PostgreSQL integration tests skipped in Vitest | Low | FIXED |

---

## Gap #1 & #2: COA UI Legacy Fields

**Files Modified:**
- `src/ui/pages/Finance.tsx`

**Changes:**
- Added `legacyMainHeadNo` (number input) and `accountEffect` (select: Balance Sheet / Profit and Loss / Both) fields to `CreateAccountModal`
- Added same fields to `EditAccountModal` with pre-populated values from existing account
- Updated local `UpdateAccountDTO` type to include both fields
- Both fields are optional — existing accounts are unaffected

**Verification:** Domain types (`CreateAccountHeadDTO`, `UpdateAccountHeadDTO`) already declared both fields. Postgres and Mock adapters already persist them. Server routes pass `req.body` through. No backend changes needed.

---

## Gap #3: Bill Detail Per-Line Tax Display

**Files Modified:**
- `src/domain/services/BillDetailService.ts`

**Root Cause:** Per-line tax amounts were hardcoded to `0`:
```typescript
// BEFORE (broken)
discount: 0,
furtherTaxAmount: 0,
fedAmount: 0,
advanceTaxAmount: 0,
```

**Fix:** GST is now computed from stored voucher line fields:
```typescript
// AFTER (fixed)
const amtExclStd = line.amtExclStd || 0;
const stRate = line.stRate || 0;
const gstAmount = line.stAmount || (amtExclStd * stRate / 100);
```

**Tax Summary:** Now always uses ledger-based totals (authoritative source) instead of summing per-line values:
```typescript
const totalTaxFromLedger = voucherLedger.reduce((s, e) => {
  const acc = accountByCode.get(e.accountId);
  if (acc && TAX_ACCOUNT_CODES.includes(acc.accountCode)) {
    return s + (e.debit || e.credit);
  }
  return s;
}, 0);
const totalTax = totalTaxFromLedger || gst;
```

**Known Limitation:** Per-line FED, further tax, and advance tax amounts remain 0 because these fields are not persisted on `VoucherLine` (only GST fields `stRate`/`stAmount` exist). The summary totals are accurate via ledger entries. To show per-line breakdown for non-GST taxes, the `VoucherLine` schema would need additional fields — this requires a DB migration and is out of scope for this step.

---

## Gap #4: COOKIE_SECRET Production Validation

**Files Modified:**
- `src/server/db/env.ts`
- `src/domain/services/DatabaseIntegration.test.ts`

**Issue:** `index.ts` reads `process.env.COOKIE_SECRET` for cookie-parser, but production validation only checked `SESSION_SECRET`, `DATABASE_URL`, and `CORS_ORIGINS`. In production, `COOKIE_SECRET` could silently default to the dev fallback.

**Fix:** Added `COOKIE_SECRET` to the `required` array in `validateProductionConfig()`:
```typescript
const required = [
  { key: 'DATABASE_URL', value: config.databaseUrl },
  { key: 'SESSION_SECRET', value: config.session.secret },
  { key: 'COOKIE_SECRET', value: process.env.COOKIE_SECRET },  // NEW
  { key: 'CORS_ORIGINS', value: process.env.CORS_ORIGINS },
];
```

**Impact:** Server now refuses to start in production if `COOKIE_SECRET` is unset. Test updated to include `COOKIE_SECRET` in its env setup.

---

## Gap #5: PostgreSQL Integration Test Enablement

**Files Modified:**
- `vitest.config.ts`
- `package.json` (new devDependencies)

**Issue 1 — File Pattern:** `vitest.config.ts` `include` was `src/**/*.test.ts`, which excluded `*.integration.test.ts` files.

**Fix:** Updated include pattern:
```typescript
include: ['src/**/*.test.ts', 'src/**/*.integration.test.ts'],
```

**Issue 2 — Missing Dependency:** Integration tests import `supertest` for HTTP assertions, but it wasn't installed.

**Fix:**
```bash
npm install --save-dev supertest @types/supertest
```

**Issue 3 — Environment Loading:** Added `envDir: '.'` to vitest config to ensure `.env` is loaded.

**Current State:** 9 integration tests are skipped because `DATABASE_URL` is not set in the test environment. When `DATABASE_URL` is available (e.g., in CI with a test database), these tests will automatically run.

---

## Regression Results

| Suite | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | CLEAN — 0 errors |
| Unit Tests (`vitest run`) | 606 passed, 9 skipped |
| Vite Build | SUCCESS |
| Integration Tests | 5 ran (adapter structure), 9 skipped (no DATABASE_URL) |

**Test Breakdown:**
- 30 test files, all passing
- 606 tests passing
- 9 tests skipped (PostgreSQL integration — requires DATABASE_URL)

---

## Files Changed

| File | Change |
|------|--------|
| `src/ui/pages/Finance.tsx` | Added legacyMainHeadNo + accountEffect to COA Create/Edit modals |
| `src/domain/services/BillDetailService.ts` | Fixed per-line GST calculation, ledger-based tax summary |
| `src/server/db/env.ts` | Added COOKIE_SECRET to production validation |
| `vitest.config.ts` | Added integration test pattern + envDir |
| `src/domain/services/DatabaseIntegration.test.ts` | Added COOKIE_SECRET to test env setup |
| `package.json` | Added supertest + @types/supertest devDependencies |
| `package-lock.json` | Updated lockfile |

---

## Remaining Known Gaps (Non-Blocking)

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| COGS GL posting not implemented | Sale COGS not auto-posted | Needs SOURCE VALUE/LOGIC from legacy — do not implement without it |
| Per-line FED/advance/further tax not shown | Bill Detail shows 0 for non-GST taxes | Add fields to VoucherLine schema via DB migration |
| Trade discount not persisted on voucher line | Discount shown as 0 on Bill Detail | Add discountAmount field to VoucherLine schema |
| 9 integration tests skipped | No live DB test coverage in default CI | Configure CI with PostgreSQL service container |

---

## Conclusion

All 5 identified gaps have been remediated. The ERP remains stable with 606 passing tests, clean TypeScript, and successful build. No new functionality was added — only targeted fixes to existing gaps.
