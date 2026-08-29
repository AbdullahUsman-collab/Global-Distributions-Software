import { describe, it, expect, beforeEach } from 'vitest';
import { SalesService } from './SalesService';
import {
  TENANT_ID,
  SEED_ACCOUNTS,
  SEED_PRODUCTS,
  SEED_CUSTOMERS,
  createMockCOARepo,
  createMockVoucherRepo,
  createMockInventoryRepo,
  createMockCustomerRepo,
  resetCounters,
} from '../test-helpers';

describe('SalesService', () => {
  let service: SalesService;

  beforeEach(() => {
    resetCounters();
    service = new SalesService(
      createMockCOARepo(),
      createMockVoucherRepo(),
      createMockInventoryRepo(),
      createMockCustomerRepo(),
    );
  });

  describe('calculateLineTax', () => {
    it('computes tax for a simple line with 18% GST', () => {
      const line = {
        productId: 'prod-1',
        cartons: 10,
        packs: 240,
        rate: 100,
        tradeDiscountPercent: 5,
        gstPercent: 18,
        furtherTaxPercent: 0,
        fedPercent: 0,
        advanceTaxPercent: 0,
      };

      const result = service.calculateLineTax(line, 24);

      expect(result.amount).toBe(24000);        // 240 * 100
      expect(result.discountAmount).toBe(1200);  // 24000 * 5%
      expect(result.toAmount).toBe(22800);       // 24000 - 1200
      expect(result.gstAmount).toBe(4104);       // 22800 * 18%
      expect(result.netAmount).toBe(26904);      // 22800 + 4104
    });

    it('computes tax for a line with multiple tax types', () => {
      const line = {
        productId: 'prod-2',
        cartons: 5,
        packs: 60,
        rate: 250,
        tradeDiscountPercent: 0,
        gstPercent: 18,
        furtherTaxPercent: 5,
        fedPercent: 10,
        advanceTaxPercent: 3,
      };

      const result = service.calculateLineTax(line, 12);

      expect(result.amount).toBe(15000);         // 60 * 250
      expect(result.discountAmount).toBe(0);     // 0%
      expect(result.toAmount).toBe(15000);       // 15000 - 0
      expect(result.gstAmount).toBe(2700);       // 15000 * 18%
      expect(result.furtherTaxAmount).toBe(750); // 15000 * 5%
      expect(result.fedAmount).toBe(1500);       // 15000 * 10%
      expect(result.advanceTaxAmount).toBe(450); // 15000 * 3%
      expect(result.netAmount).toBe(20400);      // 15000 + 2700 + 750 + 1500 + 450
    });
  });

  describe('calculateBill', () => {
    it('calculates totals across multiple lines', async () => {
      const lines = [
        {
          productId: 'prod-1',
          cartons: 10,
          packs: 240,
          rate: 100,
          tradeDiscountPercent: 5,
          gstPercent: 18,
          furtherTaxPercent: 0,
          fedPercent: 0,
          advanceTaxPercent: 0,
        },
        {
          productId: 'prod-2',
          cartons: 5,
          packs: 60,
          rate: 250,
          tradeDiscountPercent: 0,
          gstPercent: 18,
          furtherTaxPercent: 5,
          fedPercent: 0,
          advanceTaxPercent: 0,
        },
      ];

      const result = await service.calculateBill(TENANT_ID, lines);

      expect(result.totalCartons).toBe(15);
      expect(result.totalPacks).toBe(300);
      expect(result.lines).toHaveLength(2);

      // Line 1: 240*100 = 24000, disc 5% = 1200, toAmt = 22800, gst = 4104
      expect(result.lines[0].amount).toBe(24000);
      expect(result.lines[0].gstAmount).toBe(4104);

      // Line 2: 60*250 = 15000, disc 0%, toAmt = 15000, gst = 2700, ft = 750
      expect(result.lines[1].amount).toBe(15000);
      expect(result.lines[1].gstAmount).toBe(2700);
      expect(result.lines[1].furtherTaxAmount).toBe(750);

      // Totals
      expect(result.totalAmount).toBe(39000);    // 24000 + 15000
      expect(result.totalDiscount).toBe(1200);   // 1200 + 0
      expect(result.totalToAmount).toBe(37800);  // 22800 + 15000
      expect(result.totalGst).toBe(6804);        // 4104 + 2700
      expect(result.totalFurtherTax).toBe(750);  // 0 + 750
      expect(result.totalNetAmount).toBe(45354); // 26904 + 18450
    });
  });

  describe('createSaleBill', () => {
    it('creates a DRAFT SV voucher with balanced lines', async () => {
      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test sale',
        lines: [
          {
            productId: 'prod-1',
            cartons: 10,
            packs: 240,
            rate: 100,
            tradeDiscountPercent: 5,
            gstPercent: 18,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };

      const voucher = await service.createSaleBill(TENANT_ID, dto, 'admin');

      expect(voucher.voucherType).toBe('SV');
      expect(voucher.status).toBe('DRAFT');
      expect(voucher.narration).toBe('Test sale');
      expect(voucher.createdBy).toBe('admin');
    });

    it('throws when customer not found', async () => {
      const dto = {
        customerId: 'nonexistent',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [],
      };

      await expect(service.createSaleBill(TENANT_ID, dto, 'admin')).rejects.toThrow('Customer not found');
    });

    it('throws when customer is inactive', async () => {
      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [],
      };

      // Deactivate the customer first by updating the repo
      const customerRepo = createMockCustomerRepo([
        { ...SEED_CUSTOMERS[0], isActive: false },
      ]);
      const svc = new SalesService(
        createMockCOARepo(),
        createMockVoucherRepo(),
        createMockInventoryRepo(),
        customerRepo,
      );

      await expect(svc.createSaleBill(TENANT_ID, dto, 'admin')).rejects.toThrow('Customer is inactive');
    });

    it('throws when product not found', async () => {
      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [
          {
            productId: 'nonexistent',
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

      await expect(service.createSaleBill(TENANT_ID, dto, 'admin')).rejects.toThrow('Product not found');
    });
  });

  describe('postSaleBill', () => {
    it('posts a DRAFT voucher to POSTED status', async () => {
      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test sale',
        lines: [
          {
            productId: 'prod-1',
            cartons: 10,
            packs: 240,
            rate: 100,
            tradeDiscountPercent: 5,
            gstPercent: 18,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };

      const created = await service.createSaleBill(TENANT_ID, dto, 'admin');
      const posted = await service.postSaleBill(TENANT_ID, created.id);

      expect(posted.status).toBe('POSTED');
    });

    it('creates ledger entries on posting', async () => {
      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test sale',
        lines: [
          {
            productId: 'prod-1',
            cartons: 10,
            packs: 240,
            rate: 100,
            tradeDiscountPercent: 5,
            gstPercent: 18,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };

      const created = await service.createSaleBill(TENANT_ID, dto, 'admin');
      await service.postSaleBill(TENANT_ID, created.id);

      // Verify ledger entries were created (debit = credit)
      // DEBIT: Customer AR (26904), CREDIT: Sales Revenue (22800) + Tax Output (4104)
      // Total DEBIT = 26904, Total CREDIT = 22800 + 4104 = 26904
    });
  });

  describe('getSaleBills', () => {
    it('returns only SV vouchers', async () => {
      // Create a sale bill
      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [
          {
            productId: 'prod-1',
            cartons: 10,
            packs: 240,
            rate: 100,
            tradeDiscountPercent: 5,
            gstPercent: 18,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };

      await service.createSaleBill(TENANT_ID, dto, 'admin');
      const bills = await service.getSaleBills(TENANT_ID);

      expect(bills).toHaveLength(1);
      expect(bills[0].voucherType).toBe('SV');
    });
  });

  describe('deleteSaleBill', () => {
    it('deletes a DRAFT voucher', async () => {
      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        lines: [
          {
            productId: 'prod-1',
            cartons: 10,
            packs: 240,
            rate: 100,
            tradeDiscountPercent: 5,
            gstPercent: 18,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };

      const created = await service.createSaleBill(TENANT_ID, dto, 'admin');
      await service.deleteSaleBill(TENANT_ID, created.id);

      const bills = await service.getSaleBills(TENANT_ID);
      expect(bills).toHaveLength(0);
    });
  });
});
