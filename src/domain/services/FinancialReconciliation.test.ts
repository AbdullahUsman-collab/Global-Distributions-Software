/**
 * Financial Reconciliation Test Suite
 * Proves mathematical consistency across all financial modules:
 *   Transaction → GL → Account Balance → Trial Balance → Financial Reports →
 *   Party Balances → Aging → Cash/Bank → Dashboard
 *
 * Step 31: Financial Accounting & Reporting Reconciliation Audit
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FinancialReportService } from './FinancialReportService';
import { SalesService } from './SalesService';
import { PurchaseService } from './PurchaseService';
import { SaleReturnService } from './SaleReturnService';
import { PurchaseReturnService } from './PurchaseReturnService';
import { CustomerReceiptService } from './CustomerReceiptService';
import { CashBookService } from './CashBookService';
import { PartyBalanceService } from './PartyBalanceService';
import { AgingReportService } from './AgingReportService';
import { BillsListService } from './BillsListService';
import { DashboardService } from './DashboardService';
import {
  TENANT_ID,
  createMockCOARepo,
  createMockVoucherRepo,
  createMockInventoryRepo,
  createMockCustomerRepo,
  createMockSupplierRepo,
  resetCounters,
  SEED_CUSTOMERS,
  SEED_SUPPLIERS,
  SEED_PRODUCTS,
} from '../test-helpers';

/* ─── Helpers ────────────────────────────────────────────── */

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function saleLine(productId: string, packs: number, rate: number) {
  return {
    productId,
    cartons: 0,
    packs,
    rate,
    tradeDiscountPercent: 0,
    gstPercent: 0,
    furtherTaxPercent: 0,
    fedPercent: 0,
    advanceTaxPercent: 0,
  };
}

function saleLineWithTax(productId: string, packs: number, rate: number, gstPercent: number) {
  return {
    productId,
    cartons: 0,
    packs,
    rate,
    tradeDiscountPercent: 0,
    gstPercent,
    furtherTaxPercent: 0,
    fedPercent: 0,
    advanceTaxPercent: 0,
  };
}

function purchaseLine(productId: string, packs: number, rate: number) {
  return {
    productId,
    cartons: 0,
    packs,
    rate,
    tradeDiscountPercent: 0,
    gstPercent: 0,
    furtherTaxPercent: 0,
    fedPercent: 0,
    advanceTaxPercent: 0,
  };
}

/* ════════════════════════════════════════════════════════════ */
/* FINANCIAL RECONCILIATION TESTS                              */
/* ════════════════════════════════════════════════════════════ */

describe('Step 31: Financial Reconciliation', () => {
  let financialReportService: FinancialReportService;
  let salesService: SalesService;
  let purchaseService: PurchaseService;
  let saleReturnService: SaleReturnService;
  let purchaseReturnService: PurchaseReturnService;
  let customerReceiptService: CustomerReceiptService;
  let cashBookService: CashBookService;
  let partyBalanceService: PartyBalanceService;
  let agingReportService: AgingReportService;
  let billsListService: BillsListService;
  let dashboardService: DashboardService;
  let voucherRepo: ReturnType<typeof createMockVoucherRepo>;
  let coaRepo: ReturnType<typeof createMockCOARepo>;
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

    financialReportService = new FinancialReportService(coaRepo, voucherRepo);
    salesService = new SalesService(coaRepo, voucherRepo, inventoryRepo, customerRepo);
    purchaseService = new PurchaseService(coaRepo, voucherRepo, inventoryRepo, supplierRepo);
    saleReturnService = new SaleReturnService(voucherRepo, inventoryRepo, customerRepo);
    purchaseReturnService = new PurchaseReturnService(voucherRepo, inventoryRepo, supplierRepo);
    customerReceiptService = new CustomerReceiptService(coaRepo, voucherRepo, customerRepo);
    cashBookService = new CashBookService(coaRepo, voucherRepo);
    partyBalanceService = new PartyBalanceService(voucherRepo, coaRepo, customerRepo, supplierRepo);
    agingReportService = new AgingReportService(voucherRepo, coaRepo, customerRepo, supplierRepo);
    billsListService = new BillsListService(voucherRepo, customerRepo, supplierRepo, inventoryRepo);
    dashboardService = new DashboardService(
      voucherRepo, inventoryRepo, coaRepo, customerRepo, supplierRepo,
      cashBookService, financialReportService,
    );
  });

  /* ══════════════════════════════════════════════════════════ */
  /* TRIAL BALANCE RECONCILIATION                              */
  /* ══════════════════════════════════════════════════════════ */

  describe('Trial Balance', () => {
    it('balanced on empty database', async () => {
      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalClosingDebit).toBeCloseTo(tb.totalClosingCredit, 2);
    });

    it('balanced after single sale', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'TB test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalClosingDebit).toBeCloseTo(tb.totalClosingCredit, 2);
    });

    it('balanced after single purchase', async () => {
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'TB test', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 20, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalClosingDebit).toBeCloseTo(tb.totalClosingCredit, 2);
    });

    it('balanced after sale + receipt', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Sale', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id,
        cashAccountId: 'acc-11101',
        amount: 500,
        date: today(),
        narration: 'Partial receipt',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalClosingDebit).toBeCloseTo(tb.totalClosingCredit, 2);
    });

    it('balanced after purchase + payment', async () => {
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'Purchase', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 20, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: 'acc-11101',
        debitAccountId: 'acc-21100',
        amount: 500,
        date: today(),
        narration: 'Partial payment',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalClosingDebit).toBeCloseTo(tb.totalClosingCredit, 2);
    });

    it('balanced after sale return', async () => {
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Return', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 5, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalClosingDebit).toBeCloseTo(tb.totalClosingCredit, 2);
    });

    it('balanced after purchase return', async () => {
      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'PRV', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 10, 60)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalClosingDebit).toBeCloseTo(tb.totalClosingCredit, 2);
    });

    it('balanced with multiple transactions', async () => {
      // Purchase 100
      const pv1 = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'P1', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 100, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv1.id);

      // Sale 40
      const sv1 = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'S1', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 40, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv1.id);

      // Receipt
      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, cashAccountId: 'acc-11101', amount: 2000,
        date: today(), narration: 'R1',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      // Sale return 5
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'SR1', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 5, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      // Supplier payment
      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: 'acc-11101', debitAccountId: 'acc-21100', amount: 1500,
        date: today(), narration: 'SP1',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      // Purchase return 10
      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'PR1', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 10, 60)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalClosingDebit).toBeCloseTo(tb.totalClosingCredit, 2);
    });

    it('no NaN or Infinity in report values', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'NaN test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31', showZeroBalance: true,
      });

      expect(isFinite(tb.totalClosingDebit)).toBe(true);
      expect(isFinite(tb.totalClosingCredit)).toBe(true);
      expect(isFinite(tb.totalOpeningDebit)).toBe(true);
      expect(isFinite(tb.totalOpeningCredit)).toBe(true);
      expect(isFinite(tb.totalPeriodDebit)).toBe(true);
      expect(isFinite(tb.totalPeriodCredit)).toBe(true);
      expect(isNaN(tb.totalClosingDebit)).toBe(false);
      expect(isNaN(tb.totalClosingCredit)).toBe(false);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* GL DEBIT/CREDIT EQUALITY                                  */
  /* ══════════════════════════════════════════════════════════ */

  describe('GL Debit/Credit Equality', () => {
    it('every posted voucher has balanced debits = credits', async () => {
      // Create multiple transaction types
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'S', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'P', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 20, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'SR', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 3, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'PR', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 5, 60)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, cashAccountId: 'acc-11101', amount: 500,
        date: today(), narration: 'CR',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: 'acc-11101', debitAccountId: 'acc-21100', amount: 300,
        date: today(), narration: 'CP',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      // Verify all posted vouchers have balanced ledger entries
      const allVouchers = await voucherRepo.getVouchersByTenantId(TENANT_ID, { status: 'POSTED' });
      for (const v of allVouchers) {
        const entries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: v.id });
        if (entries.length === 0) continue; // Skip seed vouchers
        const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
        const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
        expect(totalDebit).toBeCloseTo(totalCredit, 2);
      }
    });

    it('ledger total debits = total credits across all entries', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Ledger test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const allEntries = await voucherRepo.getLedgerEntries(TENANT_ID);
      const totalDebit = allEntries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = allEntries.reduce((s, e) => s + e.credit, 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* AR ↔ AGING RECONCILIATION                                 */
  /* ══════════════════════════════════════════════════════════ */

  describe('AR Reconciliation', () => {
    it('partyBalance matches aging after sale', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'AR test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const balance = await partyBalanceService.getPartyBalance(
        TENANT_ID, SEED_CUSTOMERS[0].id, 'customer',
        SEED_CUSTOMERS[0].accountHeadId, SEED_CUSTOMERS[0].name,
      );
      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRow = aging.rows.find(r => r.partyId === SEED_CUSTOMERS[0].id);

      expect(agingRow).toBeDefined();
      expect(balance.outstandingBalance).toBeCloseTo(agingRow!.totalOutstanding, 2);
    });

    it('partyBalance matches aging after receipt', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Sale', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, cashAccountId: 'acc-11101', amount: 500,
        date: today(), narration: 'Receipt',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      const balance = await partyBalanceService.getPartyBalance(
        TENANT_ID, SEED_CUSTOMERS[0].id, 'customer',
        SEED_CUSTOMERS[0].accountHeadId, SEED_CUSTOMERS[0].name,
      );
      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRow = aging.rows.find(r => r.partyId === SEED_CUSTOMERS[0].id);

      expect(agingRow).toBeDefined();
      expect(balance.outstandingBalance).toBeCloseTo(agingRow!.totalOutstanding, 2);
    });

    it('partyBalance matches aging after sale return', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Sale', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Return', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 3, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      const balance = await partyBalanceService.getPartyBalance(
        TENANT_ID, SEED_CUSTOMERS[0].id, 'customer',
        SEED_CUSTOMERS[0].accountHeadId, SEED_CUSTOMERS[0].name,
      );
      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRow = aging.rows.find(r => r.partyId === SEED_CUSTOMERS[0].id);

      expect(agingRow).toBeDefined();
      expect(balance.outstandingBalance).toBeCloseTo(agingRow!.totalOutstanding, 2);
    });

    it('aging grand total matches sum of all customer balances', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'S1', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const balances = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const totalOutstanding = balances.reduce((s, b) => s + b.outstandingBalance, 0);

      expect(aging.grandTotal).toBeCloseTo(totalOutstanding, 2);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* AP ↔ AGING RECONCILIATION                                 */
  /* ══════════════════════════════════════════════════════════ */

  describe('AP Reconciliation', () => {
    it('partyBalance matches aging after purchase', async () => {
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'AP test', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 20, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const balance = await partyBalanceService.getPartyBalance(
        TENANT_ID, SEED_SUPPLIERS[0].id, 'supplier',
        SEED_SUPPLIERS[0].accountHeadId, SEED_SUPPLIERS[0].name,
      );
      const aging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());
      const agingRow = aging.rows.find(r => r.partyId === SEED_SUPPLIERS[0].id);

      expect(agingRow).toBeDefined();
      expect(balance.outstandingBalance).toBeCloseTo(agingRow!.totalOutstanding, 2);
    });

    it('partyBalance matches aging after payment', async () => {
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'Purchase', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 20, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: 'acc-11101', debitAccountId: 'acc-21100', amount: 500,
        date: today(), narration: 'Payment',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      const balance = await partyBalanceService.getPartyBalance(
        TENANT_ID, SEED_SUPPLIERS[0].id, 'supplier',
        SEED_SUPPLIERS[0].accountHeadId, SEED_SUPPLIERS[0].name,
      );
      const aging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());
      const agingRow = aging.rows.find(r => r.partyId === SEED_SUPPLIERS[0].id);

      expect(agingRow).toBeDefined();
      expect(balance.outstandingBalance).toBeCloseTo(agingRow!.totalOutstanding, 2);
    });

    it('aging supplier grand total matches sum of all supplier balances', async () => {
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'P1', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 20, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const aging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());
      const balances = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const totalOutstanding = balances.reduce((s, b) => s + b.outstandingBalance, 0);

      expect(aging.grandTotal).toBeCloseTo(totalOutstanding, 2);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* CASH BOOK RECONCILIATION                                  */
  /* ══════════════════════════════════════════════════════════ */

  describe('CashBook Reconciliation', () => {
    it('closing balance = opening + receipts - payments', async () => {
      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, cashAccountId: 'acc-11101', amount: 1000,
        date: today(), narration: 'Receipt',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: 'acc-11101', debitAccountId: 'acc-21100', amount: 300,
        date: today(), narration: 'Payment',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      const cashBook = await cashBookService.getCashBook(TENANT_ID, 'acc-11101', '2020-01-01', '2030-12-31');

      const expectedClosing = cashBook.openingBalance + cashBook.totalReceipts - cashBook.totalPayments;
      expect(cashBook.closingBalance).toBeCloseTo(expectedClosing, 2);
    });

    it('receipt increases cash, payment decreases cash', async () => {
      const before = await cashBookService.getCashBook(TENANT_ID, 'acc-11101', '2020-01-01', '2030-12-31');

      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, cashAccountId: 'acc-11101', amount: 500,
        date: today(), narration: 'Receipt',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      const afterReceipt = await cashBookService.getCashBook(TENANT_ID, 'acc-11101', '2020-01-01', '2030-12-31');
      expect(afterReceipt.closingBalance).toBeCloseTo(before.closingBalance + 500, 2);

      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: 'acc-11101', debitAccountId: 'acc-21100', amount: 200,
        date: today(), narration: 'Payment',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      const afterPayment = await cashBookService.getCashBook(TENANT_ID, 'acc-11101', '2020-01-01', '2030-12-31');
      expect(afterPayment.closingBalance).toBeCloseTo(before.closingBalance + 500 - 200, 2);
    });

    it('no NaN in cash book values', async () => {
      const cashBook = await cashBookService.getCashBook(TENANT_ID, 'acc-11101', '2020-01-01', '2030-12-31');
      expect(isFinite(cashBook.openingBalance)).toBe(true);
      expect(isFinite(cashBook.closingBalance)).toBe(true);
      expect(isFinite(cashBook.totalReceipts)).toBe(true);
      expect(isFinite(cashBook.totalPayments)).toBe(true);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* DASHBOARD ↔ SOURCE RECONCILIATION                         */
  /* ══════════════════════════════════════════════════════════ */

  describe('Dashboard Reconciliation', () => {
    it('dashboard receivables matches aging grand total', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Dash test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const dashboard = await dashboardService.getDashboardData(TENANT_ID, 'year');
      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());

      expect(dashboard.receivables.grandTotal).toBeCloseTo(aging.grandTotal, 2);
    });

    it('dashboard payables matches aging grand total', async () => {
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'Dash test', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 20, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const dashboard = await dashboardService.getDashboardData(TENANT_ID, 'year');
      const aging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());

      expect(dashboard.payables.grandTotal).toBeCloseTo(aging.grandTotal, 2);
    });

    it('dashboard cash position matches cash book closing', async () => {
      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, cashAccountId: 'acc-11101', amount: 1000,
        date: today(), narration: 'Cash test',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      const dashboard = await dashboardService.getDashboardData(TENANT_ID, 'year');
      const cashBook = await cashBookService.getCashBook(TENANT_ID, 'acc-11101', '2020-01-01', '2030-12-31');

      expect(dashboard.cashPosition.totalBalance).toBeCloseTo(cashBook.closingBalance, 2);
    });

    it('dashboard sales count matches billsList posted sales count', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Count test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 5, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const dashboard = await dashboardService.getDashboardData(TENANT_ID, 'year');
      const bills = await billsListService.getAllBills(TENANT_ID);
      const postedSales = bills.filter(b => b.voucher.voucherType === 'SV' && b.voucher.status === 'POSTED');

      expect(dashboard.sales.count).toBe(postedSales.length);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* TAX RECONCILIATION                                        */
  /* ══════════════════════════════════════════════════════════ */

  describe('Tax Reconciliation', () => {
    it('sale with GST: tax output ledger matches calculated tax', async () => {
      const packs = 10;
      const rate = 100;
      const gstPercent = 18;
      const baseAmount = packs * rate; // 1000
      const gstAmount = baseAmount * gstPercent / 100; // 180

      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Tax test', warehouseId: 'wh-1',
        lines: [saleLineWithTax(SEED_PRODUCTS[0].id, packs, rate, gstPercent)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const entries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: sv.id });
      const taxEntries = entries.filter(e => e.accountId === '21201');
      const totalTaxCredit = taxEntries.reduce((s, e) => s + e.credit, 0);

      expect(totalTaxCredit).toBeCloseTo(gstAmount, 2);
    });

    it('purchase with GST: tax input ledger matches calculated tax', async () => {
      const packs = 20;
      const rate = 60;
      const gstPercent = 18;
      const baseAmount = packs * rate; // 1200
      const gstAmount = baseAmount * gstPercent / 100; // 216

      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'Tax test', warehouseId: 'wh-1',
        lines: [{ ...purchaseLine(SEED_PRODUCTS[0].id, packs, rate), gstPercent }],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const entries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: pv.id });
      const taxEntries = entries.filter(e => e.accountId === '11401');
      const totalTaxDebit = taxEntries.reduce((s, e) => s + e.debit, 0);

      expect(totalTaxDebit).toBeCloseTo(gstAmount, 2);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* DRAFT vs POSTED LIFECYCLE                                 */
  /* ══════════════════════════════════════════════════════════ */

  describe('Draft vs Posted Lifecycle', () => {
    it('draft does not affect trial balance', async () => {
      const before = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });

      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Draft test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');

      const after = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });

      expect(after.totalClosingDebit).toBeCloseTo(before.totalClosingDebit, 2);
      expect(after.totalClosingCredit).toBeCloseTo(before.totalClosingCredit, 2);
    });

    it('posting creates ledger entries, draft does not', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Draft test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');

      const draftEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: sv.id });
      expect(draftEntries).toHaveLength(0);

      await salesService.postSaleBill(TENANT_ID, sv.id);

      const postedEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: sv.id });
      expect(postedEntries.length).toBeGreaterThan(0);
    });

    it('posted voucher cannot be deleted', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Delete test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      await expect(salesService.deleteSaleBill(TENANT_ID, sv.id)).rejects.toThrow();
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* RETURNS RECONCILIATION                                    */
  /* ══════════════════════════════════════════════════════════ */

  describe('Returns Reconciliation', () => {
    it('sale return decreases customer outstanding', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Sale', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const before = await partyBalanceService.getPartyBalance(
        TENANT_ID, SEED_CUSTOMERS[0].id, 'customer',
        SEED_CUSTOMERS[0].accountHeadId, SEED_CUSTOMERS[0].name,
      );

      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Return', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 3, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      const after = await partyBalanceService.getPartyBalance(
        TENANT_ID, SEED_CUSTOMERS[0].id, 'customer',
        SEED_CUSTOMERS[0].accountHeadId, SEED_CUSTOMERS[0].name,
      );

      expect(after.outstandingBalance).toBeLessThan(before.outstandingBalance);
    });

    it('purchase return decreases supplier outstanding', async () => {
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'Purchase', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 20, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const before = await partyBalanceService.getPartyBalance(
        TENANT_ID, SEED_SUPPLIERS[0].id, 'supplier',
        SEED_SUPPLIERS[0].accountHeadId, SEED_SUPPLIERS[0].name,
      );

      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'Return', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 5, 60)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      const after = await partyBalanceService.getPartyBalance(
        TENANT_ID, SEED_SUPPLIERS[0].id, 'supplier',
        SEED_SUPPLIERS[0].accountHeadId, SEED_SUPPLIERS[0].name,
      );

      expect(after.outstandingBalance).toBeLessThan(before.outstandingBalance);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* MULTI-TRANSACTION RECONCILIATION                          */
  /* ══════════════════════════════════════════════════════════ */

  describe('Multi-Transaction Reconciliation', () => {
    it('full lifecycle: purchase → sale → receipt → return → payment → PRV — all modules agree', async () => {
      const product = SEED_PRODUCTS[0];
      const customer = SEED_CUSTOMERS[0];
      const supplier = SEED_SUPPLIERS[0];

      // 1. Purchase 100 units @ 60
      const pv1 = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'P1', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 100, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv1.id);

      // 2. Sale 40 units @ 100
      const sv1 = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'S1', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 40, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv1.id);

      // 3. Customer receipt 2000
      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: customer.id, cashAccountId: 'acc-11101', amount: 2000,
        date: today(), narration: 'CR1',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      // 4. Sale return 5 units
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'SR1', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      // 5. Supplier payment 1500
      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: 'acc-11101', debitAccountId: 'acc-21100', amount: 1500,
        date: today(), narration: 'CP1',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      // 6. Purchase return 10 units
      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'PR1', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 10, 60)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      // === RECONCILIATION ===

      // Trial Balance
      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalClosingDebit).toBeCloseTo(tb.totalClosingCredit, 2);

      // Customer AR: Aging = PartyBalance
      const custBalance = await partyBalanceService.getPartyBalance(
        TENANT_ID, customer.id, 'customer', customer.accountHeadId, customer.name,
      );
      const custAging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const custAgingRow = custAging.rows.find(r => r.partyId === customer.id);
      expect(custAgingRow).toBeDefined();
      expect(custBalance.outstandingBalance).toBeCloseTo(custAgingRow!.totalOutstanding, 2);

      // Supplier AP: Aging = PartyBalance
      const suppBalance = await partyBalanceService.getPartyBalance(
        TENANT_ID, supplier.id, 'supplier', supplier.accountHeadId, supplier.name,
      );
      const suppAging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());
      const suppAgingRow = suppAging.rows.find(r => r.partyId === supplier.id);
      expect(suppAgingRow).toBeDefined();
      expect(suppBalance.outstandingBalance).toBeCloseTo(suppAgingRow!.totalOutstanding, 2);

      // Dashboard ↔ Aging
      const dashboard = await dashboardService.getDashboardData(TENANT_ID, 'year');
      expect(dashboard.receivables.grandTotal).toBeCloseTo(custAging.grandTotal, 2);
      expect(dashboard.payables.grandTotal).toBeCloseTo(suppAging.grandTotal, 2);

      // CashBook
      const cashBook = await cashBookService.getCashBook(TENANT_ID, 'acc-11101', '2020-01-01', '2030-12-31');
      expect(cashBook.closingBalance).toBeCloseTo(
        cashBook.openingBalance + cashBook.totalReceipts - cashBook.totalPayments, 2,
      );
      expect(dashboard.cashPosition.totalBalance).toBeCloseTo(cashBook.closingBalance, 2);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* TENANT ISOLATION                                          */
  /* ══════════════════════════════════════════════════════════ */

  describe('Tenant Isolation', () => {
    const TENANT_B = 'tenant-b-isolation-test';

    it('Tenant A data invisible to Tenant B across all modules', async () => {
      // Create a sale in Tenant A (TENANT_ID)
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'Tenant A sale', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      // Check Tenant B has no data
      const tbB = await financialReportService.generateTrialBalance({
        tenantId: TENANT_B, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tbB.totalClosingDebit).toBe(0);
      expect(tbB.totalClosingCredit).toBe(0);

      const agingB = await agingReportService.generateReport(TENANT_B, 'customer', today());
      expect(agingB.grandTotal).toBe(0);

      const billsB = await billsListService.getAllBills(TENANT_B);
      expect(billsB).toHaveLength(0);

      const balancesB = await partyBalanceService.getCustomerBalances(TENANT_B);
      expect(balancesB).toHaveLength(0);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* P&L RECONCILIATION                                        */
  /* ══════════════════════════════════════════════════════════ */

  describe('P&L Reconciliation', () => {
    it('P&L shows revenue from posted sales', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'P&L test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const pl = await financialReportService.generateProfitAndLoss({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });

      expect(pl.totalRevenue).toBeGreaterThan(0);
      expect(isFinite(pl.totalRevenue)).toBe(true);
      expect(isFinite(pl.netProfit)).toBe(true);
    });

    it('P&L excludes balance sheet accounts', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'P&L exclusion test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const pl = await financialReportService.generateProfitAndLoss({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });

      // Revenue rows should not include AR (11201) or Inventory (11301)
      const accountCodes = [...pl.revenueRows, ...pl.cogsRows, ...pl.expenseRows].map(r => r.accountCode);
      expect(accountCodes).not.toContain('11201');
      expect(accountCodes).not.toContain('11301');
      expect(accountCodes).not.toContain('11101');
      expect(accountCodes).not.toContain('21100');
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* BALANCE SHEET RECONCILIATION                              */
  /* ══════════════════════════════════════════════════════════ */

  describe('Balance Sheet Reconciliation', () => {
    it('Assets = Liabilities + Equity', async () => {
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: SEED_CUSTOMERS[0].id, date: today(), narration: 'BS test', warehouseId: 'wh-1',
        lines: [saleLine(SEED_PRODUCTS[0].id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: SEED_SUPPLIERS[0].id, date: today(), narration: 'BS test', warehouseId: 'wh-1',
        lines: [purchaseLine(SEED_PRODUCTS[0].id, 20, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const bs = await financialReportService.generateBalanceSheet({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });

      expect(bs.isBalanced).toBe(true);
      expect(bs.totalAssets).toBeCloseTo(bs.totalLiabilities + bs.totalEquity, 2);
      expect(isFinite(bs.totalAssets)).toBe(true);
      expect(isFinite(bs.totalLiabilities)).toBe(true);
      expect(isFinite(bs.totalEquity)).toBe(true);
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* ACCOUNT RESOLUTION                                        */
  /* ══════════════════════════════════════════════════════════ */

  describe('Account Resolution', () => {
    it('all hardcoded account codes exist in COA', async () => {
      const accounts = await coaRepo.getAccountsByTenantId(TENANT_ID);
      const codes = new Set(accounts.map(a => a.accountCode));

      // Accounts used by SalesService
      expect(codes.has('41101')).toBe(true); // Sales Revenue
      expect(codes.has('21201')).toBe(true); // Sales Tax Output
      expect(codes.has('21202')).toBe(true); // Withholding Tax Payable
      expect(codes.has('21203')).toBe(true); // FED Payable

      // Accounts used by PurchaseService
      expect(codes.has('11301')).toBe(true); // Inventory
      expect(codes.has('11401')).toBe(true); // Tax Input
      expect(codes.has('11402')).toBe(true); // Advance Income Tax
      expect(codes.has('11403')).toBe(true); // FED Input
      expect(codes.has('21100')).toBe(true); // Accounts Payable

      // Accounts used by CashBookService/CustomerReceiptService
      expect(codes.has('11101')).toBe(true); // Cash in Hand
      expect(codes.has('11102')).toBe(true); // Bank Account Main

      // Accounts used by SaleReturnService
      expect(codes.has('41104')).toBe(true); // Sales Return
    });

    it('all seed customer AR accounts exist in COA', async () => {
      const accounts = await coaRepo.getAccountsByTenantId(TENANT_ID);
      const codes = new Set(accounts.map(a => a.accountCode));

      for (const customer of SEED_CUSTOMERS) {
        const coaAccount = await coaRepo.getAccountById(TENANT_ID, customer.accountHeadId);
        expect(coaAccount).toBeDefined();
        expect(codes.has(coaAccount!.accountCode)).toBe(true);
      }
    });

    it('all seed supplier AP accounts exist in COA', async () => {
      const accounts = await coaRepo.getAccountsByTenantId(TENANT_ID);
      const codes = new Set(accounts.map(a => a.accountCode));

      for (const supplier of SEED_SUPPLIERS) {
        const coaAccount = await coaRepo.getAccountById(TENANT_ID, supplier.accountHeadId);
        expect(coaAccount).toBeDefined();
        expect(codes.has(coaAccount!.accountCode)).toBe(true);
      }
    });
  });

  /* ══════════════════════════════════════════════════════════ */
  /* REPORT CROSS-CHECK MATRIX                                 */
  /* ══════════════════════════════════════════════════════════ */

  describe('Cross-Report Reconciliation Matrix', () => {
    it('all financial modules agree after complex scenario', async () => {
      const customer = SEED_CUSTOMERS[0];
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      // Purchase 50 @ 60 = 3000
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'Matrix P', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 50, 60)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      // Sale 20 @ 100 = 2000
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'Matrix S', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 20, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      // Receipt 800
      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: customer.id, cashAccountId: 'acc-11101', amount: 800,
        date: today(), narration: 'Matrix CR',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      // Supplier payment 1000
      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: 'acc-11101', debitAccountId: 'acc-21100', amount: 1000,
        date: today(), narration: 'Matrix CP',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      // Sale return 3 @ 100 = 300
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'Matrix SR', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 3, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      // Purchase return 5 @ 60 = 300
      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'Matrix PR', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 5, 60)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      // === ALL MODULES MUST AGREE ===

      // 1. Trial Balance
      const tb = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(tb.isBalanced).toBe(true);

      // 2. Customer: PartyBalance = Aging
      const custBal = await partyBalanceService.getPartyBalance(
        TENANT_ID, customer.id, 'customer', customer.accountHeadId, customer.name,
      );
      const custAging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const custRow = custAging.rows.find(r => r.partyId === customer.id);
      expect(custRow).toBeDefined();
      expect(custBal.outstandingBalance).toBeCloseTo(custRow!.totalOutstanding, 2);

      // 3. Supplier: PartyBalance = Aging
      const suppBal = await partyBalanceService.getPartyBalance(
        TENANT_ID, supplier.id, 'supplier', supplier.accountHeadId, supplier.name,
      );
      const suppAging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());
      const suppRow = suppAging.rows.find(r => r.partyId === supplier.id);
      expect(suppRow).toBeDefined();
      expect(suppBal.outstandingBalance).toBeCloseTo(suppRow!.totalOutstanding, 2);

      // 4. Dashboard ↔ Aging
      const dash = await dashboardService.getDashboardData(TENANT_ID, 'year');
      expect(dash.receivables.grandTotal).toBeCloseTo(custAging.grandTotal, 2);
      expect(dash.payables.grandTotal).toBeCloseTo(suppAging.grandTotal, 2);

      // 5. Dashboard ↔ CashBook
      const cashBook = await cashBookService.getCashBook(TENANT_ID, 'acc-11101', '2020-01-01', '2030-12-31');
      expect(dash.cashPosition.totalBalance).toBeCloseTo(cashBook.closingBalance, 2);

      // 6. CashBook equation
      expect(cashBook.closingBalance).toBeCloseTo(
        cashBook.openingBalance + cashBook.totalReceipts - cashBook.totalPayments, 2,
      );

      // 7. P&L
      const pl = await financialReportService.generateProfitAndLoss({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(isFinite(pl.totalRevenue)).toBe(true);
      expect(isFinite(pl.netProfit)).toBe(true);

      // 8. Balance Sheet
      const bs = await financialReportService.generateBalanceSheet({
        tenantId: TENANT_ID, startDate: '2020-01-01', endDate: '2030-12-31',
      });
      expect(bs.isBalanced).toBe(true);
      expect(bs.totalAssets).toBeCloseTo(bs.totalLiabilities + bs.totalEquity, 2);
    });
  });
});
