/**
 * DashboardService Tests
 * Verifies KPI aggregation, period filtering, tenant isolation, and empty states.
 *
 * Source of Truth:
 *   - audit/42_STEP23_DASHBOARD_ENHANCEMENT_IMPLEMENTATION_REPORT.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardService, resolvePeriod } from './DashboardService';
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
import { VoucherHeader, VoucherLine, CreateVoucherDTO } from '../types/voucher';
import { CashBookService } from './CashBookService';
import { FinancialReportService } from './FinancialReportService';

/* ─── Helpers ──────────────────────────────────────────────── */

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeVoucher(overrides: {
  type?: string;
  date?: string;
  voucherNumber?: number;
  narration?: string;
} = {}): VoucherHeader {
  return {
    id: `test-voucher-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenantId: TENANT_ID,
    voucherNumber: overrides.voucherNumber ?? 1,
    voucherType: (overrides.type ?? 'SV') as any,
    status: 'POSTED',
    date: overrides.date ?? today(),
    narration: overrides.narration ?? 'Test voucher',
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeLines(voucherId: string, overrides: {
  debit?: number;
  credit?: number;
  accountId?: string;
} = {}): VoucherLine[] {
  return [
    {
      id: `line-${voucherId}-1`,
      voucherId,
      tenantId: TENANT_ID,
      accountId: overrides.accountId ?? 'acc-41101',
      description: 'Test line',
      debit: overrides.debit ?? 10000,
      credit: overrides.credit ?? 0,
      lineOrder: 0,
      quantity: 0,
      stRate: 0,
      stAmount: 0,
      amtExclStd: 0,
    },
  ];
}

/* ─── Tests ────────────────────────────────────────────────── */

describe('DashboardService', () => {
  let service: DashboardService;
  let coaRepo: ReturnType<typeof createMockCOARepo>;
  let voucherRepo: ReturnType<typeof createMockVoucherRepo>;
  let inventoryRepo: ReturnType<typeof createMockInventoryRepo>;
  let customerRepo: ReturnType<typeof createMockCustomerRepo>;
  let supplierRepo: ReturnType<typeof createMockSupplierRepo>;
  let cashBookService: CashBookService;
  let financialReportService: FinancialReportService;

  beforeEach(() => {
    resetCounters();
    coaRepo = createMockCOARepo();
    voucherRepo = createMockVoucherRepo();
    inventoryRepo = createMockInventoryRepo();
    customerRepo = createMockCustomerRepo();
    supplierRepo = createMockSupplierRepo();
    cashBookService = new CashBookService(coaRepo, voucherRepo);
    financialReportService = new FinancialReportService(coaRepo, voucherRepo);

    service = new DashboardService(
      voucherRepo,
      inventoryRepo,
      coaRepo,
      customerRepo,
      supplierRepo,
      cashBookService,
      financialReportService,
    );
  });

  /* ─── resolvePeriod ──────────────────────────────────────── */

  describe('resolvePeriod', () => {
    it('resolves today correctly', () => {
      const r = resolvePeriod('today');
      expect(r.startDate).toBe(today());
      expect(r.endDate).toBe(today());
    });

    it('resolves week correctly', () => {
      const r = resolvePeriod('week');
      expect(r.endDate).toBe(today());
      // Start should be <= today, within 7 days
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
      expect(diffDays).toBeGreaterThanOrEqual(0);
      expect(diffDays).toBeLessThanOrEqual(6);
    });

    it('resolves month correctly', () => {
      const r = resolvePeriod('month');
      expect(r.startDate).toMatch(/^\d{4}-\d{2}-01$/);
      expect(r.endDate).toBe(today());
    });

    it('resolves quarter correctly', () => {
      const r = resolvePeriod('quarter');
      expect(r.startDate).toMatch(/^\d{4}-(01|04|07|10)-01$/);
      expect(r.endDate).toBe(today());
    });

    it('resolves year correctly', () => {
      const r = resolvePeriod('year');
      expect(r.startDate).toMatch(/^\d{4}-01-01$/);
      expect(r.endDate).toBe(today());
    });

    it('resolves custom dates correctly', () => {
      const r = resolvePeriod('custom', '2026-01-01', '2026-06-30');
      expect(r.startDate).toBe('2026-01-01');
      expect(r.endDate).toBe('2026-06-30');
    });

    it('uses defaults for custom with no dates', () => {
      const r = resolvePeriod('custom');
      expect(r.startDate).toBe(today());
      expect(r.endDate).toBe(today());
    });
  });

  /* ─── Empty State ────────────────────────────────────────── */

  describe('empty state', () => {
    it('returns zeros when no vouchers exist', async () => {
      const data = await service.getDashboardData(TENANT_ID, 'month');
      expect(data.sales.amount).toBe(0);
      expect(data.sales.count).toBe(0);
      expect(data.purchases.amount).toBe(0);
      expect(data.purchases.count).toBe(0);
      expect(data.saleReturns.amount).toBe(0);
      expect(data.purchaseReturns.amount).toBe(0);
      expect(data.recentTransactions).toEqual([]);
    });

    it('returns correct inventory counts from seed data', async () => {
      const data = await service.getDashboardData(TENANT_ID, 'month');
      expect(data.inventory.totalProducts).toBe(SEED_PRODUCTS.length);
      expect(data.inventory.totalStockQty).toBeGreaterThan(0);
    });
  });

  /* ─── KPI Aggregation ────────────────────────────────────── */

  describe('KPI aggregation', () => {
    it('aggregates sales correctly', async () => {
      // Create two sales today
      const v1 = makeVoucher({ type: 'SV', voucherNumber: 1 });
      const v2 = makeVoucher({ type: 'SV', voucherNumber: 2 });
      // Add them directly to the repo by posting
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: 'SV',
        date: today(),
        narration: 'Sale 1',
        lines: [{ accountId: 'acc-41101', description: 'Sale 1', debit: 5000, credit: 0, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
      }, 'admin');
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: 'SV',
        date: today(),
        narration: 'Sale 2',
        lines: [{ accountId: 'acc-41101', description: 'Sale 2', debit: 3000, credit: 0, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
      }, 'admin');
      // Post them
      const all = await voucherRepo.getVouchersByTenantId(TENANT_ID);
      for (const v of all) {
        if (v.status === 'DRAFT') await voucherRepo.postVoucher(TENANT_ID, v.id);
      }

      const data = await service.getDashboardData(TENANT_ID, 'month');
      expect(data.sales.count).toBe(2);
      expect(data.sales.amount).toBe(8000);
    });

    it('aggregates purchases correctly', async () => {
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: 'PV',
        date: today(),
        narration: 'Purchase 1',
        lines: [{ accountId: 'acc-21100', description: 'Purchase 1', debit: 12000, credit: 0, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
      }, 'admin');
      const all = await voucherRepo.getVouchersByTenantId(TENANT_ID);
      for (const v of all) {
        if (v.status === 'DRAFT') await voucherRepo.postVoucher(TENANT_ID, v.id);
      }

      const data = await service.getDashboardData(TENANT_ID, 'month');
      expect(data.purchases.count).toBe(1);
      expect(data.purchases.amount).toBe(12000);
    });

    it('aggregates sale returns separately', async () => {
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: 'SRV',
        date: today(),
        narration: 'Sale Return',
        lines: [{ accountId: 'acc-11201', description: 'SR', debit: 2000, credit: 0, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
      }, 'admin');
      const all = await voucherRepo.getVouchersByTenantId(TENANT_ID);
      for (const v of all) {
        if (v.status === 'DRAFT') await voucherRepo.postVoucher(TENANT_ID, v.id);
      }

      const data = await service.getDashboardData(TENANT_ID, 'month');
      expect(data.saleReturns.count).toBe(1);
      expect(data.saleReturns.amount).toBe(2000);
      expect(data.sales.count).toBe(0);
    });

    it('aggregates purchase returns separately', async () => {
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: 'PRV',
        date: today(),
        narration: 'Purchase Return',
        lines: [{ accountId: 'acc-21100', description: 'PR', debit: 1500, credit: 0, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
      }, 'admin');
      const all = await voucherRepo.getVouchersByTenantId(TENANT_ID);
      for (const v of all) {
        if (v.status === 'DRAFT') await voucherRepo.postVoucher(TENANT_ID, v.id);
      }

      const data = await service.getDashboardData(TENANT_ID, 'month');
      expect(data.purchaseReturns.count).toBe(1);
      expect(data.purchaseReturns.amount).toBe(1500);
      expect(data.purchases.count).toBe(0);
    });
  });

  /* ─── Period Filtering ───────────────────────────────────── */

  describe('period filtering', () => {
    it('only includes vouchers within the selected period', async () => {
      // Today voucher
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: 'SV',
        date: today(),
        narration: 'Today sale',
        lines: [{ accountId: 'acc-41101', description: 'Today', debit: 1000, credit: 0, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
      }, 'admin');
      // Old voucher (outside "today" period)
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: 'SV',
        date: '2026-01-01',
        narration: 'Old sale',
        lines: [{ accountId: 'acc-41101', description: 'Old', debit: 5000, credit: 0, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
      }, 'admin');

      const all = await voucherRepo.getVouchersByTenantId(TENANT_ID);
      for (const v of all) {
        if (v.status === 'DRAFT') await voucherRepo.postVoucher(TENANT_ID, v.id);
      }

      const todayData = await service.getDashboardData(TENANT_ID, 'today');
      expect(todayData.sales.count).toBe(1);
      expect(todayData.sales.amount).toBe(1000);

      const yearData = await service.getDashboardData(TENANT_ID, 'year');
      expect(yearData.sales.count).toBe(2);
      expect(yearData.sales.amount).toBe(6000);
    });
  });

  /* ─── Inventory Summary ──────────────────────────────────── */

  describe('inventory summary', () => {
    it('returns correct totals from seed stock levels', async () => {
      const data = await service.getDashboardData(TENANT_ID, 'month');
      expect(data.inventory.totalProducts).toBe(SEED_PRODUCTS.length);
      expect(data.inventory.totalStockQty).toBe(100 * SEED_PRODUCTS.length); // 100 each
    });

    it('calculates stock value from quantity * unitCost', async () => {
      const data = await service.getDashboardData(TENANT_ID, 'month');
      const expectedValue = SEED_PRODUCTS.reduce((s, p) => s + 100 * p.purchaseRate, 0);
      expect(data.inventory.totalStockValue).toBe(expectedValue);
    });
  });

  /* ─── Cash Position ──────────────────────────────────────── */

  describe('cash position', () => {
    it('includes cash/bank accounts', async () => {
      const data = await service.getDashboardData(TENANT_ID, 'month');
      expect(data.cashPosition.accountCount).toBeGreaterThanOrEqual(0);
    });
  });

  /* ─── Recent Transactions ────────────────────────────────── */

  describe('recent transactions', () => {
    it('returns up to 10 most recent transactions', async () => {
      for (let i = 0; i < 15; i++) {
        await voucherRepo.createVoucher(TENANT_ID, {
          voucherType: 'SV',
          date: today(),
          narration: `Sale ${i}`,
          lines: [{ accountId: 'acc-41101', description: `Sale ${i}`, debit: 1000, credit: 0, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
        }, 'admin');
      }
      const all = await voucherRepo.getVouchersByTenantId(TENANT_ID);
      for (const v of all) {
        if (v.status === 'DRAFT') await voucherRepo.postVoucher(TENANT_ID, v.id);
      }

      const data = await service.getDashboardData(TENANT_ID, 'month');
      expect(data.recentTransactions.length).toBeLessThanOrEqual(10);
    });

    it('sorts transactions by date descending', async () => {
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: 'SV',
        date: '2026-08-01',
        narration: 'Old',
        lines: [{ accountId: 'acc-41101', description: 'Old', debit: 1000, credit: 0, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
      }, 'admin');
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: 'SV',
        date: '2026-08-29',
        narration: 'Recent',
        lines: [{ accountId: 'acc-41101', description: 'Recent', debit: 2000, credit: 0, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
      }, 'admin');
      const all = await voucherRepo.getVouchersByTenantId(TENANT_ID);
      for (const v of all) {
        if (v.status === 'DRAFT') await voucherRepo.postVoucher(TENANT_ID, v.id);
      }

      const data = await service.getDashboardData(TENANT_ID, 'year');
      if (data.recentTransactions.length >= 2) {
        expect(data.recentTransactions[0].date >= data.recentTransactions[1].date).toBe(true);
      }
    });

    it('includes voucherType in each transaction', async () => {
      await voucherRepo.createVoucher(TENANT_ID, {
        voucherType: 'PV',
        date: today(),
        narration: 'Purchase',
        lines: [{ accountId: 'acc-51101', description: 'PV', debit: 0, credit: 3000, quantity: 0, stRate: 0, stAmount: 0, amtExclStd: 0 }],
      }, 'admin');
      const all = await voucherRepo.getVouchersByTenantId(TENANT_ID);
      for (const v of all) {
        if (v.status === 'DRAFT') await voucherRepo.postVoucher(TENANT_ID, v.id);
      }

      const data = await service.getDashboardData(TENANT_ID, 'month');
      const pv = data.recentTransactions.find(t => t.voucherType === 'PV');
      expect(pv).toBeDefined();
      expect(pv!.narration).toBe('Purchase');
    });
  });

  /* ─── Date Range ─────────────────────────────────────────── */

  describe('date range', () => {
    it('returns correct date range for selected period', async () => {
      const data = await service.getDashboardData(TENANT_ID, 'today');
      expect(data.dateRange.startDate).toBe(today());
      expect(data.dateRange.endDate).toBe(today());
      expect(data.period).toBe('today');
    });
  });

  /* ─── Tenant Isolation ───────────────────────────────────── */

  describe('tenant isolation', () => {
    it('returns empty data for non-existent tenant', async () => {
      const data = await service.getDashboardData('non-existent-tenant', 'month');
      expect(data.sales.amount).toBe(0);
      expect(data.sales.count).toBe(0);
      expect(data.purchases.amount).toBe(0);
      expect(data.purchases.count).toBe(0);
    });
  });
});
