import { describe, it, expect, beforeEach } from 'vitest';
import { AgingReportService, AgingBuckets } from './AgingReportService';
import {
  TENANT_ID,
  SEED_ACCOUNTS,
  SEED_CUSTOMERS,
  SEED_SUPPLIERS,
  createMockVoucherRepo,
  createMockCOARepo,
  createMockCustomerRepo,
  createMockSupplierRepo,
  resetCounters,
} from '../test-helpers';
import { LedgerEntry, VoucherType } from '../types/voucher';

describe('AgingReportService', () => {
  let service: AgingReportService;
  let voucherRepo: ReturnType<typeof createMockVoucherRepo>;
  let coaRepo: ReturnType<typeof createMockCOARepo>;
  let customerRepo: ReturnType<typeof createMockCustomerRepo>;
  let supplierRepo: ReturnType<typeof createMockSupplierRepo>;

  beforeEach(() => {
    resetCounters();
    voucherRepo = createMockVoucherRepo();
    coaRepo = createMockCOARepo();
    customerRepo = createMockCustomerRepo();
    supplierRepo = createMockSupplierRepo();
    service = new AgingReportService(voucherRepo, coaRepo, customerRepo, supplierRepo);
  });

  describe('daysBetween', () => {
    it('calculates days between same date', () => {
      expect(service.daysBetween('2026-08-01', '2026-08-01')).toBe(0);
    });

    it('calculates days between dates', () => {
      expect(service.daysBetween('2026-08-01', '2026-08-31')).toBe(30);
      expect(service.daysBetween('2026-08-01', '2026-09-01')).toBe(31);
      expect(service.daysBetween('2026-01-01', '2026-12-31')).toBe(364);
    });

    it('returns 0 for future dates', () => {
      expect(service.daysBetween('2026-09-01', '2026-08-01')).toBe(0);
    });
  });

  describe('getBucket', () => {
    it('maps 0 days to current', () => {
      expect(service.getBucket(0)).toBe('current');
    });

    it('maps 1-30 days to d1_30', () => {
      expect(service.getBucket(1)).toBe('d1_30');
      expect(service.getBucket(15)).toBe('d1_30');
      expect(service.getBucket(30)).toBe('d1_30');
    });

    it('maps 31-60 days to d31_60', () => {
      expect(service.getBucket(31)).toBe('d31_60');
      expect(service.getBucket(45)).toBe('d31_60');
      expect(service.getBucket(60)).toBe('d31_60');
    });

    it('maps 61-90 days to d61_90', () => {
      expect(service.getBucket(61)).toBe('d61_90');
      expect(service.getBucket(75)).toBe('d61_90');
      expect(service.getBucket(90)).toBe('d61_90');
    });

    it('maps 91-120 days to d91_120', () => {
      expect(service.getBucket(91)).toBe('d91_120');
      expect(service.getBucket(105)).toBe('d91_120');
      expect(service.getBucket(120)).toBe('d91_120');
    });

    it('maps 121+ days to d120plus', () => {
      expect(service.getBucket(121)).toBe('d120plus');
      expect(service.getBucket(200)).toBe('d120plus');
      expect(service.getBucket(365)).toBe('d120plus');
    });
  });

  describe('allocateAging (AR)', () => {
    it('allocates a single invoice to current bucket', () => {
      const entries: LedgerEntry[] = [
        { id: '1', tenantId: TENANT_ID, voucherId: 'v1', voucherLineId: 'vl1',
          accountId: 'acc-11201', debit: 10000, credit: 0, entryDate: '2026-08-29',
          voucherType: 'SV' as VoucherType, voucherNumber: 1, narration: 'Sale' },
      ];
      const aging = service.allocateAging(entries, '2026-08-29', 'AR');
      expect(aging.current).toBe(10000);
      expect(aging.d1_30).toBe(0);
      expect(aging.d31_60).toBe(0);
      expect(aging.d61_90).toBe(0);
      expect(aging.d91_120).toBe(0);
      expect(aging.d120plus).toBe(0);
    });

    it('allocates an aged invoice to correct bucket', () => {
      const entries: LedgerEntry[] = [
        { id: '1', tenantId: TENANT_ID, voucherId: 'v1', voucherLineId: 'vl1',
          accountId: 'acc-11201', debit: 10000, credit: 0, entryDate: '2026-07-01',
          voucherType: 'SV' as VoucherType, voucherNumber: 1, narration: 'Sale' },
      ];
      const aging = service.allocateAging(entries, '2026-08-29', 'AR');
      // Jul 1 to Aug 29 = 59 days → d31_60
      expect(aging.d31_60).toBe(10000);
      expect(aging.current).toBe(0);
    });

    it('handles payment reducing oldest invoice (FIFO)', () => {
      const entries: LedgerEntry[] = [
        // Invoice 1: Aug 1
        { id: '1', tenantId: TENANT_ID, voucherId: 'v1', voucherLineId: 'vl1',
          accountId: 'acc-11201', debit: 10000, credit: 0, entryDate: '2026-08-01',
          voucherType: 'SV' as VoucherType, voucherNumber: 1, narration: 'Sale' },
        // Invoice 2: Aug 15
        { id: '2', tenantId: TENANT_ID, voucherId: 'v2', voucherLineId: 'vl2',
          accountId: 'acc-11201', debit: 5000, credit: 0, entryDate: '2026-08-15',
          voucherType: 'SV' as VoucherType, voucherNumber: 2, narration: 'Sale' },
        // Payment: Aug 20 — reduces oldest (Aug 1) first
        { id: '3', tenantId: TENANT_ID, voucherId: 'v3', voucherLineId: 'vl3',
          accountId: 'acc-11201', debit: 0, credit: 8000, entryDate: '2026-08-20',
          voucherType: 'CR' as VoucherType, voucherNumber: 3, narration: 'Receipt' },
      ];
      const aging = service.allocateAging(entries, '2026-08-29', 'AR');
      // Aug 1 to Aug 29 = 28 days → d1_30; Aug 15 to Aug 29 = 14 days → d1_30
      // Aug 1 invoice: 10000 - 8000 payment = 2000 remaining (d1_30)
      // Aug 15 invoice: 5000 (d1_30)
      expect(aging.d1_30).toBe(7000); // 2000 + 5000
      expect(aging.current).toBe(0);
    });

    it('handles sale return reducing oldest invoice', () => {
      const entries: LedgerEntry[] = [
        // Invoice: Jul 1
        { id: '1', tenantId: TENANT_ID, voucherId: 'v1', voucherLineId: 'vl1',
          accountId: 'acc-11201', debit: 10000, credit: 0, entryDate: '2026-07-01',
          voucherType: 'SV' as VoucherType, voucherNumber: 1, narration: 'Sale' },
        // Sale Return: Aug 1 — reduces oldest (Jul 1)
        { id: '2', tenantId: TENANT_ID, voucherId: 'v2', voucherLineId: 'vl2',
          accountId: 'acc-11201', debit: 0, credit: 3000, entryDate: '2026-08-01',
          voucherType: 'SRV' as VoucherType, voucherNumber: 2, narration: 'Return' },
      ];
      const aging = service.allocateAging(entries, '2026-08-29', 'AR');
      // Jul 1 invoice: 10000 - 3000 return = 7000 remaining (59 days old → d31_60)
      expect(aging.d31_60).toBe(7000);
      expect(aging.current).toBe(0);
    });

    it('handles multiple invoices in different buckets', () => {
      const entries: LedgerEntry[] = [
        // Current: Aug 29
        { id: '1', tenantId: TENANT_ID, voucherId: 'v1', voucherLineId: 'vl1',
          accountId: 'acc-11201', debit: 1000, credit: 0, entryDate: '2026-08-29',
          voucherType: 'SV' as VoucherType, voucherNumber: 1, narration: 'Sale' },
        // 1-30 days: Aug 15
        { id: '2', tenantId: TENANT_ID, voucherId: 'v2', voucherLineId: 'vl2',
          accountId: 'acc-11201', debit: 2000, credit: 0, entryDate: '2026-08-15',
          voucherType: 'SV' as VoucherType, voucherNumber: 2, narration: 'Sale' },
        // 31-60 days: Jul 1
        { id: '3', tenantId: TENANT_ID, voucherId: 'v3', voucherLineId: 'vl3',
          accountId: 'acc-11201', debit: 3000, credit: 0, entryDate: '2026-07-01',
          voucherType: 'SV' as VoucherType, voucherNumber: 3, narration: 'Sale' },
        // 61-90 days: Jun 1
        { id: '4', tenantId: TENANT_ID, voucherId: 'v4', voucherLineId: 'vl4',
          accountId: 'acc-11201', debit: 4000, credit: 0, entryDate: '2026-06-01',
          voucherType: 'SV' as VoucherType, voucherNumber: 4, narration: 'Sale' },
      ];
      const aging = service.allocateAging(entries, '2026-08-29', 'AR');
      expect(aging.current).toBe(1000);
      expect(aging.d1_30).toBe(2000);
      expect(aging.d31_60).toBe(3000);
      expect(aging.d61_90).toBe(4000);
      expect(aging.d91_120).toBe(0);
      expect(aging.d120plus).toBe(0);
    });
  });

  describe('allocateAging (AP)', () => {
    it('allocates a purchase invoice to current bucket', () => {
      const entries: LedgerEntry[] = [
        // PV: credit increases AP outstanding
        { id: '1', tenantId: TENANT_ID, voucherId: 'v1', voucherLineId: 'vl1',
          accountId: 'acc-21100', debit: 0, credit: 15000, entryDate: '2026-08-29',
          voucherType: 'PV' as VoucherType, voucherNumber: 1, narration: 'Purchase' },
      ];
      const aging = service.allocateAging(entries, '2026-08-29', 'AP');
      expect(aging.current).toBe(15000);
    });

    it('handles payment reducing oldest AP invoice', () => {
      const entries: LedgerEntry[] = [
        // Purchase 1: Aug 1
        { id: '1', tenantId: TENANT_ID, voucherId: 'v1', voucherLineId: 'vl1',
          accountId: 'acc-21100', debit: 0, credit: 10000, entryDate: '2026-08-01',
          voucherType: 'PV' as VoucherType, voucherNumber: 1, narration: 'Purchase' },
        // Purchase 2: Aug 15
        { id: '2', tenantId: TENANT_ID, voucherId: 'v2', voucherLineId: 'vl2',
          accountId: 'acc-21100', debit: 0, credit: 5000, entryDate: '2026-08-15',
          voucherType: 'PV' as VoucherType, voucherNumber: 2, narration: 'Purchase' },
        // Payment: Aug 20 — reduces oldest (Aug 1) first
        { id: '3', tenantId: TENANT_ID, voucherId: 'v3', voucherLineId: 'vl3',
          accountId: 'acc-21100', debit: 8000, credit: 0, entryDate: '2026-08-20',
          voucherType: 'CP' as VoucherType, voucherNumber: 3, narration: 'Payment' },
      ];
      // Aug 1 to Aug 29 = 28 days → d1_30; Aug 15 to Aug 29 = 14 days → d1_30
      const aging = service.allocateAging(entries, '2026-08-29', 'AP');
      // Aug 1: 10000 - 8000 = 2000 (d1_30)
      // Aug 2: 5000 (d1_30)
      expect(aging.d1_30).toBe(7000);
    });

    it('handles purchase return reducing AP', () => {
      const entries: LedgerEntry[] = [
        // Purchase: Jul 1
        { id: '1', tenantId: TENANT_ID, voucherId: 'v1', voucherLineId: 'vl1',
          accountId: 'acc-21100', debit: 0, credit: 10000, entryDate: '2026-07-01',
          voucherType: 'PV' as VoucherType, voucherNumber: 1, narration: 'Purchase' },
        // Purchase Return: Aug 1
        { id: '2', tenantId: TENANT_ID, voucherId: 'v2', voucherLineId: 'vl2',
          accountId: 'acc-21100', debit: 3000, credit: 0, entryDate: '2026-08-01',
          voucherType: 'PRV' as VoucherType, voucherNumber: 2, narration: 'Return' },
      ];
      const aging = service.allocateAging(entries, '2026-08-29', 'AP');
      // Jul 1: 10000 - 3000 = 7000 (59 days → d31_60)
      expect(aging.d31_60).toBe(7000);
    });
  });

  describe('generateReport - Customer Aging', () => {
    it('returns empty report when no ledger entries exist', async () => {
      const report = await service.generateReport(TENANT_ID, 'customer', '2026-08-29');
      expect(report.mode).toBe('customer');
      expect(report.asOfDate).toBe('2026-08-29');
      expect(report.rows.length).toBe(0);
      expect(report.grandTotal).toBe(0);
    });

    it('includes customer with outstanding balance', async () => {
      // Create a voucher that posts a debit to customer AR
      const { header } = await createTestVoucher(voucherRepo, {
        type: 'SV',
        date: '2026-08-15',
        lines: [
          { accountId: 'acc-11201', debit: 10000, credit: 0 }, // Customer AR
          { accountId: '41101', debit: 0, credit: 10000 },    // Sales
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, header.id);

      const report = await service.generateReport(TENANT_ID, 'customer', '2026-08-29');
      expect(report.rows.length).toBe(1);
      expect(report.rows[0].partyName).toBe('Test Customer');
      expect(report.rows[0].totalOutstanding).toBe(10000);
    });

    it('excludes customer with zero balance', async () => {
      // Create and post a voucher, then create a receipt that fully pays it
      const { header: saleHeader } = await createTestVoucher(voucherRepo, {
        type: 'SV',
        date: '2026-08-15',
        lines: [
          { accountId: 'acc-11201', debit: 10000, credit: 0 },
          { accountId: '41101', debit: 0, credit: 10000 },
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, saleHeader.id);

      const { header: receiptHeader } = await createTestVoucher(voucherRepo, {
        type: 'CR',
        date: '2026-08-20',
        lines: [
          { accountId: '11101', debit: 10000, credit: 0 },    // Cash
          { accountId: 'acc-11201', debit: 0, credit: 10000 }, // Customer AR
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, receiptHeader.id);

      const report = await service.generateReport(TENANT_ID, 'customer', '2026-08-29');
      expect(report.rows.length).toBe(0);
    });

    it('filters by specific party', async () => {
      const { header } = await createTestVoucher(voucherRepo, {
        type: 'SV',
        date: '2026-08-15',
        lines: [
          { accountId: 'acc-11201', debit: 10000, credit: 0 },
          { accountId: '41101', debit: 0, credit: 10000 },
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, header.id);

      // Filter to specific customer
      const report = await service.generateReport(TENANT_ID, 'customer', '2026-08-29', 'cust-1');
      expect(report.rows.length).toBe(1);
      expect(report.rows[0].partyId).toBe('cust-1');

      // Filter to non-existent customer
      const report2 = await service.generateReport(TENANT_ID, 'customer', '2026-08-29', 'cust-nonexistent');
      expect(report2.rows.length).toBe(0);
    });

    it('excludes future transactions', async () => {
      const { header } = await createTestVoucher(voucherRepo, {
        type: 'SV',
        date: '2026-09-15', // Future date
        lines: [
          { accountId: 'acc-11201', debit: 10000, credit: 0 },
          { accountId: '41101', debit: 0, credit: 10000 },
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, header.id);

      const report = await service.generateReport(TENANT_ID, 'customer', '2026-08-29');
      expect(report.rows.length).toBe(0);
    });

    it('correctly allocates amounts to aging buckets', async () => {
      // Create invoices in different aging periods
      const dates = [
        { date: '2026-08-29', expected: 'current' },   // Current
        { date: '2026-08-15', expected: 'd1_30' },     // 14 days → 1-30
        { date: '2026-07-15', expected: 'd31_60' },    // 45 days → 31-60
        { date: '2026-06-15', expected: 'd61_90' },    // 75 days → 61-90
        { date: '2026-05-15', expected: 'd91_120' },   // 106 days → 91-120
        { date: '2026-04-01', expected: 'd120plus' },  // 150 days → 120+
      ];

      for (const d of dates) {
        const { header } = await createTestVoucher(voucherRepo, {
          type: 'SV',
          date: d.date,
          lines: [
            { accountId: 'acc-11201', debit: 1000, credit: 0 },
            { accountId: '41101', debit: 0, credit: 1000 },
          ],
        });
        await voucherRepo.postVoucher(TENANT_ID, header.id);
      }

      const report = await service.generateReport(TENANT_ID, 'customer', '2026-08-29');
      expect(report.rows.length).toBe(1);
      expect(report.rows[0].aging.current).toBe(1000);
      expect(report.rows[0].aging.d1_30).toBe(1000);
      expect(report.rows[0].aging.d31_60).toBe(1000);
      expect(report.rows[0].aging.d61_90).toBe(1000);
      expect(report.rows[0].aging.d91_120).toBe(1000);
      expect(report.rows[0].aging.d120plus).toBe(1000);
      expect(report.rows[0].totalOutstanding).toBe(6000);
      expect(report.grandTotal).toBe(6000);
    });
  });

  describe('generateReport - Supplier Aging', () => {
    it('returns empty report when no ledger entries exist', async () => {
      const report = await service.generateReport(TENANT_ID, 'supplier', '2026-08-29');
      expect(report.mode).toBe('supplier');
      expect(report.rows.length).toBe(0);
      expect(report.grandTotal).toBe(0);
    });

    it('includes supplier with outstanding balance', async () => {
      const { header } = await createTestVoucher(voucherRepo, {
        type: 'PV',
        date: '2026-08-15',
        lines: [
          { accountId: '11301', debit: 15000, credit: 0 },    // Inventory
          { accountId: 'acc-21100', debit: 0, credit: 15000 }, // Supplier AP
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, header.id);

      const report = await service.generateReport(TENANT_ID, 'supplier', '2026-08-29');
      expect(report.rows.length).toBe(1);
      expect(report.rows[0].partyName).toBe('Test Supplier');
      expect(report.rows[0].totalOutstanding).toBe(15000);
    });

    it('handles payment reducing supplier outstanding', async () => {
      // Purchase
      const { header: purchaseHeader } = await createTestVoucher(voucherRepo, {
        type: 'PV',
        date: '2026-08-01',
        lines: [
          { accountId: '11301', debit: 10000, credit: 0 },
          { accountId: 'acc-21100', debit: 0, credit: 10000 },
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, purchaseHeader.id);

      // Payment
      const { header: paymentHeader } = await createTestVoucher(voucherRepo, {
        type: 'CP',
        date: '2026-08-20',
        lines: [
          { accountId: 'acc-21100', debit: 6000, credit: 0 },  // Supplier AP
          { accountId: '11101', debit: 0, credit: 6000 },      // Cash
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, paymentHeader.id);

      const report = await service.generateReport(TENANT_ID, 'supplier', '2026-08-29');
      expect(report.rows.length).toBe(1);
      expect(report.rows[0].totalOutstanding).toBe(4000);
    });

    it('handles purchase return reducing supplier outstanding', async () => {
      // Purchase
      const { header: purchaseHeader } = await createTestVoucher(voucherRepo, {
        type: 'PV',
        date: '2026-07-01',
        lines: [
          { accountId: '11301', debit: 10000, credit: 0 },
          { accountId: 'acc-21100', debit: 0, credit: 10000 },
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, purchaseHeader.id);

      // Purchase Return
      const { header: returnHeader } = await createTestVoucher(voucherRepo, {
        type: 'PRV',
        date: '2026-08-01',
        lines: [
          { accountId: 'acc-21100', debit: 3000, credit: 0 },  // Supplier AP
          { accountId: '11301', debit: 0, credit: 3000 },      // Inventory
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, returnHeader.id);

      const report = await service.generateReport(TENANT_ID, 'supplier', '2026-08-29');
      expect(report.rows.length).toBe(1);
      expect(report.rows[0].totalOutstanding).toBe(7000);
    });

    it('filters by specific party', async () => {
      const { header } = await createTestVoucher(voucherRepo, {
        type: 'PV',
        date: '2026-08-15',
        lines: [
          { accountId: '11301', debit: 10000, credit: 0 },
          { accountId: 'acc-21100', debit: 0, credit: 10000 },
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, header.id);

      const report = await service.generateReport(TENANT_ID, 'supplier', '2026-08-29', 'supp-1');
      expect(report.rows.length).toBe(1);
      expect(report.rows[0].partyId).toBe('supp-1');
    });
  });

  describe('as-of date behavior', () => {
    it('excludes transactions after as-of date', async () => {
      const { header } = await createTestVoucher(voucherRepo, {
        type: 'SV',
        date: '2026-09-15', // After as-of date
        lines: [
          { accountId: 'acc-11201', debit: 10000, credit: 0 },
          { accountId: '41101', debit: 0, credit: 10000 },
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, header.id);

      const report = await service.generateReport(TENANT_ID, 'customer', '2026-08-29');
      expect(report.rows.length).toBe(0);
    });

    it('includes transactions on as-of date', async () => {
      const { header } = await createTestVoucher(voucherRepo, {
        type: 'SV',
        date: '2026-08-29', // Same as as-of date
        lines: [
          { accountId: 'acc-11201', debit: 10000, credit: 0 },
          { accountId: '41101', debit: 0, credit: 10000 },
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, header.id);

      const report = await service.generateReport(TENANT_ID, 'customer', '2026-08-29');
      expect(report.rows.length).toBe(1);
      expect(report.rows[0].totalOutstanding).toBe(10000);
    });

    it('changing as-of date changes results', async () => {
      // Create invoice on Aug 1
      const { header } = await createTestVoucher(voucherRepo, {
        type: 'SV',
        date: '2026-08-01',
        lines: [
          { accountId: 'acc-11201', debit: 10000, credit: 0 },
          { accountId: '41101', debit: 0, credit: 10000 },
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, header.id);

      // As-of Aug 1: current (0 days old)
      const report1 = await service.generateReport(TENANT_ID, 'customer', '2026-08-01');
      expect(report1.rows[0].aging.current).toBe(10000);

      // As-of Aug 29: 28 days old → d1_30
      const report2 = await service.generateReport(TENANT_ID, 'customer', '2026-08-29');
      expect(report2.rows[0].aging.d1_30).toBe(10000);
      expect(report2.rows[0].aging.current).toBe(0);
    });
  });

  describe('tenant isolation', () => {
    it('does not include data from other tenants', async () => {
      // Create a voucher for TENANT_ID
      const { header } = await createTestVoucher(voucherRepo, {
        type: 'SV',
        date: '2026-08-15',
        lines: [
          { accountId: 'acc-11201', debit: 10000, credit: 0 },
          { accountId: '41101', debit: 0, credit: 10000 },
        ],
      });
      await voucherRepo.postVoucher(TENANT_ID, header.id);

      // Query for a different tenant
      const report = await service.generateReport('tenant-other', 'customer', '2026-08-29');
      expect(report.rows.length).toBe(0);
    });
  });

  describe('totals', () => {
    it('grand total equals sum of all bucket totals', async () => {
      // Create multiple invoices
      for (const date of ['2026-08-29', '2026-08-15', '2026-07-01']) {
        const { header } = await createTestVoucher(voucherRepo, {
          type: 'SV',
          date,
          lines: [
            { accountId: 'acc-11201', debit: 5000, credit: 0 },
            { accountId: '41101', debit: 0, credit: 5000 },
          ],
        });
        await voucherRepo.postVoucher(TENANT_ID, header.id);
      }

      const report = await service.generateReport(TENANT_ID, 'customer', '2026-08-29');
      const bucketSum = report.totals.current + report.totals.d1_30 + report.totals.d31_60 +
        report.totals.d61_90 + report.totals.d91_120 + report.totals.d120plus;
      expect(report.grandTotal).toBe(bucketSum);
    });
  });
});

/* ─── Test Helper ──────────────────────────────────────────── */

async function createTestVoucher(
  voucherRepo: ReturnType<typeof createMockVoucherRepo>,
  opts: {
    type: VoucherType;
    date: string;
    lines: { accountId: string; debit: number; credit: number }[];
  },
) {
  const header = await voucherRepo.createVoucher(TENANT_ID, {
    voucherType: opts.type,
    date: opts.date,
    narration: `Test ${opts.type}`,
    lines: opts.lines.map(l => ({
      accountId: l.accountId,
      description: `Test line ${l.accountId}`,
      debit: l.debit,
      credit: l.credit,
    })),
  }, 'admin');
  return { header };
}
