import { describe, it, expect, beforeEach } from 'vitest';
import { PurchaseReturnService } from './PurchaseReturnService';
import {
  TENANT_ID,
  SEED_SUPPLIERS,
  createMockVoucherRepo,
  createMockInventoryRepo,
  createMockSupplierRepo,
  resetCounters,
} from '../test-helpers';

describe('PurchaseReturnService', () => {
  let service: PurchaseReturnService;
  let voucherRepo: ReturnType<typeof createMockVoucherRepo>;

  beforeEach(() => {
    resetCounters();
    voucherRepo = createMockVoucherRepo();
    service = new PurchaseReturnService(
      voucherRepo,
      createMockInventoryRepo(),
      createMockSupplierRepo(),
    );
  });

  describe('createPurchaseReturn', () => {
    it('creates a DRAFT PRV voucher with zero taxes', async () => {
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test return',
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
            advanceTaxPercent: 0,
          },
        ],
      };

      const voucher = await service.createPurchaseReturn(TENANT_ID, dto, 'admin');
      expect(voucher.voucherType).toBe('PRV');
      expect(voucher.status).toBe('DRAFT');

      const lines = await voucherRepo.getVoucherLines(TENANT_ID, voucher.id);
      const totalDebit = lines.filter(l => l.debit > 0).reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });

    it('creates a purchase return with Further Tax (reversal of GST + Further Tax from 11401)', async () => {
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

      const voucher = await service.createPurchaseReturn(TENANT_ID, dto, 'admin');
      expect(voucher.voucherType).toBe('PRV');

      const lines = await voucherRepo.getVoucherLines(TENANT_ID, voucher.id);
      // CREDIT: 11401 GST+Further Tax reversal
      const taxCredit = lines.find(l => l.accountId === '11401' && l.credit > 0);
      expect(taxCredit).toBeDefined();
      expect(taxCredit!.credit).toBeCloseTo(230, 2); // (180 GST + 50 Further)

      const totalDebit = lines.filter(l => l.debit > 0).reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });

    it('creates a purchase return with FED (reversal from 11403)', async () => {
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

      const voucher = await service.createPurchaseReturn(TENANT_ID, dto, 'admin');
      const lines = await voucherRepo.getVoucherLines(TENANT_ID, voucher.id);

      const fedCredit = lines.find(l => l.accountId === '11403' && l.credit > 0);
      expect(fedCredit).toBeDefined();
      expect(fedCredit!.credit).toBeCloseTo(50, 2); // 1000 * 5%

      const totalDebit = lines.filter(l => l.debit > 0).reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });

    it('creates a purchase return with Advance Tax (reversal from 11402)', async () => {
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

      const voucher = await service.createPurchaseReturn(TENANT_ID, dto, 'admin');
      const lines = await voucherRepo.getVoucherLines(TENANT_ID, voucher.id);

      const advCredit = lines.find(l => l.accountId === '11402' && l.credit > 0);
      expect(advCredit).toBeDefined();
      expect(advCredit!.credit).toBeCloseTo(30, 2); // 1000 * 3%

      const totalDebit = lines.filter(l => l.debit > 0).reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });

    it('creates a purchase return with all additional taxes', async () => {
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

      const voucher = await service.createPurchaseReturn(TENANT_ID, dto, 'admin');
      const lines = await voucherRepo.getVoucherLines(TENANT_ID, voucher.id);

      const totalDebit = lines.filter(l => l.debit > 0).reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);

      // All three reversal accounts should have credits
      expect(lines.find(l => l.accountId === '11401' && l.credit > 0)).toBeDefined();
      expect(lines.find(l => l.accountId === '11403' && l.credit > 0)).toBeDefined();
      expect(lines.find(l => l.accountId === '11402' && l.credit > 0)).toBeDefined();
    });

    it('throws when supplier not found', async () => {
      const dto = {
        supplierId: 'nonexistent',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [],
      };

      await expect(service.createPurchaseReturn(TENANT_ID, dto, 'admin')).rejects.toThrow('Supplier not found');
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
      const svc = new PurchaseReturnService(
        createMockVoucherRepo(),
        createMockInventoryRepo(),
        inactiveSupplierRepo,
      );

      await expect(svc.createPurchaseReturn(TENANT_ID, dto, 'admin')).rejects.toThrow('Supplier is inactive');
    });
  });

  describe('postPurchaseReturn', () => {
    it('posts a DRAFT PRV to POSTED status', async () => {
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test return',
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
            advanceTaxPercent: 0,
          },
        ],
      };

      const created = await service.createPurchaseReturn(TENANT_ID, dto, 'admin');
      const posted = await service.postPurchaseReturn(TENANT_ID, created.id);
      expect(posted.status).toBe('POSTED');
    });
  });
});
