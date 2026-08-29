import { describe, it, expect, beforeEach } from 'vitest';
import { PurchaseService } from './PurchaseService';
import {
  TENANT_ID,
  SEED_SUPPLIERS,
  createMockCOARepo,
  createMockVoucherRepo,
  createMockInventoryRepo,
  createMockSupplierRepo,
  resetCounters,
} from '../test-helpers';

describe('PurchaseService', () => {
  let service: PurchaseService;
  let voucherRepo: ReturnType<typeof createMockVoucherRepo>;

  beforeEach(() => {
    resetCounters();
    voucherRepo = createMockVoucherRepo();
    service = new PurchaseService(
      createMockCOARepo(),
      voucherRepo,
      createMockInventoryRepo(),
      createMockSupplierRepo(),
    );
  });

  describe('calculateLineTax', () => {
    it('computes tax for a simple purchase line with 18% GST', () => {
      const line = {
        productId: 'prod-1',
        cartons: 20,
        packs: 480,
        rate: 60,
        tradeDiscountPercent: 0,
        gstPercent: 18,
        furtherTaxPercent: 0,
        fedPercent: 0,
        advanceTaxPercent: 0,
      };

      const result = service.calculateLineTax(line, 24);

      expect(result.amount).toBe(28800);        // 480 * 60
      expect(result.discountAmount).toBe(0);    // 0%
      expect(result.toAmount).toBe(28800);      // 28800 - 0
      expect(result.gstAmount).toBe(5184);      // 28800 * 18%
      expect(result.netAmount).toBe(33984);     // 28800 + 5184
    });

    it('computes tax with trade discount', () => {
      const line = {
        productId: 'prod-2',
        cartons: 10,
        packs: 120,
        rate: 150,
        tradeDiscountPercent: 10,
        gstPercent: 18,
        furtherTaxPercent: 0,
        fedPercent: 0,
        advanceTaxPercent: 0,
      };

      const result = service.calculateLineTax(line, 12);

      expect(result.amount).toBe(18000);        // 120 * 150
      expect(result.discountAmount).toBe(1800); // 18000 * 10%
      expect(result.toAmount).toBe(16200);      // 18000 - 1800
      expect(result.gstAmount).toBe(2916);      // 16200 * 18%
      expect(result.netAmount).toBe(19116);     // 16200 + 2916
    });
  });

  describe('calculateBill', () => {
    it('calculates totals across multiple lines', async () => {
      const lines = [
        {
          productId: 'prod-1',
          cartons: 20,
          packs: 480,
          rate: 60,
          tradeDiscountPercent: 0,
          gstPercent: 18,
          furtherTaxPercent: 0,
          fedPercent: 0,
          advanceTaxPercent: 0,
        },
        {
          productId: 'prod-2',
          cartons: 10,
          packs: 120,
          rate: 150,
          tradeDiscountPercent: 10,
          gstPercent: 18,
          furtherTaxPercent: 0,
          fedPercent: 0,
          advanceTaxPercent: 0,
        },
      ];

      const result = await service.calculateBill(TENANT_ID, lines);

      expect(result.totalCartons).toBe(30);
      expect(result.totalPacks).toBe(600);
      expect(result.lines).toHaveLength(2);

      // Line 1: 480*60 = 28800, gst = 5184, net = 33984
      expect(result.lines[0].amount).toBe(28800);
      expect(result.lines[0].gstAmount).toBe(5184);
      expect(result.lines[0].netAmount).toBe(33984);

      // Line 2: 120*150 = 18000, disc 10% = 1800, toAmt = 16200, gst = 2916, net = 19116
      expect(result.lines[1].amount).toBe(18000);
      expect(result.lines[1].discountAmount).toBe(1800);
      expect(result.lines[1].netAmount).toBe(19116);

      // Totals
      expect(result.totalAmount).toBe(46800);    // 28800 + 18000
      expect(result.totalDiscount).toBe(1800);   // 0 + 1800
      expect(result.totalToAmount).toBe(45000);  // 28800 + 16200
      expect(result.totalGst).toBe(8100);        // 5184 + 2916
      expect(result.totalNetAmount).toBe(53100); // 33984 + 19116
    });
  });

  describe('createPurchaseBill', () => {
    it('creates a DRAFT PV voucher', async () => {
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test purchase',
        lines: [
          {
            productId: 'prod-1',
            cartons: 20,
            packs: 480,
            rate: 60,
            tradeDiscountPercent: 0,
            gstPercent: 18,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };

      const voucher = await service.createPurchaseBill(TENANT_ID, dto, 'admin');

      expect(voucher.voucherType).toBe('PV');
      expect(voucher.status).toBe('DRAFT');
      expect(voucher.narration).toBe('Test purchase');
    });

    it('throws when supplier not found', async () => {
      const dto = {
        supplierId: 'nonexistent',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [],
      };

      await expect(service.createPurchaseBill(TENANT_ID, dto, 'admin')).rejects.toThrow('Supplier not found');
    });

    it('throws when supplier is inactive', async () => {
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [],
      };

      const inactiveSupplierRepo = createMockSupplierRepo([
        { ...SEED_SUPPLIERS[0], isActive: false },
      ]);
      const svc = new PurchaseService(
        createMockCOARepo(),
        createMockVoucherRepo(),
        createMockInventoryRepo(),
        inactiveSupplierRepo,
      );

      await expect(svc.createPurchaseBill(TENANT_ID, dto, 'admin')).rejects.toThrow('Supplier is inactive');
    });

    it('creates a purchase with Further Tax (GST + Further Tax combined in 11401)', async () => {
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [
          {
            productId: 'prod-1',
            cartons: 1,
            packs: 10,
            rate: 100,
            tradeDiscountPercent: 0,
            gstPercent: 18,
            furtherTaxPercent: 5,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };

      const voucher = await service.createPurchaseBill(TENANT_ID, dto, 'admin');
      expect(voucher.voucherType).toBe('PV');
      expect(voucher.status).toBe('DRAFT');

      // Verify GL lines: DR Inventory 1000, DR Tax Input 230 (180 GST + 50 Further), CR Supplier AP 1230
      const lines = await voucherRepo.getVoucherLines(TENANT_ID, voucher.id);
      const debitLines = lines.filter(l => l.debit > 0);
      const creditLines = lines.filter(l => l.credit > 0);
      const totalDebit = debitLines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = creditLines.reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });

    it('creates a purchase with FED (debit to 11403 FED Input)', async () => {
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [
          {
            productId: 'prod-1',
            cartons: 1,
            packs: 10,
            rate: 100,
            tradeDiscountPercent: 0,
            gstPercent: 18,
            furtherTaxPercent: 0,
            fedPercent: 5,
            advanceTaxPercent: 0,
          },
        ],
      };

      const voucher = await service.createPurchaseBill(TENANT_ID, dto, 'admin');
      expect(voucher.voucherType).toBe('PV');

      const lines = await voucherRepo.getVoucherLines(TENANT_ID, voucher.id);
      const fedLine = lines.find(l => l.accountId === '11403' && l.debit > 0);
      expect(fedLine).toBeDefined();
      expect(fedLine!.debit).toBeCloseTo(50, 2); // 1000 * 5%

      const totalDebit = lines.filter(l => l.debit > 0).reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });

    it('creates a purchase with Advance Tax (debit to 11402)', async () => {
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [
          {
            productId: 'prod-1',
            cartons: 1,
            packs: 10,
            rate: 100,
            tradeDiscountPercent: 0,
            gstPercent: 18,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 3,
          },
        ],
      };

      const voucher = await service.createPurchaseBill(TENANT_ID, dto, 'admin');
      expect(voucher.voucherType).toBe('PV');

      const lines = await voucherRepo.getVoucherLines(TENANT_ID, voucher.id);
      const advLine = lines.find(l => l.accountId === '11402' && l.debit > 0);
      expect(advLine).toBeDefined();
      expect(advLine!.debit).toBeCloseTo(30, 2); // 1000 * 3%

      const totalDebit = lines.filter(l => l.debit > 0).reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });

    it('creates a purchase with all additional taxes (GST + Further + FED + Advance)', async () => {
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [
          {
            productId: 'prod-1',
            cartons: 1,
            packs: 10,
            rate: 100,
            tradeDiscountPercent: 0,
            gstPercent: 18,
            furtherTaxPercent: 5,
            fedPercent: 5,
            advanceTaxPercent: 3,
          },
        ],
      };

      const voucher = await service.createPurchaseBill(TENANT_ID, dto, 'admin');
      expect(voucher.voucherType).toBe('PV');

      const lines = await voucherRepo.getVoucherLines(TENANT_ID, voucher.id);
      const totalDebit = lines.filter(l => l.debit > 0).reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);

      // Verify individual tax lines exist
      expect(lines.find(l => l.accountId === '11401' && l.debit > 0)).toBeDefined(); // GST+Further
      expect(lines.find(l => l.accountId === '11403' && l.debit > 0)).toBeDefined(); // FED
      expect(lines.find(l => l.accountId === '11402' && l.debit > 0)).toBeDefined(); // Advance
    });
  });

  describe('postPurchaseBill', () => {
    it('posts a DRAFT voucher to POSTED status', async () => {
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test purchase',
        lines: [
          {
            productId: 'prod-1',
            cartons: 20,
            packs: 480,
            rate: 60,
            tradeDiscountPercent: 0,
            gstPercent: 18,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };

      const created = await service.createPurchaseBill(TENANT_ID, dto, 'admin');
      const posted = await service.postPurchaseBill(TENANT_ID, created.id);

      expect(posted.status).toBe('POSTED');
    });
  });

  describe('getPurchaseBills', () => {
    it('returns only PV vouchers', async () => {
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [
          {
            productId: 'prod-1',
            cartons: 20,
            packs: 480,
            rate: 60,
            tradeDiscountPercent: 0,
            gstPercent: 18,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };

      await service.createPurchaseBill(TENANT_ID, dto, 'admin');
      const bills = await service.getPurchaseBills(TENANT_ID);

      expect(bills).toHaveLength(1);
      expect(bills[0].voucherType).toBe('PV');
    });
  });
});
