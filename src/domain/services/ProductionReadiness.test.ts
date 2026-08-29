/**
 * Step 30 — Full ERP Production-Readiness Integration Tests
 * Comprehensive verification of every transaction workflow, reconciliation,
 * tax calculation, ledger balance, aging, and cross-module consistency.
 *
 * Source of Truth: audit/49_STEP30_FULL_ERP_PRODUCTION_READINESS_AND_TRANSACTION_TRACEABILITY_AUDIT.md
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

function saleLine(productId: string, qty: number, rate: number, overrides: Partial<{ gstPercent: number; furtherTaxPercent: number; fedPercent: number; advanceTaxPercent: number; tradeDiscountPercent: number }> = {}) {
  return {
    productId,
    cartons: 0,
    packs: qty,
    rate,
    tradeDiscountPercent: overrides.tradeDiscountPercent ?? 0,
    gstPercent: overrides.gstPercent ?? 0,
    furtherTaxPercent: overrides.furtherTaxPercent ?? 0,
    fedPercent: overrides.fedPercent ?? 0,
    advanceTaxPercent: overrides.advanceTaxPercent ?? 0,
  };
}

function purchaseLine(productId: string, qty: number, rate: number, overrides: Partial<{ gstPercent: number; furtherTaxPercent: number; fedPercent: number; advanceTaxPercent: number; tradeDiscountPercent: number }> = {}) {
  return {
    productId,
    cartons: 0,
    packs: qty,
    rate,
    tradeDiscountPercent: overrides.tradeDiscountPercent ?? 0,
    gstPercent: overrides.gstPercent ?? 0,
    furtherTaxPercent: overrides.furtherTaxPercent ?? 0,
    fedPercent: overrides.fedPercent ?? 0,
    advanceTaxPercent: overrides.advanceTaxPercent ?? 0,
  };
}

/* ─── Tests ────────────────────────────────────────────────── */

describe('Step 30: Production-Readiness Audit', () => {
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

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 2 — SALE END-TO-END                                   */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 2: Sale End-to-End', () => {
    it('draft SV does NOT affect aging, party balance, dashboard, or inventory', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      // Snapshot before
      const balBefore = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custBefore = balBefore.find(b => b.partyId === customer.id);
      const agingBefore = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRowBefore = agingBefore.rows.find(r => r.partyId === customer.id);
      const stockBefore = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockQtyBefore = stockBefore.find(s => s.productId === product.id)!.quantityOnHand;

      // Create draft (don't post)
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Draft sale',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, 100)],
      }, 'admin');
      expect(sv.status).toBe('DRAFT');

      // Verify nothing changed
      const balAfterDraft = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custAfterDraft = balAfterDraft.find(b => b.partyId === customer.id);
      expect(custAfterDraft?.outstandingBalance ?? 0).toBe(custBefore?.outstandingBalance ?? 0);

      const agingAfterDraft = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRowAfterDraft = agingAfterDraft.rows.find(r => r.partyId === customer.id);
      expect(agingRowAfterDraft?.totalOutstanding ?? 0).toBe(agingRowBefore?.totalOutstanding ?? 0);

      const stockAfterDraft = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockQtyAfterDraft = stockAfterDraft.find(s => s.productId === product.id)!.quantityOnHand;
      expect(stockQtyAfterDraft).toBe(stockQtyBefore);

      // Now post
      await salesService.postSaleBill(TENANT_ID, sv.id);

      // Verify all modules updated
      const balAfterPost = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custAfterPost = balAfterPost.find(b => b.partyId === customer.id)!;
      const expectedAmount = 5 * 100; // qty * rate = 500 (no tax)
      expect(custAfterPost.outstandingBalance).toBe((custBefore?.outstandingBalance ?? 0) + expectedAmount);
      expect(custAfterPost.totalSales).toBe((custBefore?.totalSales ?? 0) + expectedAmount);

      const agingAfterPost = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRowAfterPost = agingAfterPost.rows.find(r => r.partyId === customer.id)!;
      expect(agingRowAfterPost.totalOutstanding).toBe((agingRowBefore?.totalOutstanding ?? 0) + expectedAmount);

      const stockAfterPost = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockQtyAfterPost = stockAfterPost.find(s => s.productId === product.id)!.quantityOnHand;
      expect(stockQtyAfterPost).toBe(stockQtyBefore - 5);

      // BillsList shows it
      const bills = await billsListService.getAllBills(TENANT_ID);
      const bill = bills.find(b => b.voucher.id === sv.id)!;
      expect(bill.voucher.voucherType).toBe('SV');
      expect(bill.total).toBe(expectedAmount);
    });

    it('post SV with GST — ledger debits = credits', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];
      const gstPercent = 15;

      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'GST test sale',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 10, 200, { gstPercent })],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const customerAccount = await coaRepo.getAccountById(TENANT_ID, customer.accountHeadId)!;
      const ledgerEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: sv.id });

      // Verify balanced ledger
      const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);

      // Verify specific accounts
      const baseAmount = 10 * 200; // 2000
      const gstAmount = baseAmount * gstPercent / 100; // 300
      const totalWithTax = baseAmount + gstAmount; // 2300

      // Customer AR entry
      const arEntry = ledgerEntries.find(e => e.accountId === customerAccount.accountCode);
      expect(arEntry).toBeDefined();
      expect(arEntry!.debit).toBe(totalWithTax);

      // Sales Revenue entry
      const salesEntry = ledgerEntries.find(e => e.accountId === '41101');
      expect(salesEntry).toBeDefined();
      expect(salesEntry!.credit).toBe(baseAmount);

      // Tax Output entry
      const taxEntry = ledgerEntries.find(e => e.accountId === '21201');
      expect(taxEntry).toBeDefined();
      expect(taxEntry!.credit).toBe(gstAmount);
    });

    it('post SV with all tax types — ledger debits = credits', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Full tax sale',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 10, 200, {
          gstPercent: 15,
          furtherTaxPercent: 5,
          fedPercent: 10,
          advanceTaxPercent: 2,
        })],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const ledgerEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: sv.id });
      const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);

      // Verify tax amounts
      const baseAmount = 10 * 200;
      const gst = baseAmount * 15 / 100;
      const furtherTax = baseAmount * 5 / 100;
      const fed = baseAmount * 10 / 100;
      const advanceTax = baseAmount * 2 / 100;
      const totalWithTax = baseAmount + gst + furtherTax + fed + advanceTax;

      // Customer AR
      const customerAccount = await coaRepo.getAccountById(TENANT_ID, customer.accountHeadId)!;
      const arEntry = ledgerEntries.find(e => e.accountId === customerAccount.accountCode)!;
      expect(arEntry.debit).toBe(totalWithTax);

      // Sales Revenue
      const salesEntry = ledgerEntries.find(e => e.accountId === '41101')!;
      expect(salesEntry.credit).toBe(baseAmount);

      // Tax Output (GST + Further Tax)
      const taxOutputEntry = ledgerEntries.find(e => e.accountId === '21201')!;
      expect(taxOutputEntry.credit).toBe(gst + furtherTax);

      // FED Payable
      const fedEntry = ledgerEntries.find(e => e.accountId === '21203')!;
      expect(fedEntry.credit).toBe(fed);

      // Advance Tax / Withholding
      const advanceTaxEntry = ledgerEntries.find(e => e.accountId === '21202')!;
      expect(advanceTaxEntry.credit).toBe(advanceTax);
    });

    it('bill detail shows all line items with correct amounts', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product1 = SEED_PRODUCTS[0];
      const product2 = SEED_PRODUCTS[1];

      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Multi-product sale',
        warehouseId: 'wh-1',
        lines: [
          saleLine(product1.id, 5, 100),
          saleLine(product2.id, 3, 200),
        ],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const detail = await billDetailService.getBillDetail(TENANT_ID, sv.id);
      expect(detail).toBeDefined();
      expect(detail!.voucher.voucherType).toBe('SV');
      expect(detail!.partyName).toBe(customer.name);
      expect(detail!.lines.length).toBeGreaterThanOrEqual(2);

      // Verify line items
      const line1 = detail!.lines.find(l => l.line.productId === product1.id);
      expect(line1).toBeDefined();
      expect(line1!.quantity).toBe(5);
      expect(line1!.rate).toBe(100);

      const line2 = detail!.lines.find(l => l.line.productId === product2.id);
      expect(line2).toBeDefined();
      expect(line2!.quantity).toBe(3);
      expect(line2!.rate).toBe(200);
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 3 — PURCHASE END-TO-END                               */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 3: Purchase End-to-End', () => {
    it('draft PV does NOT affect balances, aging, or inventory', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      const stockBefore = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockQtyBefore = stockBefore.find(s => s.productId === product.id)!.quantityOnHand;
      const balBefore = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const suppBefore = balBefore.find(b => b.partyId === supplier.id);

      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Draft purchase',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 10, 100)],
      }, 'admin');
      expect(pv.status).toBe('DRAFT');

      // Nothing should change
      const stockAfterDraft = await inventoryRepo.getStockLevels(TENANT_ID);
      expect(stockAfterDraft.find(s => s.productId === product.id)!.quantityOnHand).toBe(stockQtyBefore);

      const balAfterDraft = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const suppAfterDraft = balAfterDraft.find(b => b.partyId === supplier.id);
      expect(suppAfterDraft?.outstandingBalance ?? 0).toBe(suppBefore?.outstandingBalance ?? 0);

      // Now post
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      // Verify
      const stockAfterPost = await inventoryRepo.getStockLevels(TENANT_ID);
      expect(stockAfterPost.find(s => s.productId === product.id)!.quantityOnHand).toBe(stockQtyBefore + 10);

      const balAfterPost = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const suppAfterPost = balAfterPost.find(b => b.partyId === supplier.id)!;
      expect(suppAfterPost.outstandingBalance).toBe((suppBefore?.outstandingBalance ?? 0) + 1000);
    });

    it('post PV with GST — ledger debits = credits, tax input recorded', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];
      const gstPercent = 15;

      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'GST purchase',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 10, 200, { gstPercent })],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const ledgerEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: pv.id });
      const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);

      const baseAmount = 10 * 200;
      const gstAmount = baseAmount * gstPercent / 100;
      const totalWithTax = baseAmount + gstAmount;

      // Inventory debit
      const invEntry = ledgerEntries.find(e => e.accountId === '11301')!;
      expect(invEntry.debit).toBe(baseAmount);

      // Tax Input debit
      const taxInputEntry = ledgerEntries.find(e => e.accountId === '11401')!;
      expect(taxInputEntry.debit).toBe(gstAmount);

      // Supplier AP credit
      const supplierAccount = await coaRepo.getAccountById(TENANT_ID, supplier.accountHeadId)!;
      const apEntry = ledgerEntries.find(e => e.accountId === supplierAccount.accountCode)!;
      expect(apEntry.credit).toBe(totalWithTax);
    });

    it('post PV with all tax types — ledger balanced', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Full tax purchase',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 10, 200, {
          gstPercent: 15,
          furtherTaxPercent: 5,
          fedPercent: 10,
          advanceTaxPercent: 2,
        })],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const ledgerEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: pv.id });
      const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);

      const baseAmount = 10 * 200;
      const gst = baseAmount * 15 / 100;
      const furtherTax = baseAmount * 5 / 100;
      const fed = baseAmount * 10 / 100;
      const advanceTax = baseAmount * 2 / 100;
      const totalWithTax = baseAmount + gst + furtherTax + fed + advanceTax;

      // Inventory
      const invEntry = ledgerEntries.find(e => e.accountId === '11301')!;
      expect(invEntry.debit).toBe(baseAmount);

      // Tax Input (GST + Further Tax)
      const taxInputEntry = ledgerEntries.find(e => e.accountId === '11401')!;
      expect(taxInputEntry.debit).toBe(gst + furtherTax);

      // FED Input
      const fedEntry = ledgerEntries.find(e => e.accountId === '11403')!;
      expect(fedEntry.debit).toBe(fed);

      // Advance Tax Input
      const advanceTaxEntry = ledgerEntries.find(e => e.accountId === '11402')!;
      expect(advanceTaxEntry.debit).toBe(advanceTax);

      // Supplier AP
      const supplierAccount = await coaRepo.getAccountById(TENANT_ID, supplier.accountHeadId)!;
      const apEntry = ledgerEntries.find(e => e.accountId === supplierAccount.accountCode)!;
      expect(apEntry.credit).toBe(totalWithTax);
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 4 — SALE RETURN                                       */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 4: Sale Return', () => {
    it('SRV reverses customer outstanding and increases stock', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      // Post a sale first
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Original sale',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const stockAfterSale = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockQtyAfterSale = stockAfterSale.find(s => s.productId === product.id)!.quantityOnHand;

      const balBefore = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custBefore = balBefore.find(b => b.partyId === customer.id)!;

      // Post return
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Return',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 3, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      // Customer outstanding decreased
      const balAfter = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custAfter = balAfter.find(b => b.partyId === customer.id)!;
      expect(custAfter.outstandingBalance).toBe(custBefore.outstandingBalance - 300);
      expect(custAfter.totalReturns).toBe(300);

      // Stock increased
      const stockAfterReturn = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockQtyAfterReturn = stockAfterReturn.find(s => s.productId === product.id)!.quantityOnHand;
      expect(stockQtyAfterReturn).toBe(stockQtyAfterSale + 3);

      // BillsList shows SRV
      const bills = await billsListService.getAllBills(TENANT_ID);
      const srvBill = bills.find(b => b.voucher.id === srv.id)!;
      expect(srvBill.voucher.voucherType).toBe('SRV');
      expect(srvBill.total).toBe(300);

      // Aging decreased
      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRow = aging.rows.find(r => r.partyId === customer.id)!;
      expect(agingRow.totalOutstanding).toBe(custBefore.outstandingBalance - 300);
    });

    it('SRV ledger debits = credits', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Original',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, 200)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Return',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 2, 200)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      const ledgerEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: srv.id });
      const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);

      // Sales Return debit
      const srEntry = ledgerEntries.find(e => e.accountId === '41104')!;
      expect(srEntry.debit).toBe(400);

      // Customer AR credit
      const customerAccount = await coaRepo.getAccountById(TENANT_ID, customer.accountHeadId)!;
      const arEntry = ledgerEntries.find(e => e.accountId === customerAccount.accountCode)!;
      expect(arEntry.credit).toBe(400);
    });

    it('partial SRV works correctly', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      // Sale 10 units
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Sale',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 10, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      // Return 3 units (partial)
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Partial return',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 3, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      // Customer still owes 700 (1000 - 300)
      const balances = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const cust = balances.find(b => b.partyId === customer.id)!;
      expect(cust.outstandingBalance).toBe(700);
      expect(cust.totalSales).toBe(1000);
      expect(cust.totalReturns).toBe(300);
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 5 — PURCHASE RETURN                                   */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 5: Purchase Return', () => {
    it('PRV decreases supplier outstanding and stock', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      // Purchase first
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Original purchase',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 10, 100)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const stockAfterPurchase = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockQtyAfterPurchase = stockAfterPurchase.find(s => s.productId === product.id)!.quantityOnHand;

      const balBefore = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const suppBefore = balBefore.find(b => b.partyId === supplier.id)!;

      // Return 3 units
      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Return to supplier',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 3, 100)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      // Supplier outstanding decreased
      const balAfter = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const suppAfter = balAfter.find(b => b.partyId === supplier.id)!;
      expect(suppAfter.outstandingBalance).toBe(suppBefore.outstandingBalance - 300);

      // Stock decreased (ISSUE movement — goods returned to supplier)
      const stockAfterReturn = await inventoryRepo.getStockLevels(TENANT_ID);
      const stockQtyAfterReturn = stockAfterReturn.find(s => s.productId === product.id)!.quantityOnHand;
      expect(stockQtyAfterReturn).toBe(stockQtyAfterPurchase - 3);

      // Aging decreased
      const aging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());
      const agingRow = aging.rows.find(r => r.partyId === supplier.id)!;
      expect(agingRow.totalOutstanding).toBe(suppBefore.outstandingBalance - 300);
    });

    it('PRV ledger debits = credits', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Original',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 5, 200)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Return',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 2, 200)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      const ledgerEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: prv.id });
      const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);

      // Supplier AP debit
      const supplierAccount = await coaRepo.getAccountById(TENANT_ID, supplier.accountHeadId)!;
      const apEntry = ledgerEntries.find(e => e.accountId === supplierAccount.accountCode)!;
      expect(apEntry.debit).toBe(400);

      // Inventory credit
      const invEntry = ledgerEntries.find(e => e.accountId === '11301')!;
      expect(invEntry.credit).toBe(400);
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 6 — CUSTOMER RECEIPT                                  */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 6: Customer Receipt', () => {
    it('CR decreases customer AR and increases cash', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      // Create and post a sale
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Sale for receipt',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, 200)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const balBefore = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custBefore = balBefore.find(b => b.partyId === customer.id)!;
      expect(custBefore.outstandingBalance).toBe(1000);

      // Create and post receipt
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;
      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: customer.id,
        cashAccountId: cashAccount.id,
        amount: 600,
        date: today(),
        narration: 'Partial payment',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      // Balance decreased
      const balAfter = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const custAfter = balAfter.find(b => b.partyId === customer.id)!;
      expect(custAfter.outstandingBalance).toBe(400);
      expect(custAfter.totalReceipts).toBe(600);

      // Aging decreased
      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRow = aging.rows.find(r => r.partyId === customer.id)!;
      expect(agingRow.totalOutstanding).toBe(400);

      // Ledger balanced
      const ledgerEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: cr.id });
      const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);

      // Cash/Bank debit
      const cashEntry = ledgerEntries.find(e => e.accountId === '11101')!;
      expect(cashEntry.debit).toBe(600);

      // Customer AR credit
      const customerAccount = await coaRepo.getAccountById(TENANT_ID, customer.accountHeadId)!;
      const arEntry = ledgerEntries.find(e => e.accountId === customerAccount.accountCode)!;
      expect(arEntry.credit).toBe(600);
    });

    it('posted CR cannot be deleted', async () => {
      const customer = SEED_CUSTOMERS[0];
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;
      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: customer.id,
        cashAccountId: cashAccount.id,
        amount: 500,
        date: today(),
        narration: 'Test',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      await expect(customerReceiptService.deleteReceipt(TENANT_ID, cr.id))
        .rejects.toThrow('Cannot delete a posted voucher');
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 7 — CASH PAYMENT / CPV                                */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 7: Cash Payment / CPV', () => {
    it('CP decreases supplier AP and cash', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      // Create and post a purchase
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Purchase for payment',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 5, 200)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const balBefore = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const suppBefore = balBefore.find(b => b.partyId === supplier.id)!;
      expect(suppBefore.outstandingBalance).toBe(1000);

      // Create and post CP
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;
      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: cashAccount.id,
        debitAccountId: supplier.accountHeadId,
        amount: 400,
        date: today(),
        narration: 'Payment to supplier',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      // Supplier outstanding decreased
      const balAfter = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const suppAfter = balAfter.find(b => b.partyId === supplier.id)!;
      expect(suppAfter.outstandingBalance).toBe(600);

      // Aging decreased
      const aging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());
      const agingRow = aging.rows.find(r => r.partyId === supplier.id)!;
      expect(agingRow.totalOutstanding).toBe(600);

      // Ledger balanced
      const ledgerEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: cp.id });
      const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);

      // Supplier AP debit
      const supplierAccount = await coaRepo.getAccountById(TENANT_ID, supplier.accountHeadId)!;
      const apEntry = ledgerEntries.find(e => e.accountId === supplierAccount.accountCode)!;
      expect(apEntry.debit).toBe(400);

      // Cash credit
      const cashEntry = ledgerEntries.find(e => e.accountId === '11101')!;
      expect(cashEntry.credit).toBe(400);
    });

    it('posted CP cannot be deleted via service', async () => {
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;
      const supplier = SEED_SUPPLIERS[0];
      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: cashAccount.id,
        debitAccountId: supplier.accountHeadId,
        amount: 100,
        date: today(),
        narration: 'Test',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      await expect(cashBookService.deleteVoucher(TENANT_ID, cp.id))
        .rejects.toThrow('Cannot delete a posted voucher');
    });

    it('CPV is represented as CP voucher type', async () => {
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;
      const supplier = SEED_SUPPLIERS[0];
      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: cashAccount.id,
        debitAccountId: supplier.accountHeadId,
        amount: 100,
        date: today(),
        narration: 'Verify CP type',
      }, 'admin');

      expect(cp.voucherType).toBe('CP');
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 8 — AGING RECONCILIATION                              */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 8: Aging Reconciliation', () => {
    it('customer aging matches party balance after multiple transactions', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      // Sale 1
      const sv1 = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Sale 1',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, 200)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv1.id);

      // Sale 2
      const sv2 = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Sale 2',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 3, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv2.id);

      // Partial receipt
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;
      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: customer.id,
        cashAccountId: cashAccount.id,
        amount: 500,
        date: today(),
        narration: 'Partial',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      // Partial return
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id,
        date: today(),
        narration: 'Return',
        warehouseId: 'wh-1',
        lines: [saleLine(product.id, 1, 200)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      // Reconcile: Aging total = Party balance outstanding
      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());
      const agingRow = aging.rows.find(r => r.partyId === customer.id);
      const partyBalances = await partyBalanceService.getCustomerBalances(TENANT_ID);
      const partyBal = partyBalances.find(b => b.partyId === customer.id);

      // Expected: (1000 + 300) - 500 - 200 = 600
      expect(partyBal!.outstandingBalance).toBe(600);
      if (agingRow) {
        expect(Math.abs(agingRow.totalOutstanding - partyBal!.outstandingBalance)).toBeLessThan(0.01);
      }
    });

    it('supplier aging matches party balance after multiple transactions', async () => {
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      // Purchase 1
      const pv1 = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Purchase 1',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 10, 200)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv1.id);

      // Purchase 2
      const pv2 = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Purchase 2',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 5, 100)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv2.id);

      // Payment
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;
      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: cashAccount.id,
        debitAccountId: supplier.accountHeadId,
        amount: 1000,
        date: today(),
        narration: 'Payment',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      // Return
      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id,
        date: today(),
        narration: 'Return',
        warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 2, 200)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      // Reconcile
      const aging = await agingReportService.generateReport(TENANT_ID, 'supplier', today());
      const agingRow = aging.rows.find(r => r.partyId === supplier.id);
      const partyBalances = await partyBalanceService.getSupplierBalances(TENANT_ID);
      const partyBal = partyBalances.find(b => b.partyId === supplier.id);

      // Expected: (2000 + 500) - 1000 - 400 = 1100
      expect(partyBal!.outstandingBalance).toBe(1100);
      if (agingRow) {
        expect(Math.abs(agingRow.totalOutstanding - partyBal!.outstandingBalance)).toBeLessThan(0.01);
      }
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 11 — LEDGER RECONCILIATION                            */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 11: Ledger Reconciliation', () => {
    it('every posted voucher has balanced debits = credits', async () => {
      const customer = SEED_CUSTOMERS[0];
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;

      // Create all transaction types
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'SV', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, 200, { gstPercent: 15 })],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'SRV', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 1, 200, { gstPercent: 15 })],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'PV', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 10, 200, { gstPercent: 15 })],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'PRV', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 2, 200, { gstPercent: 15 })],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: customer.id, cashAccountId: cashAccount.id,
        amount: 500, date: today(), narration: 'CR',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);

      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: cashAccount.id, debitAccountId: supplier.accountHeadId,
        amount: 500, date: today(), narration: 'CP',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);

      // Verify each voucher is balanced
      const voucherIds = [sv.id, srv.id, pv.id, prv.id, cr.id, cp.id];
      for (const vid of voucherIds) {
        const entries = await voucherRepo.getLedgerEntries(TENANT_ID, { voucherId: vid });
        const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
        const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
        expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);
      }
    });

    it('trial balance totals match', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'TB test', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, 200)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const trialBalance = await financialReportService.generateTrialBalance({
        tenantId: TENANT_ID,
        startDate: '2020-01-01',
        endDate: '2030-12-31',
      });

      const totalDebit = trialBalance.totalPeriodDebit + trialBalance.totalClosingDebit;
      const totalCredit = trialBalance.totalPeriodCredit + trialBalance.totalClosingCredit;
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 12 — INVENTORY RECONCILIATION                         */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 12: Inventory Lifecycle', () => {
    it('stock changes correctly through full lifecycle', async () => {
      const customer = SEED_CUSTOMERS[0];
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      const initial = await inventoryRepo.getStockLevels(TENANT_ID);
      const initialStock = initial.find(s => s.productId === product.id)!.quantityOnHand;

      // +20 (purchase)
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'In', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 20, 100)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);

      let stock = await inventoryRepo.getStockLevels(TENANT_ID);
      expect(stock.find(s => s.productId === product.id)!.quantityOnHand).toBe(initialStock + 20);

      // -5 (sale)
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'Out', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      stock = await inventoryRepo.getStockLevels(TENANT_ID);
      expect(stock.find(s => s.productId === product.id)!.quantityOnHand).toBe(initialStock + 15);

      // +3 (sale return)
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'SRV', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 3, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);

      stock = await inventoryRepo.getStockLevels(TENANT_ID);
      expect(stock.find(s => s.productId === product.id)!.quantityOnHand).toBe(initialStock + 18);

      // -2 (purchase return)
      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'PRV', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 2, 100)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);

      stock = await inventoryRepo.getStockLevels(TENANT_ID);
      // Final: initial + 20 - 5 + 3 - 2 = initial + 16
      expect(stock.find(s => s.productId === product.id)!.quantityOnHand).toBe(initialStock + 16);
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 14 — DASHBOARD PARITY                                 */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 14: Dashboard Parity', () => {
    it('dashboard sales count matches BillsList posted sales count', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'Dash test', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 2, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const dashboard = await dashboardService.getDashboardData(TENANT_ID, 'month');
      const bills = await billsListService.getAllBills(TENANT_ID);
      const postedSales = bills.filter(b => b.voucher.voucherType === 'SV' && b.voucher.status === 'POSTED');

      expect(dashboard.sales.count).toBeGreaterThanOrEqual(1);
      expect(dashboard.sales.count).toBe(postedSales.length);
    });

    it('dashboard receivables = aging customer total', async () => {
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'Aging parity', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, 200)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);

      const dashboard = await dashboardService.getDashboardData(TENANT_ID, 'month');
      const aging = await agingReportService.generateReport(TENANT_ID, 'customer', today());

      const dashboardReceivables = dashboard.receivables.grandTotal;
      const agingTotal = aging.rows.reduce((sum, r) => sum + r.totalOutstanding, 0);

      expect(Math.abs(dashboardReceivables - agingTotal)).toBeLessThan(0.01);
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 15 — TENANT ISOLATION                                 */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 15: Tenant Isolation', () => {
    it('Tenant A data invisible to Tenant B across all modules', async () => {
      const tenantA = TENANT_ID;
      const tenantB = 'tenant-b-isolation-test';
      const customer = SEED_CUSTOMERS[0];
      const product = SEED_PRODUCTS[0];

      // Create data in Tenant A
      const sv = await salesService.createSaleBill(tenantA, {
        customerId: customer.id, date: today(), narration: 'A sale', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 5, 100)],
      }, 'admin');
      await salesService.postSaleBill(tenantA, sv.id);

      // Tenant B should see nothing
      const billsB = await billsListService.getAllBills(tenantB);
      expect(billsB.length).toBe(0);

      const agingB = await agingReportService.generateReport(tenantB, 'customer', today());
      expect(agingB.rows.length).toBe(0);

      const balancesB = await partyBalanceService.getCustomerBalances(tenantB);
      expect(balancesB.length).toBe(0);

      const dashboardB = await dashboardService.getDashboardData(tenantB, 'month');
      expect(dashboardB.sales.amount).toBe(0);

      // Tenant A should see the data
      const billsA = await billsListService.getAllBills(tenantA);
      expect(billsA.length).toBeGreaterThan(0);
    });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PHASE 16 — DELETE/POST LIFECYCLE                             */
  /* ═══════════════════════════════════════════════════════════ */

  describe('Phase 16: Delete/Post Lifecycle', () => {
    it('all services reject deletion of POSTED vouchers', async () => {
      const customer = SEED_CUSTOMERS[0];
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];
      const cashAccount = SEED_ACCOUNTS.find(a => a.accountCode === '11101')!;

      // SV
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'SV', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 1, 100)],
      }, 'admin');
      await salesService.postSaleBill(TENANT_ID, sv.id);
      await expect(salesService.deleteSaleBill(TENANT_ID, sv.id))
        .rejects.toThrow('Cannot delete a posted voucher');

      // SRV
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'SRV', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 1, 100)],
      }, 'admin');
      await saleReturnService.postSaleReturn(TENANT_ID, srv.id);
      await expect(saleReturnService.deleteSaleReturn(TENANT_ID, srv.id))
        .rejects.toThrow('Cannot delete a posted voucher');

      // PV
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'PV', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 1, 100)],
      }, 'admin');
      await purchaseService.postPurchaseBill(TENANT_ID, pv.id);
      await expect(purchaseService.deletePurchaseBill(TENANT_ID, pv.id))
        .rejects.toThrow('Cannot delete a posted voucher');

      // PRV
      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'PRV', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 1, 100)],
      }, 'admin');
      await purchaseReturnService.postPurchaseReturn(TENANT_ID, prv.id);
      await expect(purchaseReturnService.deletePurchaseReturn(TENANT_ID, prv.id))
        .rejects.toThrow('Cannot delete a posted voucher');

      // CR
      const cr = await customerReceiptService.createReceipt(TENANT_ID, {
        customerId: customer.id, cashAccountId: cashAccount.id,
        amount: 100, date: today(), narration: 'CR',
      }, 'admin');
      await customerReceiptService.postReceipt(TENANT_ID, cr.id);
      await expect(customerReceiptService.deleteReceipt(TENANT_ID, cr.id))
        .rejects.toThrow('Cannot delete a posted voucher');

      // CP
      const cp = await cashBookService.createCashPayment(TENANT_ID, {
        cashAccountId: cashAccount.id, debitAccountId: supplier.accountHeadId,
        amount: 100, date: today(), narration: 'CP',
      }, 'admin');
      await cashBookService.postVoucher(TENANT_ID, cp.id);
      await expect(cashBookService.deleteVoucher(TENANT_ID, cp.id))
        .rejects.toThrow('Cannot delete a posted voucher');

      // BillsList
      await expect(billsListService.deleteBill(TENANT_ID, sv.id))
        .rejects.toThrow('Cannot delete a posted voucher');
    });

    it('all services allow deletion of DRAFT vouchers', async () => {
      const customer = SEED_CUSTOMERS[0];
      const supplier = SEED_SUPPLIERS[0];
      const product = SEED_PRODUCTS[0];

      // SV
      const sv = await salesService.createSaleBill(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'SV', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 1, 100)],
      }, 'admin');
      await salesService.deleteSaleBill(TENANT_ID, sv.id);
      expect(await voucherRepo.getVoucherById(TENANT_ID, sv.id)).toBeNull();

      // SRV
      const srv = await saleReturnService.createSaleReturn(TENANT_ID, {
        customerId: customer.id, date: today(), narration: 'SRV', warehouseId: 'wh-1',
        lines: [saleLine(product.id, 1, 100)],
      }, 'admin');
      await saleReturnService.deleteSaleReturn(TENANT_ID, srv.id);
      expect(await voucherRepo.getVoucherById(TENANT_ID, srv.id)).toBeNull();

      // PV
      const pv = await purchaseService.createPurchaseBill(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'PV', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 1, 100)],
      }, 'admin');
      await purchaseService.deletePurchaseBill(TENANT_ID, pv.id);
      expect(await voucherRepo.getVoucherById(TENANT_ID, pv.id)).toBeNull();

      // PRV
      const prv = await purchaseReturnService.createPurchaseReturn(TENANT_ID, {
        supplierId: supplier.id, date: today(), narration: 'PRV', warehouseId: 'wh-1',
        lines: [purchaseLine(product.id, 1, 100)],
      }, 'admin');
      await purchaseReturnService.deletePurchaseReturn(TENANT_ID, prv.id);
      expect(await voucherRepo.getVoucherById(TENANT_ID, prv.id)).toBeNull();
    });
  });
});
