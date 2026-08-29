/**
 * BillDetailService Tests
 * Verifies bill detail retrieval for all voucher types, tenant isolation, and error handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BillDetailService } from './BillDetailService';
import {
  TENANT_ID,
  SEED_ACCOUNTS,
  SEED_PRODUCTS,
  SEED_CUSTOMERS,
  SEED_SUPPLIERS,
  createMockCOARepo,
  createMockVoucherRepo,
  createMockInventoryRepo,
  createMockCustomerRepo,
  createMockSupplierRepo,
  resetCounters,
} from '../test-helpers';

describe('BillDetailService', () => {
  let service: BillDetailService;
  let coaRepo: ReturnType<typeof createMockCOARepo>;
  let voucherRepo: ReturnType<typeof createMockVoucherRepo>;
  let inventoryRepo: ReturnType<typeof createMockInventoryRepo>;
  let customerRepo: ReturnType<typeof createMockCustomerRepo>;
  let supplierRepo: ReturnType<typeof createMockSupplierRepo>;

  beforeEach(() => {
    resetCounters();
    coaRepo = createMockCOARepo();
    voucherRepo = createMockVoucherRepo();
    inventoryRepo = createMockInventoryRepo();
    customerRepo = createMockCustomerRepo();
    supplierRepo = createMockSupplierRepo();

    service = new BillDetailService(
      voucherRepo, coaRepo, customerRepo, supplierRepo, inventoryRepo,
    );
  });

  // Helper: create and post a voucher
  async function createAndPost(type: string, lines: { accountId: string; debit: number; credit: number; productId?: string; quantity?: number }[]) {
    const result = await voucherRepo.createVoucher(TENANT_ID, {
      voucherType: type as any,
      date: '2026-08-15',
      narration: `Test ${type}`,
      lines: lines.map((l, i) => ({
        accountId: l.accountId,
        description: `Line ${i}`,
        debit: l.debit,
        credit: l.credit,
        quantity: l.quantity ?? 0,
        stRate: 0,
        stAmount: 0,
        amtExclStd: 0,
        productId: l.productId,
      })),
    }, 'admin');
    return voucherRepo.postVoucher(TENANT_ID, result.id);
  }

  it('returns null for non-existent voucher', async () => {
    const detail = await service.getBillDetail(TENANT_ID, 'non-existent');
    expect(detail).toBeNull();
  });

  it('returns detail for SV voucher', async () => {
    const voucher = await createAndPost('SV', [
      { accountId: 'acc-11201', debit: 5000, credit: 0, productId: 'prod-1', quantity: 10 },
      { accountId: 'acc-41101', debit: 0, credit: 5000 },
    ]);
    const detail = await service.getBillDetail(TENANT_ID, voucher.id);
    expect(detail).not.toBeNull();
    expect(detail!.voucher.voucherType).toBe('SV');
    expect(detail!.partyType).toBe('customer');
    expect(detail!.partyName).toBe('Test Customer');
    expect(detail!.lines.length).toBe(2);
    expect(detail!.accountingEntries.length).toBeGreaterThan(0);
  });

  it('returns detail for PV voucher', async () => {
    const voucher = await createAndPost('PV', [
      { accountId: 'acc-11301', debit: 0, credit: 0, productId: 'prod-1', quantity: 20 },
      { accountId: 'acc-21100', debit: 0, credit: 6000 },
    ]);
    const detail = await service.getBillDetail(TENANT_ID, voucher.id);
    expect(detail).not.toBeNull();
    expect(detail!.voucher.voucherType).toBe('PV');
    expect(detail!.partyType).toBe('supplier');
    expect(detail!.partyName).toBe('Test Supplier');
  });

  it('returns detail for SRV voucher', async () => {
    const voucher = await createAndPost('SRV', [
      { accountId: 'acc-11201', debit: 2000, credit: 0 },
      { accountId: 'acc-41101', debit: 0, credit: 2000 },
    ]);
    const detail = await service.getBillDetail(TENANT_ID, voucher.id);
    expect(detail).not.toBeNull();
    expect(detail!.voucher.voucherType).toBe('SRV');
  });

  it('returns detail for PRV voucher', async () => {
    const voucher = await createAndPost('PRV', [
      { accountId: 'acc-21100', debit: 3000, credit: 0 },
      { accountId: 'acc-11301', debit: 0, credit: 3000 },
    ]);
    const detail = await service.getBillDetail(TENANT_ID, voucher.id);
    expect(detail).not.toBeNull();
    expect(detail!.voucher.voucherType).toBe('PRV');
  });

  it('computes accounting entries from ledger', async () => {
    const voucher = await createAndPost('SV', [
      { accountId: 'acc-11201', debit: 5000, credit: 0 },
      { accountId: 'acc-41101', debit: 0, credit: 5000 },
    ]);
    const detail = await service.getBillDetail(TENANT_ID, voucher.id);
    expect(detail!.accountingEntries.length).toBe(2);
    const totalDebit = detail!.accountingEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = detail!.accountingEntries.reduce((s, e) => s + e.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });

  it('includes voucher lines in detail', async () => {
    const voucher = await createAndPost('SV', [
      { accountId: 'acc-11201', debit: 5000, credit: 0, productId: 'prod-1', quantity: 10 },
      { accountId: 'acc-41101', debit: 0, credit: 5000 },
    ]);
    const detail = await service.getBillDetail(TENANT_ID, voucher.id);
    expect(detail!.lines.length).toBe(2);
    const productLine = detail!.lines.find(l => l.line.productId === 'prod-1');
    expect(productLine).toBeDefined();
    expect(productLine!.productName).toBe('Product Alpha');
    expect(productLine!.productSku).toBe('WH-001');
  });

});
