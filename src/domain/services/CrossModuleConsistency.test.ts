/**
 * Cross-Module Data Consistency Tests
 * After posting a transaction, verifies all affected modules see consistent data.
 *
 * Source of Truth: audit/48_STEP29_CROSS_MODULE_LIVE_SYNCHRONIZATION_AND_WORKFLOW_COMPLETION_REPORT.md
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

describe('Cross-Module Data Consistency', () => {
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

  it('post sale → BillsList sees it', async () => {
    const customer = SEED_CUSTOMERS[0];
    const product = SEED_PRODUCTS[0];

    const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
      customerId: customer.id,
      date: today(),
      narration: 'Consistency test sale',
      warehouseId: 'wh-1',
      lines: [saleLine(product.id, 10, product.saleRate)],
    }, 'admin');
    await salesService.postSaleBill(TENANT_ID, saleVoucher.id);

    const bills = await billsListService.getAllBills(TENANT_ID);
    const bill = bills.find(b => b.voucher.id === saleVoucher.id);
    expect(bill).toBeDefined();
    expect(bill!.voucher.voucherType).toBe('SV');
    expect(bill!.partyName).toBe(customer.name);
  });

  it('post sale → Aging shows correct outstanding for customer', async () => {
    const customer = SEED_CUSTOMERS[0];
    const product = SEED_PRODUCTS[0];

    const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
      customerId: customer.id,
      date: today(),
      narration: 'Aging consistency test',
      warehouseId: 'wh-1',
      lines: [saleLine(product.id, 10, product.saleRate)],
    }, 'admin');
    await salesService.postSaleBill(TENANT_ID, saleVoucher.id);

    const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
    const row = aging.rows.find(r => r.partyId === customer.id);
    expect(row).toBeDefined();
    expect(row!.totalOutstanding).toBeGreaterThan(0);
  });

  it('post sale return → Aging outstanding decreases', async () => {
    const customer = SEED_CUSTOMERS[0];
    const product = SEED_PRODUCTS[0];

    // Post sale
    const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
      customerId: customer.id,
      date: today(),
      narration: 'Sale for return',
      warehouseId: 'wh-1',
      lines: [saleLine(product.id, 10, product.saleRate)],
    }, 'admin');
    await salesService.postSaleBill(TENANT_ID, saleVoucher.id);

    // Check outstanding before
    const agingBefore = await agingReportService.generateReport(TENANT_ID, 'customer', today());
    const rowBefore = agingBefore.rows.find(r => r.partyId === customer.id);
    const outstandingBefore = rowBefore!.totalOutstanding;

    // Post return
    const returnVoucher = await saleReturnService.createSaleReturn(TENANT_ID, {
      customerId: customer.id,
      date: today(),
      narration: 'Return',
      warehouseId: 'wh-1',
      lines: [saleLine(product.id, 5, product.saleRate)],
    }, 'admin');
    await saleReturnService.postSaleReturn(TENANT_ID, returnVoucher.id);

    const agingAfter = await agingReportService.generateReport(TENANT_ID, 'customer', today());
    const rowAfter = agingAfter.rows.find(r => r.partyId === customer.id);
    expect(rowAfter!.totalOutstanding).toBeLessThan(outstandingBefore);
  });

  it('post customer receipt → Aging outstanding decreases', async () => {
    const customer = SEED_CUSTOMERS[0];
    const product = SEED_PRODUCTS[0];

    // Post sale
    const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
      customerId: customer.id,
      date: today(),
      narration: 'Sale for receipt',
      warehouseId: 'wh-1',
      lines: [saleLine(product.id, 10, product.saleRate)],
    }, 'admin');
    await salesService.postSaleBill(TENANT_ID, saleVoucher.id);

    // Check outstanding before
    const agingBefore = await agingReportService.generateReport(TENANT_ID, 'customer', today());
    const rowBefore = agingBefore.rows.find(r => r.partyId === customer.id);
    const outstandingBefore = rowBefore!.totalOutstanding;

    // Post receipt
    const receiptVoucher = await customerReceiptService.createReceipt(TENANT_ID, {
      customerId: customer.id,
      cashAccountId: 'acc-11101',
      date: today(),
      narration: 'Receipt',
      amount: outstandingBefore,
    }, 'admin');
    await customerReceiptService.postReceipt(TENANT_ID, receiptVoucher.id);

    const agingAfter = await agingReportService.generateReport(TENANT_ID, 'customer', today());
    const rowAfter = agingAfter.rows.find(r => r.partyId === customer.id);
    // After full payment, customer either has 0 outstanding or is excluded from aging
    expect(rowAfter ? rowAfter.totalOutstanding : 0).toBe(0);
  });

  it('post purchase → BillsList shows purchase', async () => {
    const supplier = SEED_SUPPLIERS[0];
    const product = SEED_PRODUCTS[0];

    const pbVoucher = await purchaseService.createPurchaseBill(TENANT_ID, {
      supplierId: supplier.id,
      date: today(),
      narration: 'Purchase for consistency',
      warehouseId: 'wh-1',
      lines: [purchaseLine(product.id, 10, product.purchaseRate)],
    }, 'admin');
    await purchaseService.postPurchaseBill(TENANT_ID, pbVoucher.id);

    const bills = await billsListService.getAllBills(TENANT_ID);
    const bill = bills.find(b => b.voucher.id === pbVoucher.id);
    expect(bill).toBeDefined();
    expect(bill!.voucher.voucherType).toBe('PV');
  });

  it('post purchase → supplier aging shows outstanding', async () => {
    const supplier = SEED_SUPPLIERS[0];
    const product = SEED_PRODUCTS[0];

    const pbVoucher = await purchaseService.createPurchaseBill(TENANT_ID, {
      supplierId: supplier.id,
      date: today(),
      narration: 'Purchase aging test',
      warehouseId: 'wh-1',
      lines: [purchaseLine(product.id, 10, product.purchaseRate)],
    }, 'admin');
    await purchaseService.postPurchaseBill(TENANT_ID, pbVoucher.id);

    const aging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());
    const row = aging.rows.find(r => r.partyId === supplier.id);
    expect(row).toBeDefined();
    expect(row!.totalOutstanding).toBeGreaterThan(0);
  });

  it('Dashboard KPIs reflect all posted transactions', async () => {
    const customer = SEED_CUSTOMERS[0];
    const product = SEED_PRODUCTS[0];

    const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
      customerId: customer.id,
      date: today(),
      narration: 'Dashboard sale',
      warehouseId: 'wh-1',
      lines: [saleLine(product.id, 10, product.saleRate)],
    }, 'admin');
    await salesService.postSaleBill(TENANT_ID, saleVoucher.id);

    const dashboardData = await dashboardService.getDashboardData(TENANT_ID, 'month');
    expect(dashboardData.sales.amount).toBeGreaterThan(0);
  });

  it('BillDetail shows all line items for a sale', async () => {
    const customer = SEED_CUSTOMERS[0];
    const product = SEED_PRODUCTS[0];

    const saleVoucher = await salesService.createSaleBill(TENANT_ID, {
      customerId: customer.id,
      date: today(),
      narration: 'Multi-product sale',
      warehouseId: 'wh-1',
      lines: [saleLine(product.id, 10, product.saleRate)],
    }, 'admin');
    await salesService.postSaleBill(TENANT_ID, saleVoucher.id);

    const detail = await billDetailService.getBillDetail(TENANT_ID, saleVoucher.id);
    expect(detail).toBeDefined();
    expect(detail!.voucher.voucherType).toBe('SV');
    expect(detail!.lines.length).toBeGreaterThanOrEqual(1);
  });
});
