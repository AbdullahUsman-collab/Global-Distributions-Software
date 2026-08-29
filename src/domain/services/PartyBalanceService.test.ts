/**
 * PartyBalanceService Tests
 * Verifies customer/supplier balance computation from ledger entries.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PartyBalanceService } from './PartyBalanceService';
import {
  TENANT_ID,
  SEED_ACCOUNTS,
  SEED_CUSTOMERS,
  SEED_SUPPLIERS,
  createMockCOARepo,
  createMockVoucherRepo,
  createMockCustomerRepo,
  createMockSupplierRepo,
  resetCounters,
} from '../test-helpers';

describe('PartyBalanceService', () => {
  let service: PartyBalanceService;
  let coaRepo: ReturnType<typeof createMockCOARepo>;
  let voucherRepo: ReturnType<typeof createMockVoucherRepo>;
  let customerRepo: ReturnType<typeof createMockCustomerRepo>;
  let supplierRepo: ReturnType<typeof createMockSupplierRepo>;

  beforeEach(() => {
    resetCounters();
    coaRepo = createMockCOARepo();
    voucherRepo = createMockVoucherRepo();
    customerRepo = createMockCustomerRepo();
    supplierRepo = createMockSupplierRepo();

    service = new PartyBalanceService(
      voucherRepo, coaRepo, customerRepo, supplierRepo,
    );
  });

  // Helper: create and post a voucher
  async function createAndPost(type: string, lines: { accountId: string; debit: number; credit: number }[]) {
    const result = await voucherRepo.createVoucher(TENANT_ID, {
      voucherType: type as any,
      date: '2026-08-15',
      narration: `Test ${type}`,
      lines: lines.map((l, i) => ({
        accountId: l.accountId,
        description: `Line ${i}`,
        debit: l.debit,
        credit: l.credit,
        quantity: 0,
        stRate: 0,
        stAmount: 0,
        amtExclStd: 0,
      })),
    }, 'admin');
    return voucherRepo.postVoucher(TENANT_ID, result.id);
  }

  describe('customer balances', () => {
    it('returns zero balance for customer with no transactions', async () => {
      const balances = await service.getCustomerBalances(TENANT_ID);
      expect(balances.length).toBe(1);
      expect(balances[0].outstandingBalance).toBe(0);
      expect(balances[0].totalSales).toBe(0);
    });

    it('computes balance after sale', async () => {
      await createAndPost('SV', [
        { accountId: 'acc-11201', debit: 50000, credit: 0 },
        { accountId: 'acc-41101', debit: 0, credit: 50000 },
      ]);
      const balances = await service.getCustomerBalances(TENANT_ID);
      const customer = balances.find(b => b.partyId === 'cust-1');
      expect(customer).toBeDefined();
      expect(customer!.outstandingBalance).toBe(50000);
      expect(customer!.totalSales).toBe(50000);
    });

    it('reduces balance after receipt', async () => {
      await createAndPost('SV', [
        { accountId: 'acc-11201', debit: 50000, credit: 0 },
        { accountId: 'acc-41101', debit: 0, credit: 50000 },
      ]);
      await createAndPost('CR', [
        { accountId: 'acc-11101', debit: 20000, credit: 0 },
        { accountId: 'acc-11201', debit: 0, credit: 20000 },
      ]);
      const balances = await service.getCustomerBalances(TENANT_ID);
      const customer = balances.find(b => b.partyId === 'cust-1');
      expect(customer!.outstandingBalance).toBe(30000);
      expect(customer!.totalReceipts).toBe(20000);
    });

    it('reduces balance after sale return', async () => {
      await createAndPost('SV', [
        { accountId: 'acc-11201', debit: 50000, credit: 0 },
        { accountId: 'acc-41101', debit: 0, credit: 50000 },
      ]);
      await createAndPost('SRV', [
        { accountId: 'acc-11201', debit: 0, credit: 10000 },
        { accountId: 'acc-41101', debit: 10000, credit: 0 },
      ]);
      const balances = await service.getCustomerBalances(TENANT_ID);
      const customer = balances.find(b => b.partyId === 'cust-1');
      expect(customer!.outstandingBalance).toBe(40000);
      expect(customer!.totalReturns).toBe(10000);
    });

    it('handles combined transactions correctly', async () => {
      // Sale 50000
      await createAndPost('SV', [
        { accountId: 'acc-11201', debit: 50000, credit: 0 },
        { accountId: 'acc-41101', debit: 0, credit: 50000 },
      ]);
      // Return 10000
      await createAndPost('SRV', [
        { accountId: 'acc-11201', debit: 0, credit: 10000 },
        { accountId: 'acc-41101', debit: 10000, credit: 0 },
      ]);
      // Receipt 20000
      await createAndPost('CR', [
        { accountId: 'acc-11101', debit: 20000, credit: 0 },
        { accountId: 'acc-11201', debit: 0, credit: 20000 },
      ]);
      const balances = await service.getCustomerBalances(TENANT_ID);
      const customer = balances.find(b => b.partyId === 'cust-1');
      expect(customer!.outstandingBalance).toBe(20000);
      expect(customer!.totalSales).toBe(50000);
      expect(customer!.totalReturns).toBe(10000);
      expect(customer!.totalReceipts).toBe(20000);
    });
  });

  describe('supplier balances', () => {
    it('returns zero balance for supplier with no transactions', async () => {
      const balances = await service.getSupplierBalances(TENANT_ID);
      expect(balances.length).toBe(1);
      expect(balances[0].outstandingBalance).toBe(0);
    });

    it('computes balance after purchase', async () => {
      await createAndPost('PV', [
        { accountId: 'acc-11301', debit: 0, credit: 0 },
        { accountId: 'acc-21100', debit: 0, credit: 60000 },
      ]);
      const balances = await service.getSupplierBalances(TENANT_ID);
      const supplier = balances.find(b => b.partyId === 'supp-1');
      expect(supplier).toBeDefined();
      expect(supplier!.outstandingBalance).toBe(60000);
      expect(supplier!.totalSales).toBe(60000); // totalPurchases mapped to totalSales
    });

    it('reduces balance after purchase return', async () => {
      await createAndPost('PV', [
        { accountId: 'acc-11301', debit: 0, credit: 0 },
        { accountId: 'acc-21100', debit: 0, credit: 60000 },
      ]);
      await createAndPost('PRV', [
        { accountId: 'acc-21100', debit: 15000, credit: 0 },
        { accountId: 'acc-11301', debit: 0, credit: 15000 },
      ]);
      const balances = await service.getSupplierBalances(TENANT_ID);
      const supplier = balances.find(b => b.partyId === 'supp-1');
      expect(supplier!.outstandingBalance).toBe(45000);
      expect(supplier!.totalReturns).toBe(15000);
    });
  });

  describe('tenant isolation', () => {
    it('returns empty for non-existent tenant', async () => {
      const balances = await service.getCustomerBalances('non-existent');
      expect(balances.length).toBe(0);
    });
  });
});
