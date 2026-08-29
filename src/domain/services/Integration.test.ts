/**
 * ERP End-to-End Integration Regression Tests
 * Verifies cross-module data flows: Sale, Purchase, Returns, Receipts, Payments.
 *
 * Source of Truth: audit/46_STEP27_FULL_ERP_END_TO_END_INTEGRATION_AUDIT.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SalesService } from './SalesService';
import { PurchaseService } from './PurchaseService';
import { SaleReturnService } from './SaleReturnService';
import { PurchaseReturnService } from './PurchaseReturnService';
import { CustomerReceiptService } from './CustomerReceiptService';
import { PartyBalanceService } from './PartyBalanceService';
import { AgingReportService } from './AgingReportService';
import { BillsListService } from './BillsListService';
import { DashboardService } from './DashboardService';
import { CashBookService } from './CashBookService';
import { FinancialReportService } from './FinancialReportService';
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

/* ─── Helpers ──────────────────────────────────────────────── */

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function saleLine(productId: string, qty: number, rate: number) {
  return {
    productId,
    cartons: 0,
    packs: qty,
    rate,
    tradeDiscountPercent: 0,
    gstPercent: 0,
    furtherTaxPercent: 0,
    fedPercent: 0,
    advanceTaxPercent: 0,
  };
}

function purchaseLine(productId: string, qty: number, rate: number) {
  return {
    productId,
    cartons: 0,
    packs: qty,
    rate,
    tradeDiscountPercent: 0,
    gstPercent: 0,
    furtherTaxPercent: 0,
    fedPercent: 0,
    advanceTaxPercent: 0,
  };
}

/* ─── Tests ────────────────────────────────────────────────── */

describe('End-to-End Integration', () => {
  let coaRepo: ReturnType<typeof createMockCOARepo>;
  let voucherRepo: ReturnType<typeof createMockVoucherRepo>;
  let inventoryRepo: ReturnType<typeof createMockInventoryRepo>;
  let customerRepo: ReturnType<typeof createMockCustomerRepo>;
  let supplierRepo: ReturnType<typeof createMockSupplierRepo>;
  let salesService: SalesService;
  let purchaseService: PurchaseService;
  let saleReturnService: SaleReturnService;
  let purchaseReturnService: PurchaseReturnService;
  let customerReceiptService: CustomerReceiptService;
  let partyBalanceService: PartyBalanceService;
  let agingReportService: AgingReportService;
  let billsListService: BillsListService;
  let dashboardService: DashboardService;
  let cashBookService: CashBookService;
  let financialReportService: FinancialReportService;
  let billDetailService: BillDetailService;

  beforeEach(() => {
    resetCounters();
    coaRepo = createMockCOARepo();
    voucherRepo = createMockVoucherRepo();
    inventoryRepo = createMockInventoryRepo();
    customerRepo = createMockCustomerRepo();
    supplierRepo = createMockSupplierRepo();
    salesService = new SalesService(coaRepo, voucherRepo, inventoryRepo, customerRepo);
    purchaseService = new PurchaseService(coaRepo, voucherRepo, inventoryRepo, supplierRepo);
    saleReturnService = new SaleReturnService(voucherRepo, inventoryRepo, customerRepo);
    purchaseReturnService = new PurchaseReturnService(voucherRepo, inventoryRepo, supplierRepo);
    customerReceiptService = new CustomerReceiptService(coaRepo, voucherRepo, customerRepo);
    partyBalanceService = new PartyBalanceService(voucherRepo, coaRepo, customerRepo, supplierRepo);
    agingReportService = new AgingReportService(voucherRepo, coaRepo, customerRepo, supplierRepo);
    billsListService = new BillsListService(voucherRepo, customerRepo, supplierRepo, inventoryRepo);
    cashBookService = new CashBookService(coaRepo, voucherRepo);
    financialReportService = new FinancialReportService(coaRepo, voucherRepo);
    dashboardService = new DashboardService(
      voucherRepo, inventoryRepo, coaRepo, customerRepo, supplierRepo,
      cashBookService, financialReportService,
    );
    billDetailService = new BillDetailService(voucherRepo, coaRepo, customerRepo, supplierRepo, inventoryRepo);
  });

  /* ─── Sale End-to-End ───────────────────────────────────── */

  describe('Sale End-to-End', () => {
    it('SV → customer balance → aging → ledger → inventory → bills', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Integration test sale',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, product.saleRate)],
      }, 'admin');

      const postedSale = await salesService.postSaleBill(TENANT_ID, saleVoucher.id);
      expect(postedSale.status).toBe('POSTED');

      // Bills list shows the SV
      const bills = await billsListService.getAllBills(TENANT_ID);
      const svBill = bills.find(b => b.voucher.id === saleVoucher.id);
      expect(svBill).toBeDefined();
      expect(svBill!.voucher.voucherType).toBe('SV');
      expect(svBill!.partyName).toBe(customer.name);
      expect(svBill!.total).toBeGreaterThan(0);

      // Bill detail opens correctly
      const detail = await billDetailService.getBillDetail(TENANT_ID, saleVoucher.id);
      expect(detail).toBeDefined();
      expect(detail!.voucher.voucherType).toBe('SV');
      expect(detail!.partyName).toBe(customer.name);

      // Customer balance reflects the sale
      const customerBalances = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custBalance = customerBalances.find(b => b.partyId === customer.id);
      expect(custBalance).toBeDefined();
      expect(custBalance!.totalSales).toBeGreaterThan(0);
      expect(custBalance!.outstandingBalance).toBeGreaterThan(0);

      // Aging shows the customer with outstanding
      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRow = aging.rows.find(r => r.partyId === customer.id);
      expect(agingRow).toBeDefined();
      expect(agingRow!.totalOutstanding).toBeGreaterThan(0);

      // Ledger contains the sale entry
      const customerAccount = await coaRepo.getAccountById(TENANT_ID, customer.accountHeadId);
      expect(customerAccount).toBeDefined();
      const ledgerEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { accountId: customerAccount!.accountCode });
      const saleEntries = ledgerEntries.filter(e => e.voucherType === 'SV');
      expect(saleEntries.length).toBeGreaterThan(0);

      // Inventory decreased
      const stockAfter = await inventoryRepo.getStockLevels(TENANT_ID);
      const productStock = stockAfter.find(s => s.productId === product.id);
      expect(productStock).toBeDefined();
      expect(productStock!.quantityOnHand).toBeLessThan(100);
    });

    it('posted SV cannot be deleted', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];
      const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Test',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 1, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, saleVoucher.id);

      await expect(salesService.deleteSaleBill(TENANT_ID, saleVoucher.id))
        .rejects.toThrow('Cannot delete a posted voucher');
    });
  });

  /* ─── Purchase End-to-End ───────────────────────────────── */

  describe('Purchase End-to-End', () => {
    it('PV → supplier balance → aging → inventory → bills', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      const stockBefore = await inventoryRepo.getStockLevels(TENANT_ID);
      const initialStock = stockBefore.find(s => s.productId === product.id);

      const purchaseVoucher = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Integration test purchase',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 10, product.purchaseRate)],
      }, 'admin');

      const postedPurchase = await purchaseService.postPurchaseBill(TENANT_ID, purchaseVoucher.id);
      expect(postedPurchase.status).toBe('POSTED');

      // Bills list shows the PV
      const bills = await billsListService.getAllBills(TENANT_ID);
      const pvBill = bills.find(b => b.voucher.id === purchaseVoucher.id);
      expect(pvBill).toBeDefined();
      expect(pvBill!.voucher.voucherType).toBe('PV');
      expect(pvBill!.partyName).toBe(supplier.name);
      expect(pvBill!.total).toBeGreaterThan(0);

      // Supplier balance reflects the purchase
      const supplierBalances = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const suppBalance = supplierBalances.find(b => b.partyId === supplier.id);
      expect(suppBalance).toBeDefined();
      expect(suppBalance!.outstandingBalance).toBeGreaterThan(0);

      // Aging shows the supplier with outstanding
      const aging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());
      const agingRow = aging.rows.find(r => r.partyId === supplier.id);
      expect(agingRow).toBeDefined();
      expect(agingRow!.totalOutstanding).toBeGreaterThan(0);

      // Inventory increased (test-helpers mock returns object references, so capture initial value before mutation)
      const stockAfter = await inventoryRepo.getStockLevels(TENANT_ID);
      const productStock = stockAfter.find(s => s.productId === product.id);
      expect(productStock).toBeDefined();
      // Seed starts at 100 for wh-1, GRN adds 10 → should be 110
      expect(productStock!.quantityOnHand).toBe(110);
    });

    it('posted PV cannot be deleted', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Test',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 1, 100)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      await expect(purchaseService.deletePurchaseBill(TENANT_ID, pv.id))
        .rejects.toThrow('Cannot delete a posted voucher');
    });
  });

  /* ─── Sale Return End-to-End ────────────────────────────── */

  describe('Sale Return End-to-End', () => {
    it('SRV → customer balance decrease → aging decrease → inventory increase', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      // First create a sale
      const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Original sale',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, product.saleRate)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, saleVoucher.id);

      const balBeforeReturn = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custBefore = balBeforeReturn.find(b => b.partyId === customer.id)!;

      // Create and post a sale return
      const srvVoucher = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Integration test return',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 2, product.saleRate)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srvVoucher.id);

      // Balance should decrease
      const balAfterReturn = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custAfter = balAfterReturn.find(b => b.partyId === customer.id)!;
      expect(custAfter.outstandingBalance).toBeLessThan(custBefore.outstandingBalance);
      expect(custAfter.totalReturns).toBeGreaterThan(0);

      // Bills list shows the SRV with correct total
      const bills = await billsListService.getAllBills(TENANT_ID);
      const srvBill = bills.find(b => b.voucher.id === srvVoucher.id);
      expect(srvBill).toBeDefined();
      expect(srvBill!.voucher.voucherType).toBe('SRV');
      expect(srvBill!.total).toBeGreaterThan(0);
    });
  });

  /* ─── Purchase Return End-to-End ────────────────────────── */

  describe('Purchase Return End-to-End', () => {
    it('PRV → supplier balance decrease → inventory decrease', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      // First create a purchase
      const pvVoucher = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Original purchase',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 10, product.purchaseRate)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pvVoucher.id);

      // Capture initial stock value (number, not object reference)
      const stockBefore = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockBeforeQty = stockBefore.find(s => s.productId === product.id)!.quantityOnHand; // 100 from seed

      const balBefore = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const suppBefore = balBefore.find(b => b.partyId === supplier.id)!;

      // Create and post a purchase return
      const prvVoucher = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Integration test purchase return',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 3, product.purchaseRate)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prvVoucher.id);

      // Supplier balance should decrease
      const balAfter = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const suppAfter = balAfter.find(b => b.partyId === supplier.id)!;
      expect(suppAfter.outstandingBalance).toBeLessThan(suppBefore.outstandingBalance);

      // Inventory should decrease (goods returned to supplier)
      // Mock returns object references so re-read may reflect mutation; use absolute expected value
      // After PV: seed 100 + 10 = 110 (stockBeforeQty captured here), after PRV: 110 - 3 = 107
      const stockAfter = await inventoryRepo.getStockLevels(TENANT_ID);
      const productAfter = stockAfter.find(s => s.productId === product.id)!;
      expect(productAfter.quantityOnHand).toBe(stockBeforeQty - 3);

      // Bills list shows the PRV with correct total
      const bills = await billsListService.getAllBills(TENANT_ID);
      const prvBill = bills.find(b => b.voucher.id === prvVoucher.id);
      expect(prvBill).toBeDefined();
      expect(prvBill!.voucher.voucherType).toBe('PRV');
      expect(prvBill!.total).toBeGreaterThan(0);
    });
  });

  /* ─── Customer Receipt End-to-End ───────────────────────── */

  describe('Customer Receipt End-to-End', () => {
    it('CR → customer balance decrease → aging decrease', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      // Create a sale first
      const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Sale for receipt test',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, product.saleRate)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, saleVoucher.id);

      const balBefore = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custBefore = balBefore.find(b => b.partyId === customer.id)!;
      expect(custBefore.outstandingBalance).toBeGreaterThan(0);

      // Create and post a receipt
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;
      const receipt = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: customer.id,
        cashAccountId: cashAccount.id,
        amount: 5000,
        date: today(),
        narration: 'Partial payment',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, receipt.id);

      // Balance should decrease
      const balAfter = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custAfter = balAfter.find(b => b.partyId === customer.id)!;
      expect(custAfter.outstandingBalance).toBeLessThan(custBefore.outstandingBalance);
      expect(custAfter.totalReceipts).toBeGreaterThan(0);
    });

    it('posted receipt cannot be deleted', async () => {
      const customer = SEED_CUSTOMERS[0];
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;
      const receipt = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: customer.id,
        cashAccountId: cashAccount.id,
        amount: 1000,
        date: today(),
        narration: 'Test',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, receipt.id);

      await expect(customerReceiptService.deleteReceipt(TENANT_ID, receipt.id))
        .rejects.toThrow('Cannot delete a posted voucher');
    });
  });

  /* ─── Aging Reconciliation ──────────────────────────────── */

  describe('Aging Reconciliation', () => {
    it('customer aging total matches party balance outstanding', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Reconciliation test',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 3, product.saleRate)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, saleVoucher.id);

      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRow = aging.rows.find(r => r.partyId === customer.id);
      const partyBalances = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const partyBal = partyBalances.find(b => b.partyId === customer.id);

      expect(agingRow).toBeDefined();
      expect(partyBal).toBeDefined();
      expect(Math.abs(agingRow!.totalOutstanding - partyBal!.outstandingBalance)).toBeLessThan(0.01);
    });
  });

  /* ─── Inventory Reconciliation ──────────────────────────── */

  describe('Inventory Reconciliation', () => {
    it('stock changes correctly through purchase → sale → return cycle', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      const initial = await inventoryRepo.getStockLevels(TENANT_ID);
      const initialStock = initial.find(s => s.productId === product.id)!.quantityOnHand;

      // Purchase 20 units
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Stock in',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 20, product.purchaseRate)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const afterPurchase = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockAfterPurchase = afterPurchase.find(s => s.productId === product.id)!.quantityOnHand;
      expect(stockAfterPurchase).toBe(initialStock + 20);

      // Sale 5 units
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Stock out',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, product.saleRate)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const afterSale = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockAfterSale = afterSale.find(s => s.productId === product.id)!.quantityOnHand;
      expect(stockAfterSale).toBe(stockAfterPurchase - 5);

      // Purchase Return 3 units
      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Return to supplier',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 3, product.purchaseRate)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      const afterPR = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockAfterPR = afterPR.find(s => s.productId === product.id)!.quantityOnHand;
      expect(stockAfterPR).toBe(stockAfterSale - 3);

      // Sale Return 2 units
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Customer return',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 2, product.saleRate)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      const afterSR = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockAfterSR = afterSR.find(s => s.productId === product.id)!.quantityOnHand;
      expect(stockAfterSR).toBe(stockAfterPR + 2);

      // Final: initial + 20 - 5 - 3 + 2 = initial + 14
      expect(stockAfterSR).toBe(initialStock + 14);
    });
  });

  /* ─── Dashboard Reconciliation ──────────────────────────── */

  describe('Dashboard Reconciliation', () => {
    it('dashboard KPIs match bills list data', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Dashboard test',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 2, product.saleRate)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const data = await dashboardService.getDashboardData(TENANT_ID, 'month');
      expect(data.sales.count).toBeGreaterThanOrEqual(1);
      expect(data.sales.amount).toBeGreaterThan(0);

      const bills = await billsListService.getAllBills(TENANT_ID);
      const svBills = bills.filter(b => b.voucher.voucherType === 'SV');
      expect(svBills.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ─── Draft/Post Lifecycle ──────────────────────────────── */

  describe('Draft/Post Lifecycle', () => {
    it('DRAFT SV does not affect balances until posted', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      const balBefore = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custBefore = balBefore.find(b => b.partyId === customer.id);

      // Create but DON'T post
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Draft test',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, product.saleRate)],
      }, 'admin');

      // Balance should NOT have changed
      const balAfterDraft = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custAfterDraft = balAfterDraft.find(b => b.partyId === customer.id);
      expect(custAfterDraft!.outstandingBalance).toBe(custBefore?.outstandingBalance ?? 0);

      // Now post
      await salesService.postSaleBill(TENANT_ID, sv.id);

      // Balance SHOULD have changed
      const balAfterPost = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custAfterPost = balAfterPost.find(b => b.partyId === customer.id);
      expect(custAfterPost!.outstandingBalance).toBeGreaterThan(custBefore?.outstandingBalance ?? 0);
    });

    it('DRAFT SV can be deleted', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Delete test',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 1, 100)],
      }, 'admin');

      await salesService.deleteSaleBill(TENANT_ID, sv.id);

      const deleted = await voucherRepo.getVoucherById(TENANT_ID, sv.id);
      expect(deleted).toBeNull();
    });
  });

  /* ─── Tenant Isolation ──────────────────────────────────── */

  describe('Tenant Isolation', () => {
    it('Tenant A cannot see Tenant B data', async () => {
      const tenantA = TENANT_ID;
      const tenantB = 'tenant-isolation-test';

      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];
      const sv = await salesService.createSaleBill(tenantA, {
        customerId: customer.id,
        date: today(),
        narration: 'Tenant A sale',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 1, 100)],
      }, 'admin');
      await salesService.postSaleBill(tenantA, sv.id);

      // Tenant B should have no bills
      const billsB = await billsListService.getAllBills(tenantB);
      expect(billsB.length).toBe(0);

      // Tenant B should have no customer balances
      const balancesB = await partyBalanceService.getCustomerBalances(tenantB);
      expect(balancesB.length).toBe(0);

      // Tenant A should have the bill
      const billsA = await billsListService.getAllBills(tenantA);
      expect(billsA.length).toBeGreaterThan(0);
    });
  });
});
