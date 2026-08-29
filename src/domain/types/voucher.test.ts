import { describe, it, expect } from 'vitest';
import { totalDebit, totalCredit, isBalanced } from './voucher';

describe('totalDebit', () => {
  it('sums all debit amounts', () => {
    expect(totalDebit([{ debit: 100 }, { debit: 200 }, { debit: 300 }])).toBe(600);
  });

  it('returns 0 for empty array', () => {
    expect(totalDebit([])).toBe(0);
  });

  it('handles zero debits', () => {
    expect(totalDebit([{ debit: 0 }, { debit: 0 }])).toBe(0);
  });
});

describe('totalCredit', () => {
  it('sums all credit amounts', () => {
    expect(totalCredit([{ credit: 50 }, { credit: 150 }, { credit: 250 }])).toBe(450);
  });

  it('returns 0 for empty array', () => {
    expect(totalCredit([])).toBe(0);
  });
});

describe('isBalanced', () => {
  it('returns true when debits equal credits', () => {
    expect(isBalanced([{ debit: 100, credit: 50 }, { debit: 50, credit: 100 }])).toBe(true);
  });

  it('returns false when debits do not equal credits', () => {
    expect(isBalanced([{ debit: 100, credit: 0 }, { debit: 0, credit: 50 }])).toBe(false);
  });

  it('returns true for empty array', () => {
    expect(isBalanced([])).toBe(true);
  });

  it('returns true for balanced single line', () => {
    expect(isBalanced([{ debit: 500, credit: 500 }])).toBe(true);
  });

  it('handles floating point precision', () => {
    expect(isBalanced([{ debit: 100.30, credit: 100.30 }])).toBe(true);
  });
});
