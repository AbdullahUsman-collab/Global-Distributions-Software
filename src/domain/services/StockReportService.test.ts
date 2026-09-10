/**
 * Stock Balance With Activity — Focused Tests
 * Tests the StockReportService and StockBWA report generation.
 *
 * Source: audit/24_stockbwa.html, audit/07_INVENTORY_ENGINE.md
 */

import { describe, it, expect } from 'vitest';
import { StockReportService } from '../services/StockReportService';
import { Product, StockMovement, StockBWAFilter } from '../types/inventory';
import type { IInventoryRepository } from '../repositories/IInventoryRepository';
import type { Warehouse, WarehouseLocation, StockLevel, ItemBatch, ItemSerial, CreateProductDTO, UpdateProductDTO } from '../types/inventory';

/* ─── Helpers ──────────────────────────────────────────────── */

const TENANT = 'test-tenant';
const OTHER_TENANT = 'other-tenant';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1', tenantId: TENANT, sku: 'WH-001', name: 'Product Alpha',
    category: 'General', unit: 'PCS', pcsPerCarton: 24,
    saleRate: 100, purchaseRate: 60, retailPrice: 66,
    tradeDiscount: 5, tradeOffer: '', minQuantity: 0,
    hsCode: '001', gstType: 'VAT', gstPercent: 18, fedPercent: 0,
    advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0,
    costRate: 61.68, margin: 0.072, isActive: true,
    ...overrides,
  };
}

function makeMovement(overrides: Partial<StockMovement> = {}): StockMovement {
  return {
    id: 'mov-1', tenantId: TENANT, movementType: 'GRN',
    movementDate: daysAgo(5), toWarehouseId: 'wh-1',
    productId: 'prod-1', quantity: 100, unitCost: 60,
    totalCost: 6000, narration: 'Test GRN', status: 'POSTED',
    createdAt: new Date().toISOString(), createdBy: 'system',
    ...overrides,
  };
}

function createMockRepo(products: Product[], movements: StockMovement[]): IInventoryRepository {
  return {
    getProducts: async (tid: string) => products.filter(p => p.tenantId === tid),
    getProductById: async (tid: string, id: string) => products.find(p => p.tenantId === tid && p.id === id) ?? null,
    createProduct: async () => { throw new Error('not implemented'); },
    updateProduct: async () => { throw new Error('not implemented'); },
    deactivateProduct: async () => { throw new Error('not implemented'); },
    getWarehouses: async () => [],
    getWarehouseLocations: async () => [],
    getStockLevels: async () => [],
    getStockLevelForProduct: async () => null,
    getStockMovements: async (tid: string) => movements.filter(m => m.tenantId === tid),
    getStockMovementById: async () => null,
    createStockMovement: async () => { throw new Error('not implemented'); },
    postStockMovement: async () => { throw new Error('not implemented'); },
    cancelStockMovement: async () => { throw new Error('not implemented'); },
    getBatches: async () => [],
    getSerials: async () => [],
  };
}

/* ─── Tests ────────────────────────────────────────────────── */

describe('StockReportService — Stock Balance With Activity', () => {

  // TEST 1 — Opening balance: movements before startDate are included in opening
  it('TEST 1: Opening balance includes movements before startDate', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'GRN', movementDate: daysAgo(10), quantity: 100 }),
      makeMovement({ id: 'm2', movementType: 'GRN', movementDate: daysAgo(8), quantity: 50 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows.length).toBe(1);
    expect(report.rows[0].openingQty).toBe(150); // 100 + 50
    expect(report.rows[0].grnQty).toBe(0); // no GRN in period
    expect(report.rows[0].closingQty).toBe(150);
  });

  // TEST 2 — Period activity: only movements within date range are included
  it('TEST 2: Period activity includes only movements within date range', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'GRN', movementDate: daysAgo(10), quantity: 100 }),
      makeMovement({ id: 'm2', movementType: 'GRN', movementDate: daysAgo(3), quantity: 50 }),
      makeMovement({ id: 'm3', movementType: 'ISSUE', movementDate: daysAgo(2), quantity: 30 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows[0].openingQty).toBe(100); // before period
    expect(report.rows[0].grnQty).toBe(50); // in period
    expect(report.rows[0].issueQty).toBe(30); // in period
    expect(report.rows[0].closingQty).toBe(120); // 100 + 50 - 30
  });

  // TEST 3 — Closing balance: Opening + Net Activity = Closing
  it('TEST 3: Closing balance = Opening + Net Activity', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'GRN', movementDate: daysAgo(10), quantity: 100 }),
      makeMovement({ id: 'm2', movementType: 'GRN', movementDate: daysAgo(3), quantity: 50 }),
      makeMovement({ id: 'm3', movementType: 'ISSUE', movementDate: daysAgo(2), quantity: 30 }),
      makeMovement({ id: 'm4', movementType: 'RETURN', movementDate: daysAgo(1), quantity: 10 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    const r = report.rows[0];
    // Opening = 100, GRN = 50, ISSUE = 30, RETURN = 10
    // Closing = 100 + 50 + 10 - 30 = 130
    expect(r.openingQty).toBe(100);
    expect(r.grnQty).toBe(50);
    expect(r.issueQty).toBe(30);
    expect(r.returnQty).toBe(10);
    expect(r.closingQty).toBe(130);
    expect(r.closingQty).toBe(r.openingQty + r.grnQty + r.returnQty - r.issueQty);
  });

  // TEST 4 — GRN treatment: GRN increases stock
  it('TEST 4: GRN increases stock (incoming)', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'GRN', movementDate: daysAgo(3), quantity: 200 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows[0].grnQty).toBe(200);
    expect(report.rows[0].closingQty).toBe(200);
  });

  // TEST 5 — ISSUE treatment: ISSUE decreases stock
  it('TEST 5: ISSUE decreases stock (outgoing)', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'GRN', movementDate: daysAgo(10), quantity: 100 }),
      makeMovement({ id: 'm2', movementType: 'ISSUE', movementDate: daysAgo(3), quantity: 40 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows[0].openingQty).toBe(100);
    expect(report.rows[0].issueQty).toBe(40);
    expect(report.rows[0].closingQty).toBe(60);
  });

  // TEST 6 — RETURN treatment: RETURN increases stock (sale return)
  it('TEST 6: RETURN increases stock (sale return)', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'RETURN', movementDate: daysAgo(3), quantity: 15 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows[0].returnQty).toBe(15);
    expect(report.rows[0].closingQty).toBe(15);
  });

  // TEST 7 — TRANSFER treatment: source decrease, destination increase
  it('TEST 7: TRANSFER — source decrease, destination increase', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'TRANSFER', movementDate: daysAgo(3), quantity: 25, fromWarehouseId: 'wh-1', toWarehouseId: 'wh-2' }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    // Transfer with both from and to: counted as both in and out
    expect(report.rows[0].transferInQty).toBe(25);
    expect(report.rows[0].transferOutQty).toBe(25);
  });

  // TEST 8 — ADJUSTMENT treatment: positive increases, negative decreases
  it('TEST 8: ADJUSTMENT — positive increases, negative decreases', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'ADJUSTMENT', movementDate: daysAgo(3), quantity: 20 }),
      makeMovement({ id: 'm2', movementType: 'ADJUSTMENT', movementDate: daysAgo(2), quantity: -5 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows[0].adjustmentQty).toBe(15); // 20 - 5
    expect(report.rows[0].closingQty).toBe(15);
  });

  // TEST 9 — Product filter: only selected product is included
  it('TEST 9: Product filter returns only selected product', async () => {
    const p1 = makeProduct({ id: 'prod-1', sku: 'WH-001', name: 'Alpha' });
    const p2 = makeProduct({ id: 'prod-2', sku: 'WH-002', name: 'Beta' });
    const movements = [
      makeMovement({ id: 'm1', productId: 'prod-1', movementDate: daysAgo(3), quantity: 100 }),
      makeMovement({ id: 'm2', productId: 'prod-2', movementDate: daysAgo(3), quantity: 200 }),
    ];
    const repo = createMockRepo([p1, p2], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
      productId: 'prod-1',
    });

    expect(report.rows.length).toBe(1);
    expect(report.rows[0].productId).toBe('prod-1');
    expect(report.rows[0].grnQty).toBe(100);
  });

  // TEST 10 — Date validation: startDate > endDate should still work (service doesn't reject)
  it('TEST 10: Date range — all movements before startDate count as opening', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'GRN', movementDate: daysAgo(10), quantity: 100 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    // Empty period — no movements in range
    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: daysAgo(4),
    });

    expect(report.rows[0].openingQty).toBe(100);
    expect(report.rows[0].grnQty).toBe(0);
    expect(report.rows[0].closingQty).toBe(100);
  });

  // TEST 11 — Tenant isolation: Tenant A cannot see Tenant B movements
  it('TEST 11: Tenant isolation — only own tenant data returned', async () => {
    const ownProduct = makeProduct({ tenantId: TENANT, id: 'p1' });
    const otherProduct = makeProduct({ tenantId: OTHER_TENANT, id: 'p2', sku: 'OTHER-001' });
    const movements = [
      makeMovement({ id: 'm1', tenantId: TENANT, productId: 'p1', quantity: 100 }),
      makeMovement({ id: 'm2', tenantId: OTHER_TENANT, productId: 'p2', quantity: 999 }),
    ];
    const repo = createMockRepo([ownProduct, otherProduct], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows.length).toBe(1);
    expect(report.rows[0].productId).toBe('p1');
    expect(report.rows[0].grnQty).toBe(100);
  });

  // TEST 12 — Multiple products: aggregation is correct per product
  it('TEST 12: Multiple products — correct per-product aggregation', async () => {
    const p1 = makeProduct({ id: 'p1', sku: 'A', name: 'Alpha' });
    const p2 = makeProduct({ id: 'p2', sku: 'B', name: 'Beta' });
    const movements = [
      makeMovement({ id: 'm1', productId: 'p1', movementDate: daysAgo(3), quantity: 100 }),
      makeMovement({ id: 'm2', productId: 'p2', movementDate: daysAgo(3), quantity: 200 }),
      makeMovement({ id: 'm3', productId: 'p1', movementDate: daysAgo(2), quantity: 50 }),
    ];
    const repo = createMockRepo([p1, p2], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows.length).toBe(2);
    const alpha = report.rows.find(r => r.productId === 'p1')!;
    const beta = report.rows.find(r => r.productId === 'p2')!;
    expect(alpha.grnQty).toBe(150); // 100 + 50
    expect(beta.grnQty).toBe(200);
    expect(report.totalGrnQty).toBe(350);
  });

  // TEST 13 — Stock reconciliation: closing report quantity reconciles with stock levels
  it('TEST 13: Stock reconciliation — closing = opening + net activity', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'GRN', movementDate: daysAgo(10), quantity: 100 }),
      makeMovement({ id: 'm2', movementType: 'GRN', movementDate: daysAgo(3), quantity: 50 }),
      makeMovement({ id: 'm3', movementType: 'ISSUE', movementDate: daysAgo(2), quantity: 30 }),
      makeMovement({ id: 'm4', movementType: 'RETURN', movementDate: daysAgo(1), quantity: 10 }),
      makeMovement({ id: 'm5', movementType: 'ADJUSTMENT', movementDate: daysAgo(1), quantity: 5 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    const r = report.rows[0];
    const expectedClosing = r.openingQty + r.grnQty + r.returnQty + r.adjustmentQty - r.issueQty;
    expect(r.closingQty).toBe(expectedClosing);
    expect(report.totalClosingQty).toBe(expectedClosing);
  });

  // TEST 14 — Empty period: valid period with no movements returns correct opening/closing
  it('TEST 14: Empty period — no movements in range, opening = closing', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', movementType: 'GRN', movementDate: daysAgo(10), quantity: 100 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    // All movements are before startDate, so opening = 100, period activity = 0
    expect(report.rows[0].openingQty).toBe(100);
    expect(report.rows[0].grnQty).toBe(0);
    expect(report.rows[0].issueQty).toBe(0);
    expect(report.rows[0].returnQty).toBe(0);
    expect(report.rows[0].adjustmentQty).toBe(0);
    expect(report.rows[0].closingQty).toBe(100);
  });

  // TEST 15 — Sorting: rows sorted by product code
  it('TEST 15: Rows sorted by product code', async () => {
    const p1 = makeProduct({ id: 'p1', sku: 'Z-PRODUCT', name: 'Z Product' });
    const p2 = makeProduct({ id: 'p2', sku: 'A-PRODUCT', name: 'A Product' });
    const movements = [
      makeMovement({ id: 'm1', productId: 'p1', quantity: 100 }),
      makeMovement({ id: 'm2', productId: 'p2', quantity: 200 }),
    ];
    const repo = createMockRepo([p1, p2], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows[0].productCode).toBe('A-PRODUCT');
    expect(report.rows[1].productCode).toBe('Z-PRODUCT');
  });

  // TEST 16 — Only POSTED movements included
  it('TEST 16: Only POSTED movements are included', async () => {
    const product = makeProduct();
    const movements = [
      makeMovement({ id: 'm1', status: 'POSTED', quantity: 100 }),
      makeMovement({ id: 'm2', status: 'DRAFT', quantity: 200 }),
      makeMovement({ id: 'm3', status: 'CANCELLED', quantity: 300 }),
    ];
    const repo = createMockRepo([product], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows[0].grnQty).toBe(100); // only POSTED
  });

  // TEST 17 — Totals: report totals match sum of rows
  it('TEST 17: Report totals match sum of individual rows', async () => {
    const p1 = makeProduct({ id: 'p1', sku: 'A' });
    const p2 = makeProduct({ id: 'p2', sku: 'B' });
    const movements = [
      makeMovement({ id: 'm1', productId: 'p1', movementType: 'GRN', quantity: 100 }),
      makeMovement({ id: 'm2', productId: 'p2', movementType: 'GRN', quantity: 200 }),
      makeMovement({ id: 'm3', productId: 'p1', movementType: 'ISSUE', quantity: 30 }),
    ];
    const repo = createMockRepo([p1, p2], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    const sumGrn = report.rows.reduce((s, r) => s + r.grnQty, 0);
    const sumIssue = report.rows.reduce((s, r) => s + r.issueQty, 0);
    const sumClosing = report.rows.reduce((s, r) => s + r.closingQty, 0);

    expect(report.totalGrnQty).toBe(sumGrn);
    expect(report.totalIssueQty).toBe(sumIssue);
    expect(report.totalClosingQty).toBe(sumClosing);
  });

  // TEST 18 — Inactive products excluded
  it('TEST 18: Inactive products are excluded from report', async () => {
    const active = makeProduct({ id: 'p1', sku: 'ACTIVE', isActive: true });
    const inactive = makeProduct({ id: 'p2', sku: 'INACTIVE', isActive: false });
    const movements = [
      makeMovement({ id: 'm1', productId: 'p1', quantity: 100 }),
      makeMovement({ id: 'm2', productId: 'p2', quantity: 200 }),
    ];
    const repo = createMockRepo([active, inactive], movements);
    const service = new StockReportService(repo);

    const report = await service.generateStockBWA({
      tenantId: TENANT,
      startDate: daysAgo(5),
      endDate: today(),
    });

    expect(report.rows.length).toBe(1);
    expect(report.rows[0].productCode).toBe('ACTIVE');
  });
});
