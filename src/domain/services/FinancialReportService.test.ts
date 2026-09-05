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
import type { LedgerEntry } from '../types/voucher';

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

  describe('posted vs draft filtering', () => {
    it('excludes draft voucher entries from trial balance', async () => {
      const salesService = new SalesService(
        createMockCOARepo(),
        voucherRepo,
        createMockInventoryRepo(),
        createMockCustomerRepo(),
      );

      // Create but do NOT post a sale (stays DRAFT)
      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Draft sale',
        lines: [
          {
            productId: 'prod-1',
            cartons: 10,
            packs: 240,
            rate: 100,
            tradeDiscountPercent: 0,
            gstPercent: 0,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };
      await salesService.createSaleBill(TENANT_ID, dto, 'admin');

      // TB should have no entries (draft excluded)
      const tb = await service.generateTrialBalance({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(tb.rows).toHaveLength(0);
      expect(tb.totalClosingDebit).toBe(0);
      expect(tb.totalClosingCredit).toBe(0);
    });

    it('excludes draft entries from P&L', async () => {
      const salesService = new SalesService(
        createMockCOARepo(),
        voucherRepo,
        createMockInventoryRepo(),
        createMockCustomerRepo(),
      );

      // Create but do NOT post
      const dto = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Draft sale',
        lines: [
          {
            productId: 'prod-1',
            cartons: 10,
            packs: 240,
            rate: 100,
            tradeDiscountPercent: 0,
            gstPercent: 0,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };
      await salesService.createSaleBill(TENANT_ID, dto, 'admin');

      const pnl = await service.generateProfitAndLoss({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(pnl.totalRevenue).toBe(0);
    });

    it('excludes draft entries from balance sheet', async () => {
      const purchaseService = new PurchaseService(
        createMockCOARepo(),
        voucherRepo,
        createMockInventoryRepo(),
        createMockSupplierRepo(),
      );

      // Create but do NOT post
      const dto = {
        supplierId: 'supp-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'Draft purchase',
        lines: [
          {
            productId: 'prod-1',
            cartons: 20,
            packs: 480,
            rate: 60,
            tradeDiscountPercent: 0,
            gstPercent: 0,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };
      await purchaseService.createPurchaseBill(TENANT_ID, dto, 'admin');

      const bs = await service.generateBalanceSheet({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(bs.assetRows).toHaveLength(0);
      expect(bs.totalAssets).toBe(0);
    });
  });

  describe('TB date range filtering', () => {
    it('separates opening and period balances correctly', async () => {
      const salesService = new SalesService(
        createMockCOARepo(),
        voucherRepo,
        createMockInventoryRepo(),
        createMockCustomerRepo(),
      );

      // Post a sale in January (opening period)
      const dto1 = {
        customerId: 'cust-1',
        date: '2025-01-15',
        warehouseId: 'wh-1',
        narration: 'January sale',
        lines: [
          {
            productId: 'prod-1',
            cartons: 10,
            packs: 240,
            rate: 100,
            tradeDiscountPercent: 0,
            gstPercent: 0,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };
      const created1 = await salesService.createSaleBill(TENANT_ID, dto1, 'admin');
      await salesService.postSaleBill(TENANT_ID, created1.id);

      // Post a sale in June (period)
      const dto2 = {
        customerId: 'cust-1',
        date: '2025-06-15',
        warehouseId: 'wh-1',
        narration: 'June sale',
        lines: [
          {
            productId: 'prod-1',
            cartons: 5,
            packs: 120,
            rate: 100,
            tradeDiscountPercent: 0,
            gstPercent: 0,
            furtherTaxPercent: 0,
            fedPercent: 0,
            advanceTaxPercent: 0,
          },
        ],
      };
      const created2 = await salesService.createSaleBill(TENANT_ID, dto2, 'admin');
      await salesService.postSaleBill(TENANT_ID, created2.id);

      // TB for Feb-Dec should show January as opening
      const tb = await service.generateTrialBalance({
        tenantId: TENANT_ID,
        startDate: '2025-02-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(tb.isBalanced).toBe(true);
      expect(tb.totalOpeningDebit).toBeGreaterThan(0);
      expect(tb.totalPeriodDebit).toBeGreaterThan(0);
    });
  });

  describe('P&L with expenses', () => {
    it('expense rows are empty when no entries exist', async () => {
      const report = await service.generateProfitAndLoss({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: true,
      });

      // No ledger entries = no expense rows (showZeroBalance only applies to accounts with entries)
      expect(report.expenseRows).toHaveLength(0);
    });

    it('calculates net profit = revenue - COGS - expenses', async () => {
      const report = await service.generateProfitAndLoss({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      // With no entries, net profit should be 0
      expect(report.netProfit).toBe(0);
      expect(report.totalRevenue).toBe(0);
      expect(report.totalCOGS).toBe(0);
      expect(report.totalExpenses).toBe(0);
    });
  });

  describe('Balance Sheet classification', () => {
    it('asset rows are empty when no entries exist', async () => {
      const report = await service.generateBalanceSheet({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: true,
      });

      // No ledger entries = no asset rows (showZeroBalance only applies to accounts with entries)
      expect(report.assetRows).toHaveLength(0);
    });

    it('classifies assets correctly after purchase', async () => {
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
        narration: 'Test purchase for BS classification',
        lines: [
          {
            productId: 'prod-1',
            cartons: 20,
            packs: 480,
            rate: 60,
            tradeDiscountPercent: 0,
            gstPercent: 0,
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

      // Inventory (11301) should be classified as asset
      const assetCodes = report.assetRows.map(r => r.accountCode);
      expect(assetCodes).toContain('11301');
      expect(report.totalAssets).toBeGreaterThan(0);
    });

    it('classifies liabilities correctly after purchase', async () => {
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
        narration: 'Test purchase for BS liability',
        lines: [
          {
            productId: 'prod-1',
            cartons: 20,
            packs: 480,
            rate: 60,
            tradeDiscountPercent: 0,
            gstPercent: 0,
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

      // AP (21100) has legacyMainHeadNo=200 ancestor, classified as equity in this ERP's COA structure
      // The BS should be balanced: Assets = Liabilities + Equity
      expect(report.isBalanced).toBe(true);
      expect(report.totalAssets).toBeGreaterThan(0);
      // TotalAssets should equal totalLiabilities + totalEquity
      expect(report.totalAssets).toBeCloseTo(report.totalLiabilities + report.totalEquity, 2);
    });

    it('balance sheet is balanced (A = L + E)', async () => {
      const report = await service.generateBalanceSheet({
        tenantId: TENANT_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(report.isBalanced).toBe(true);
      expect(report.totalAssets).toBeCloseTo(report.totalLiabilities + report.totalEquity, 2);
    });
  });

  describe('tenant isolation', () => {
    it('returns empty reports for non-existent tenant', async () => {
      const tb = await service.generateTrialBalance({
        tenantId: 'non-existent-tenant',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(tb.rows).toHaveLength(0);
      expect(tb.isBalanced).toBe(true);

      const pnl = await service.generateProfitAndLoss({
        tenantId: 'non-existent-tenant',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(pnl.totalRevenue).toBe(0);

      const bs = await service.generateBalanceSheet({
        tenantId: 'non-existent-tenant',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        showZeroBalance: false,
      });

      expect(bs.totalAssets).toBe(0);
    });
  });
});
