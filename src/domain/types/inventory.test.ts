import { describe, it, expect } from 'vitest';
import {
  calculateStockValue,
  calculateAVCO,
  calculateCOGS,
  calculateGrossProfit,
  calculateBillLineTax,
  type BillLineTaxInput,
} from './inventory';

describe('calculateStockValue', () => {
  it('returns quantity * unitCost', () => {
    expect(calculateStockValue(100, 25.5)).toBe(2550);
  });

  it('returns 0 when quantity is 0', () => {
    expect(calculateStockValue(0, 50)).toBe(0);
  });

  it('returns 0 when unitCost is 0', () => {
    expect(calculateStockValue(100, 0)).toBe(0);
  });
});

describe('calculateAVCO', () => {
  it('computes weighted average cost', () => {
    // (10 * 20 + 5 * 30) / (10 + 5) = 350/15 = 23.33...
    expect(calculateAVCO(10, 20, 5, 30)).toBeCloseTo(23.33, 2);
  });

  it('returns 0 when total quantity is 0', () => {
    expect(calculateAVCO(0, 0, 0, 0)).toBe(0);
  });

  it('returns incoming cost when current qty is 0', () => {
    expect(calculateAVCO(0, 0, 10, 25)).toBe(25);
  });

  it('returns existing cost when incoming qty is 0', () => {
    expect(calculateAVCO(10, 20, 0, 0)).toBe(20);
  });
});

describe('calculateCOGS', () => {
  it('returns quantity * costRate', () => {
    expect(calculateCOGS(50, 12.75)).toBe(637.5);
  });

  it('returns 0 when quantity is 0', () => {
    expect(calculateCOGS(0, 100)).toBe(0);
  });
});

describe('calculateGrossProfit', () => {
  it('returns saleAmount - cogs', () => {
    expect(calculateGrossProfit(1000, 600)).toBe(400);
  });

  it('returns negative when cogs exceeds sale amount', () => {
    expect(calculateGrossProfit(500, 700)).toBe(-200);
  });
});

describe('calculateBillLineTax', () => {
  const baseInput: BillLineTaxInput = {
    quantity: 100,
    rate: 10,
    tradeDiscountPercent: 5,
    gstPercent: 18,
    furtherTaxPercent: 0,
    fedPercent: 0,
    advanceTaxPercent: 0,
  };

  it('computes basic amount and discount', () => {
    const result = calculateBillLineTax(baseInput);
    expect(result.amount).toBe(1000);       // 100 * 10
    expect(result.discountAmount).toBe(50); // 1000 * 5%
    expect(result.toAmount).toBe(950);      // 1000 - 50
  });

  it('computes GST on discounted amount', () => {
    const result = calculateBillLineTax(baseInput);
    expect(result.gstAmount).toBe(171);     // 950 * 18%
  });

  it('computes net amount = toAmount + all taxes', () => {
    const result = calculateBillLineTax(baseInput);
    expect(result.netAmount).toBe(1121);    // 950 + 171
  });

  it('computes further tax on discounted amount', () => {
    const input: BillLineTaxInput = {
      ...baseInput,
      furtherTaxPercent: 5,
    };
    const result = calculateBillLineTax(input);
    expect(result.furtherTaxAmount).toBe(47.5); // 950 * 5%
    expect(result.netAmount).toBeCloseTo(1168.5, 1);
  });

  it('computes FED on discounted amount', () => {
    const input: BillLineTaxInput = {
      ...baseInput,
      fedPercent: 10,
    };
    const result = calculateBillLineTax(input);
    expect(result.fedAmount).toBe(95);      // 950 * 10%
    expect(result.netAmount).toBe(1216);    // 950 + 171 + 95
  });

  it('computes advance tax on discounted amount', () => {
    const input: BillLineTaxInput = {
      ...baseInput,
      advanceTaxPercent: 3,
    };
    const result = calculateBillLineTax(input);
    expect(result.advanceTaxAmount).toBe(28.5); // 950 * 3%
    expect(result.netAmount).toBeCloseTo(1149.5, 1);
  });

  it('computes all taxes together', () => {
    const input: BillLineTaxInput = {
      quantity: 200,
      rate: 50,
      tradeDiscountPercent: 10,
      gstPercent: 18,
      furtherTaxPercent: 5,
      fedPercent: 10,
      advanceTaxPercent: 3,
    };
    const result = calculateBillLineTax(input);

    expect(result.amount).toBe(10000);        // 200 * 50
    expect(result.discountAmount).toBe(1000); // 10000 * 10%
    expect(result.toAmount).toBe(9000);       // 10000 - 1000
    expect(result.gstAmount).toBe(1620);      // 9000 * 18%
    expect(result.furtherTaxAmount).toBe(450); // 9000 * 5%
    expect(result.fedAmount).toBe(900);       // 9000 * 10%
    expect(result.advanceTaxAmount).toBe(270); // 9000 * 3%
    expect(result.netAmount).toBe(12240);     // 9000 + 1620 + 450 + 900 + 270
  });

  it('returns zero everything when quantity is 0', () => {
    const input: BillLineTaxInput = {
      ...baseInput,
      quantity: 0,
    };
    const result = calculateBillLineTax(input);
    expect(result.amount).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.toAmount).toBe(0);
    expect(result.gstAmount).toBe(0);
    expect(result.netAmount).toBe(0);
  });

  it('handles zero discount correctly', () => {
    const input: BillLineTaxInput = {
      ...baseInput,
      tradeDiscountPercent: 0,
    };
    const result = calculateBillLineTax(input);
    expect(result.amount).toBe(1000);
    expect(result.discountAmount).toBe(0);
    expect(result.toAmount).toBe(1000);
    expect(result.gstAmount).toBe(180);   // 1000 * 18%
    expect(result.netAmount).toBe(1180);  // 1000 + 180
  });
});
