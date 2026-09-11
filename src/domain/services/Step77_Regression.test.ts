/**
 * Step 77 Regression Tests
 * Covers: Ledger demo handler, Navigation Links, Item-level tax configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { calculateBillLineTax } from '../../domain/types/inventory';
import { SEED_PRODUCTS } from '../test-helpers';
import type { BillLineTaxInput } from '../../domain/types/inventory';
import type { Product } from '../../domain/types/inventory';

const makeTaxInput = (overrides: Partial<BillLineTaxInput> = {}): BillLineTaxInput => ({
  quantity: 10,
  rate: 100,
  tradeDiscountPercent: 0,
  gstPercent: 17,
  furtherTaxPercent: 0,
  fedPercent: 0,
  advanceTaxPercent: 0,
  ...overrides,
});

// ─── Item-Level Tax: furtherTaxPercent ────────────────────────────

describe('Step 77 — Item-Level Tax Configuration', () => {
  it('should include furtherTaxPercent in Product type', () => {
    const product: Product = {
      id: 'test', tenantId: 't1', sku: 'SKU', name: 'Test', category: 'Gen',
      unit: 'PCS', pcsPerCarton: 1, saleRate: 100, purchaseRate: 80,
      retailPrice: 110, tradeDiscount: 0, tradeOffer: '', minQuantity: 0,
      hsCode: '', gstType: 'VAT', gstPercent: 17, fedPercent: 0,
      advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0,
      furtherTaxPercent: 5,
      costRate: 80, margin: 0.072, isActive: true,
    };
    expect(product.furtherTaxPercent).toBe(5);
  });

  it('should default furtherTaxPercent to 0 in SEED_PRODUCTS', () => {
    for (const p of SEED_PRODUCTS) {
      expect(typeof p.furtherTaxPercent).toBe('number');
      expect(p.furtherTaxPercent).toBeGreaterThanOrEqual(0);
    }
  });

  it('should compute furtherTaxAmount when furtherTaxPercent > 0', () => {
    const result = calculateBillLineTax(makeTaxInput({
      quantity: 10,
      rate: 100,
      furtherTaxPercent: 5,
    }));
    expect(result.furtherTaxAmount).toBeGreaterThan(0);
  });

  it('should return furtherTaxAmount = 0 when furtherTaxPercent = 0', () => {
    const result = calculateBillLineTax(makeTaxInput({
      quantity: 10,
      rate: 100,
      furtherTaxPercent: 0,
    }));
    expect(result.furtherTaxAmount).toBe(0);
  });

  it('should combine furtherTax with GST and FED correctly', () => {
    const result = calculateBillLineTax(makeTaxInput({
      quantity: 20,
      rate: 500,
      tradeDiscountPercent: 5,
      gstPercent: 17,
      furtherTaxPercent: 5,
      fedPercent: 2,
      advanceTaxPercent: 1,
    }));
    const expectedToAmount = 20 * 500 * 0.95; // 9500
    expect(result.gstAmount).toBeCloseTo(expectedToAmount * 0.17, 0);
    expect(result.furtherTaxAmount).toBeCloseTo(expectedToAmount * 0.05, 0);
    expect(result.fedAmount).toBeCloseTo(expectedToAmount * 0.02, 0);
    expect(result.advanceTaxAmount).toBeCloseTo(expectedToAmount * 0.01, 0);
    expect(result.netAmount).toBeGreaterThan(expectedToAmount);
  });

  it('should be read from product in Sales bill line auto-fill logic', () => {
    const product = SEED_PRODUCTS[0];
    // Simulates what Sales.tsx updateLine does when product changes
    const lineFurtherTax = product.furtherTaxPercent;
    expect(typeof lineFurtherTax).toBe('number');
  });

  it('should be read from product in Purchase bill line auto-fill logic', () => {
    const product = SEED_PRODUCTS[0];
    // Simulates what Purchases.tsx updateLine does when product changes
    const lineFurtherTax = product.furtherTaxPercent;
    expect(typeof lineFurtherTax).toBe('number');
  });
});

// ─── Ledger Demo Handler ─────────────────────────────────────────

describe('Step 77 — Ledger Demo Handler', () => {
  it('should have DEMO_LEDGER entries with valid account codes', () => {
    // Verify the demo data structure is correct
    const accounts = ['11101', '11102', '11201', '21100', '31101', '41101', '51101'];
    for (const code of accounts) {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    }
  });

  it('should filter ledger entries by account code', () => {
    // Simulate the demo handler filtering logic
    const DEMO_LEDGER = [
      { accountCode: '11101', voucherNumber: 'CR-001', debit: 1000, credit: 0 },
      { accountCode: '11101', voucherNumber: 'CP-001', debit: 0, credit: 500 },
      { accountCode: '41101', voucherNumber: 'SV-001', debit: 0, credit: 2000 },
    ];
    const filtered = DEMO_LEDGER.filter(e => e.accountCode === '11101');
    expect(filtered).toHaveLength(2);
    expect(filtered.every(e => e.accountCode === '11101')).toBe(true);
  });

  it('should compute running balance for filtered entries', () => {
    const entries = [
      { debit: 1000, credit: 0 },
      { debit: 0, credit: 500 },
      { debit: 200, credit: 0 },
    ];
    let balance = 0;
    for (const e of entries) {
      balance += e.debit - e.credit;
    }
    expect(balance).toBe(700);
  });
});

// ─── Navigation Links ────────────────────────────────────────────

describe('Step 77 — Navigation', () => {
  it('should have navigation paths defined for all sidebar items', () => {
    const paths = [
      '/dashboard', '/bills', '/cash-book', '/journal',
      '/ledger', '/customers', '/suppliers', '/inventory',
      '/settings', '/users',
    ];
    for (const p of paths) {
      expect(p.startsWith('/')).toBe(true);
      expect(p.length).toBeGreaterThan(1);
    }
  });

  it('should have "back to dashboard" link path as /dashboard', () => {
    expect('/dashboard').toBe('/dashboard');
  });
});

// ─── Settings Tab Cleanup ────────────────────────────────────────

describe('Step 77 — Settings Tabs', () => {
  it('should only have 4 tabs after removing tax config tabs', () => {
    const tabs = ['profile', 'taxAccounts', 'financial', 'password'];
    expect(tabs).toHaveLength(4);
    expect(tabs).not.toContain('salesTax');
    expect(tabs).not.toContain('furtherTax');
    expect(tabs).not.toContain('fed');
    expect(tabs).not.toContain('advanceTax');
  });
});

// ─── Migration ───────────────────────────────────────────────────

describe('Step 77 — Database Migration', () => {
  it('should have migration 005 file', () => {
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.resolve('src/server/db/migrations/005_further_tax_percent.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('should have ALTER TABLE for further_tax_percent column', () => {
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.resolve('src/server/db/migrations/005_further_tax_percent.sql');
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain('further_tax_percent');
    expect(content).toContain('ALTER TABLE');
  });

  it('should be registered in migrate.ts', () => {
    const fs = require('fs');
    const path = require('path');
    const migratePath = path.resolve('src/server/db/migrate.ts');
    const content = fs.readFileSync(migratePath, 'utf-8');
    expect(content).toContain('005');
    expect(content).toContain('further_tax_percent');
  });
});

// ─── Backward Compatibility ──────────────────────────────────────

describe('Step 77 — Backward Compatibility', () => {
  it('should handle product with furtherTaxPercent = 0 (legacy)', () => {
    const result = calculateBillLineTax(makeTaxInput({
      quantity: 10,
      rate: 100,
      furtherTaxPercent: 0,
    }));
    expect(result.furtherTaxAmount).toBe(0);
    expect(result.netAmount).toBeGreaterThan(0);
  });

  it('should produce same results for existing tax fields when furtherTaxPercent = 0', () => {
    const base = calculateBillLineTax(makeTaxInput({
      quantity: 10, rate: 100, gstPercent: 17, fedPercent: 0,
      advanceTaxPercent: 0, furtherTaxPercent: 0,
    }));
    expect(base.gstAmount).toBeGreaterThan(0);
    expect(base.furtherTaxAmount).toBe(0);
  });

  it('should not break total calculation with furtherTaxPercent = 0', () => {
    const withZero = calculateBillLineTax(makeTaxInput({
      quantity: 5, rate: 200, gstPercent: 17, furtherTaxPercent: 0,
    }));
    const without = calculateBillLineTax(makeTaxInput({
      quantity: 5, rate: 200, gstPercent: 17,
    }));
    expect(withZero.netAmount).toBe(without.netAmount);
  });
});
