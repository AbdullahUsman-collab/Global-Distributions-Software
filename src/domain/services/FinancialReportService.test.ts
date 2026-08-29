import { describe, it, expect, beforeEach } from 'vitest';
import { FinancialReportService } from './FinancialReportService';
import { SalesService } from './SalesService';
import { PurchaseService } from './PurchaseService';
import {
  TENANT_ID,
  createMockCOARepo,
  createMockVoucherRepo,
  createMockInventoryRepo,
  createMockCustomerRepo,
  createMockSupplierRepo,
  resetCounters,
} from '../test-helpers';

describe('FinancialReportService', () => {
  let service: FinancialReportService;
  let voucherRepo: ReturnType<typeof createMockVoucherRepo>;

  beforeEach(() => {
    resetCounters();
    voucherRepo = createMockVoucherRepo();
    service = new FinancialReportService(createMockCOARepo(), voucherRepo);
  });

  describe('generateTrialBalance', () => {
    it('returns empty report when no entries exist', async () => {
      const report = await service.generateTrialBalance({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(report.rows).toHaveLength(0);
      expect(report.totalClosingDebit).toBe(0);
      expect(report.totalClosingCredit).toBe(0);
      expect(report.isBalanced).toBe(true);
    });

    it('generates correct trial balance after posting a sale', async () => {
      // Create and post a sale to generate ledger entries
      const salesService = new SalesService(
        createMockCOARepo(),
        voucherRepo,
        createMockInventoryRepo(),
        createMockCustomerRepo(),
      );

      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test sale for TB',
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

      const created = await salesService.createSaleBill(TENANT_ID, dto, 'admin');
      await salesService.postSaleBill(TENANT_ID, created.id);

      const report = await service.generateTrialBalance({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      // Should have rows for the accounts involved in the sale
      expect(report.rows.length).toBeGreaterThan(0);
      expect(report.isBalanced).toBe(true);

      // Total debits should equal total credits
      expect(report.totalClosingDebit).toBeCloseTo(report.totalClosingCredit, 2);
    });

    it('generates correct trial balance after posting a purchase', async () => {
      const purchaseService = new PurchaseService(
        createMockCOARepo(),
        voucherRepo,
        createMockInventoryRepo(),
        createMockSupplierRepo(),
      );

      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test purchase for TB',
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

      const created = await purchaseService.createPurchaseBill(TENANT_ID, dto, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, created.id);

      const report = await service.generateTrialBalance({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(report.rows.length).toBeGreaterThan(0);
      expect(report.isBalanced).toBe(true);
      expect(report.totalClosingDebit).toBeCloseTo(report.totalClosingCredit, 2);
    });

    it('excludes zero-balance accounts when showZeroBalance is false', async () => {
      const report = await service.generateTrialBalance({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      // No entries means no non-zero accounts
      expect(report.rows).toHaveLength(0);
    });

    it('includes all posting accounts when showZeroBalance is true', async () => {
      const report = await service.generateTrialBalance({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: true,
      });

      // Should include all active posting accounts from seed data
      expect(report.rows.length).toBeGreaterThan(0);
    });
  });

  describe('generateProfitAndLoss', () => {
    it('returns empty P&L when no period entries exist', async () => {
      const report = await service.generateProfitAndLoss({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(report.revenueRows).toHaveLength(0);
      expect(report.cogsRows).toHaveLength(0);
      expect(report.expenseRows).toHaveLength(0);
      expect(report.totalRevenue).toBe(0);
      expect(report.netProfit).toBe(0);
    });

    it('shows revenue from posted sale', async () => {
      const salesService = new SalesService(
        createMockCOARepo(),
        voucherRepo,
        createMockInventoryRepo(),
        createMockCustomerRepo(),
      );

      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test sale for P&L',
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

      const created = await salesService.createSaleBill(TENANT_ID, dto, 'admin');
      await salesService.postSaleBill(TENANT_ID, created.id);

      const report = await service.generateProfitAndLoss({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      // Revenue should be positive (credit-normal account)
      expect(report.revenueRows.length).toBeGreaterThan(0);
      expect(report.totalRevenue).toBeGreaterThan(0);
      expect(report.grossProfit).toBeGreaterThan(0);
    });
  });

  describe('generateBalanceSheet', () => {
    it('returns empty Balance Sheet when no entries exist', async () => {
      const report = await service.generateBalanceSheet({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(report.assetRows).toHaveLength(0);
      expect(report.liabilityRows).toHaveLength(0);
      expect(report.equityRows).toHaveLength(0);
      expect(report.isBalanced).toBe(true);
    });

    it('shows assets from posted purchase', async () => {
      const purchaseService = new PurchaseService(
        createMockCOARepo(),
        voucherRepo,
        createMockInventoryRepo(),
        createMockSupplierRepo(),
      );

      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Test purchase for BS',
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

      const created = await purchaseService.createPurchaseBill(TENANT_ID, dto, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, created.id);

      const report = await service.generateBalanceSheet({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      // Should have some asset rows (Inventory, Tax Input)
      expect(report.assetRows.length).toBeGreaterThan(0);
      expect(report.totalAssets).toBeGreaterThan(0);
    });
  });

  describe('double-entry integrity', () => {
    it('trial balance is always balanced after sale + purchase cycle', async () => {
      const salesService = new SalesService(
        createMockCOARepo(),
        voucherRepo,
        createMockInventoryRepo(),
        createMockCustomerRepo(),
      );

      const purchaseService = new PurchaseService(
        createMockCOARepo(),
        voucherRepo,
        createMockInventoryRepo(),
        createMockSupplierRepo(),
      );

      // Post a purchase
      const purchaseDto = {
        supplierId: 'supp-1',
        date: '2025-06-10',
        warehouseId: 'wh-1',
        narration: 'Purchase',
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
      const purchaseCreated = await purchaseService.createPurchaseBill(TENANT_ID, purchaseDto, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, purchaseCreated.id);

      // Post a sale
      const saleDto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Sale',
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
      const saleCreated = await salesService.createSaleBill(TENANT_ID, saleDto, 'admin');
      await salesService.postSaleBill(TENANT_ID, saleCreated.id);

      // Trial Balance must be balanced
      const tb = await service.generateTrialBalance({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(tb.isBalanced).toBe(true);
      expect(tb.totalClosingDebit).toBeCloseTo(tb.totalClosingCredit, 2);
    });
  });
});
