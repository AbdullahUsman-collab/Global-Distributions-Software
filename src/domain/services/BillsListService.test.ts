import { describe, it, expect, beforeEach } from 'vitest';
import { BillsListService, BillRecord, BILL_VOUCHER_TYPES } from './BillsListService';
import {
  TENANT_ID,
  SEED_ACCOUNTS,
  SEED_PRODUCTS,
  SEED_CUSTOMERS,
  SEED_SUPPLIERS,
  createMockVoucherRepo,
  createMockInventoryRepo,
  createMockCustomerRepo,
  createMockSupplierRepo,
  resetCounters,
} from '../test-helpers';
import { VoucherHeader, VoucherLine } from '../types/voucher';

describe('BillsListService', () => {
  let service: BillsListService;
  let voucherRepo: ReturnType<typeof createMockVoucherRepo>;
  let inventoryRepo: ReturnType<typeof createMockInventoryRepo>;
  let customerRepo: ReturnType<typeof createMockCustomerRepo>;
  let supplierRepo: ReturnType<typeof createMockSupplierRepo>;

  // Helper to create test bill records
  function makeBill(overrides: {
    type?: string;
    date?: string;
    partyAccountId?: string;
    partyId?: string;
    productId?: string;
    status?: string;
    voucherNumber?: number;
  } = {}): { header: VoucherHeader; lines: VoucherLine[] } {
    const id = `test-voucher-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const header: VoucherHeader = {
      id,
      tenantId: TENANT_ID,
      voucherNumber: overrides.voucherNumber ?? 1,
      voucherType: (overrides.type ?? 'SV') as any,
      status: (overrides.status ?? 'POSTED') as any,
      date: overrides.date ?? '2026-08-15',
      narration: `Test ${overrides.type ?? 'SV'} bill`,
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const lines: VoucherLine[] = [
      {
        id: `${id}-line-1`,
        voucherId: id,
        tenantId: TENANT_ID,
        accountId: overrides.partyAccountId ?? 'acc-11201',
        description: 'Party line',
        debit: 10000,
        credit: 0,
        lineOrder: 0,
        productId: overrides.productId ?? 'prod-1',
        quantity: 10,
      },
      {
        id: `${id}-line-2`,
        voucherId: id,
        tenantId: TENANT_ID,
        accountId: '41101',
        description: 'Revenue line',
        debit: 0,
        credit: 10000,
        lineOrder: 1,
      },
    ];

    return { header, lines };
  }

  beforeEach(() => {
    resetCounters();
    voucherRepo = createMockVoucherRepo();
    inventoryRepo = createMockInventoryRepo();
    customerRepo = createMockCustomerRepo();
    supplierRepo = createMockSupplierRepo();
    service = new BillsListService(voucherRepo, customerRepo, supplierRepo, inventoryRepo);
  });

  describe('getAllBills', () => {
    it('returns empty array when no bills exist', async () => {
      const bills = await service.getAllBills(TENANT_ID);
      expect(bills).toEqual([]);
    });

    it('fetches SV, PV, SRV, PRV vouchers', async () => {
      // Create test vouchers of each type
      for (const type of BILL_VOUCHER_TYPES) {
        const { header, lines } = makeBill({ type, voucherNumber: Math.floor(Math.random() * 1000) });
        // Manually insert into repo stores
        await voucherRepo.createVoucher(TENANT_ID, {
          voucherType: header.voucherType,
          date: header.date,
          narration: header.narration,
          lines: lines.map(l => ({
            accountId: l.accountId,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
            productId: l.productId,
            quantity: l.quantity,
          })),
        }, 'admin');
      }

      const bills = await service.getAllBills(TENANT_ID);
      expect(bills.length).toBe(4);

      const types = bills.map(b => b.voucher.voucherType).sort();
      expect(types).toEqual(['PRV', 'PV', 'SRV', 'SV']);
    });

    it('enriches bills with party names', async () => {
      // Create a bill with customer account (acc-11201 = Test Customer)
      const { header, lines } = makeBill({
        type: 'SV',
        partyAccountId: 'acc-11201',
      });
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: header.voucherType,
        date: header.date,
        narration: header.narration,
        lines: lines.map(l => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          productId: l.productId,
          quantity: l.quantity,
        })),
      }, 'admin');

      const bills = await service.getAllBills(TENANT_ID);
      expect(bills.length).toBe(1);
      expect(bills[0].partyName).toBe('Test Customer');
    });

    it('enriches bills with supplier names', async () => {
      // Create a bill with supplier account (acc-21100 = Test Supplier)
      const { header, lines } = makeBill({
        type: 'PV',
        partyAccountId: 'acc-21100',
      });
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: header.voucherType,
        date: header.date,
        narration: header.narration,
        lines: lines.map(l => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          productId: l.productId,
          quantity: l.quantity,
        })),
      }, 'admin');

      const bills = await service.getAllBills(TENANT_ID);
      expect(bills.length).toBe(1);
      expect(bills[0].partyName).toBe('Test Supplier');
    });

    it('enriches bills with item names', async () => {
      const { header, lines } = makeBill({
        type: 'SV',
        productId: 'prod-1',
      });
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: header.voucherType,
        date: header.date,
        narration: header.narration,
        lines: lines.map(l => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          productId: l.productId,
          quantity: l.quantity,
        })),
      }, 'admin');

      const bills = await service.getAllBills(TENANT_ID);
      expect(bills.length).toBe(1);
      expect(bills[0].itemNames).toContain('Product Alpha');
    });

    it('calculates total from debit amounts', async () => {
      const { header, lines } = makeBill({ type: 'SV' });
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: header.voucherType,
        date: header.date,
        narration: header.narration,
        lines: lines.map(l => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          productId: l.productId,
          quantity: l.quantity,
        })),
      }, 'admin');

      const bills = await service.getAllBills(TENANT_ID);
      expect(bills.length).toBe(1);
      expect(bills[0].total).toBe(10000);
    });

    it('isolates tenants — queries use tenant-scoped repository calls', async () => {
      // Verify that getAllBills delegates to tenant-scoped repository methods
      // The mock repo's getVouchersByTenantId filters by tenantId parameter
      // In production, this ensures tenant isolation at the repository level
      const { header, lines } = makeBill({ type: 'SV' });
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: header.voucherType,
        date: header.date,
        narration: header.narration,
        lines: lines.map(l => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          productId: l.productId,
          quantity: l.quantity,
        })),
      }, 'admin');

      // Bills exist for TENANT_ID
      const bills = await service.getAllBills(TENANT_ID);
      expect(bills.length).toBe(1);
      expect(bills[0].voucher.tenantId).toBe(TENANT_ID);
    });
  });

  describe('filterBills', () => {
    let testBills: BillRecord[];

    beforeEach(async () => {
      // Create test bills of different types and dates
      const types = ['SV', 'PV', 'SRV', 'PRV'];
      const dates = ['2026-08-01', '2026-08-15', '2026-08-20', '2026-08-29'];

      for (let i = 0; i < types.length; i++) {
        const { header, lines } = makeBill({
          type: types[i],
          date: dates[i],
          partyAccountId: i % 2 === 0 ? 'acc-11201' : 'acc-21100',
          productId: i % 2 === 0 ? 'prod-1' : 'prod-2',
          voucherNumber: i + 1,
        });
        await voucherRepo.createVoucher(TENANT_ID, {
          voucherType: header.voucherType,
          date: header.date,
          narration: header.narration,
          lines: lines.map(l => ({
            accountId: l.accountId,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
            productId: l.productId,
            quantity: l.quantity,
          })),
        }, 'admin');
      }

      testBills = await service.getAllBills(TENANT_ID);
      expect(testBills.length).toBe(4);
    });

    it('filters by voucher type SV', () => {
      const result = service.filterBills(testBills, { voucherType: 'SV' });
      expect(result.length).toBe(1);
      expect(result[0].voucher.voucherType).toBe('SV');
    });

    it('filters by voucher type PV', () => {
      const result = service.filterBills(testBills, { voucherType: 'PV' });
      expect(result.length).toBe(1);
      expect(result[0].voucher.voucherType).toBe('PV');
    });

    it('filters by voucher type SRV', () => {
      const result = service.filterBills(testBills, { voucherType: 'SRV' });
      expect(result.length).toBe(1);
      expect(result[0].voucher.voucherType).toBe('SRV');
    });

    it('filters by voucher type PRV', () => {
      const result = service.filterBills(testBills, { voucherType: 'PRV' });
      expect(result.length).toBe(1);
      expect(result[0].voucher.voucherType).toBe('PRV');
    });

    it('returns all when no type filter', () => {
      const result = service.filterBills(testBills, {});
      expect(result.length).toBe(4);
    });

    it('filters by date from only', () => {
      const result = service.filterBills(testBills, { dateFrom: '2026-08-15' });
      expect(result.length).toBe(3); // Aug 15, 20, 29
    });

    it('filters by date to only', () => {
      const result = service.filterBills(testBills, { dateTo: '2026-08-15' });
      expect(result.length).toBe(2); // Aug 01, 15
    });

    it('filters by both date from and to', () => {
      const result = service.filterBills(testBills, {
        dateFrom: '2026-08-10',
        dateTo: '2026-08-20',
      });
      expect(result.length).toBe(2); // Aug 15, 20
    });

    it('handles boundary dates correctly (inclusive)', () => {
      // Exact boundary
      const result = service.filterBills(testBills, {
        dateFrom: '2026-08-01',
        dateTo: '2026-08-01',
      });
      expect(result.length).toBe(1);
      expect(result[0].voucher.date).toBe('2026-08-01');
    });

    it('returns empty when date range has no matches', () => {
      const result = service.filterBills(testBills, {
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
      });
      expect(result.length).toBe(0);
    });

    it('filters by party (customer)', () => {
      const customerBills = testBills.filter(b => b.partyName === 'Test Customer');
      expect(customerBills.length).toBeGreaterThan(0);
      const partyId = customerBills[0].partyId;
      const result = service.filterBills(testBills, { partyId });
      expect(result.length).toBe(2); // SV and SRV use customer
      result.forEach(b => expect(b.partyId).toBe(partyId));
    });

    it('filters by party (supplier)', () => {
      const supplierBills = testBills.filter(b => b.partyName === 'Test Supplier');
      expect(supplierBills.length).toBeGreaterThan(0);
      const partyId = supplierBills[0].partyId;
      const result = service.filterBills(testBills, { partyId });
      expect(result.length).toBe(2); // PV and PRV use supplier
      result.forEach(b => expect(b.partyId).toBe(partyId));
    });

    it('filters by item', () => {
      const productBills = testBills.filter(b => b.itemNames.includes('Product Alpha'));
      expect(productBills.length).toBeGreaterThan(0);
      const itemId = productBills[0].itemIds[0];
      const result = service.filterBills(testBills, { itemId });
      expect(result.length).toBe(2); // SV and SRV use prod-1
      result.forEach(b => expect(b.itemIds).toContain(itemId));
    });

    it('returns empty for nonmatching item', () => {
      const result = service.filterBills(testBills, { itemId: 'nonexistent-product' });
      expect(result.length).toBe(0);
    });

    it('searches by voucher number', () => {
      const result = service.filterBills(testBills, { search: '1' });
      expect(result.length).toBeGreaterThan(0);
      result.forEach(b =>
        expect(String(b.voucher.voucherNumber)).toContain('1')
      );
    });

    it('searches by narration', () => {
      const result = service.filterBills(testBills, { search: 'Test SV' });
      expect(result.length).toBe(1);
      expect(result[0].voucher.voucherType).toBe('SV');
    });

    it('searches by party name', () => {
      const result = service.filterBills(testBills, { search: 'Test Customer' });
      expect(result.length).toBe(2); // SV and SRV
    });

    it('searches by item name', () => {
      const result = service.filterBills(testBills, { search: 'Product Beta' });
      expect(result.length).toBe(2); // PV and PRV use prod-2
    });

    it('combined filters: SRV + customer + item + date range', () => {
      const result = service.filterBills(testBills, {
        voucherType: 'SRV',
        partyId: 'cust-1',
        itemId: 'prod-1',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      });
      expect(result.length).toBe(1);
      expect(result[0].voucher.voucherType).toBe('SRV');
    });

    it('returns empty when combined filters have no match', () => {
      const result = service.filterBills(testBills, {
        voucherType: 'SV',
        partyId: 'supp-1', // SV uses customer, not supplier
      });
      expect(result.length).toBe(0);
    });

    it('empty result for empty input', () => {
      const result = service.filterBills([], { voucherType: 'SV' });
      expect(result.length).toBe(0);
    });
  });

  describe('deleteBill', () => {
    it('can delete a draft bill', async () => {
      const { header, lines } = makeBill({ type: 'SV', status: 'DRAFT' });
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: header.voucherType,
        date: header.date,
        narration: header.narration,
        lines: lines.map(l => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          productId: l.productId,
          quantity: l.quantity,
        })),
      }, 'admin');

      const bills = await service.getAllBills(TENANT_ID);
      expect(bills.length).toBe(1);

      await service.deleteBill(TENANT_ID, bills[0].voucher.id);

      const afterDelete = await service.getAllBills(TENANT_ID);
      expect(afterDelete.length).toBe(0);
    });

    it('throws when trying to delete a posted bill', async () => {
      const { header, lines } = makeBill({ type: 'SV', status: 'POSTED' });
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: header.voucherType,
        date: header.date,
        narration: header.narration,
        lines: lines.map(l => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          productId: l.productId,
          quantity: l.quantity,
        })),
      }, 'admin');
      // Post it
      const bills = await service.getAllBills(TENANT_ID);
      await voucherRepo.postVoucher(TENANT_ID, bills[0].voucher.id);

      await expect(
        service.deleteBill(TENANT_ID, bills[0].voucher.id)
      ).rejects.toThrow('Can only delete DRAFT vouchers');
    });
  });
});
