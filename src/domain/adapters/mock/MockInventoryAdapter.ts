/**
 * Mock Inventory Adapter
 * DEVELOPMENT ONLY — In-memory mock implementation of IInventoryRepository.
 *
 * Seeds sample products, warehouses, stock levels, and stock movements per tenant.
 * Implements AVCO (Average Cost) valuation engine for stock movements.
 *
 * Source: audit/23_DATA_MODEL.md, audit/03_MASTER_DATA.md, audit/16_CALCULATIONS.md
 */

import {
  Product,
  Warehouse,
  WarehouseLocation,
  StockLevel,
  StockMovement,
  StockMovementStatus,
  ItemBatch,
  ItemSerial,
  CreateProductDTO,
  UpdateProductDTO,
  calculateAVCO,
} from '../../types/inventory';
import { IInventoryRepository } from '../../repositories/IInventoryRepository';

/* ─── Helpers ──────────────────────────────────────────────── */

let nextId = 8000;

function uid(): string {
  return `inv-${nextId++}`;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/* ─── Tenant Seed Map ──────────────────────────────────────── */

const TENANT_IDS = [
  'tenant-demo-wholesale-001',
  'tenant-demo-distribution-002',
  'tenant-apex-trading-003',
];

/** Per-tenant stores */
const productsStore: Map<string, Product[]> = new Map();
const warehousesStore: Map<string, Warehouse[]> = new Map();
const locationsStore: Map<string, WarehouseLocation[]> = new Map();
const stockLevelsStore: Map<string, StockLevel[]> = new Map();
const movementsStore: Map<string, StockMovement[]> = new Map();
const batchesStore: Map<string, ItemBatch[]> = new Map();
const serialsStore: Map<string, ItemSerial[]> = new Map();

/* ─── Seed Data ────────────────────────────────────────────── */

/**
 * Build seed products per tenant.
 * Source: audit/23_DATA_MODEL.md (Items table)
 * Uses demo product names — never "MotherCare" or real brand names.
 */
function buildSeedProducts(tenantId: string): Product[] {
  return [
    {
      id: uid(), tenantId,
      sku: 'PROD-001', name: 'Premium Powder 400g',
      category: 'Powder', unit: 'Pcs', pcsPerCarton: 24,
      saleRate: 850, purchaseRate: 680, retailPrice: 900,
      tradeDiscount: 5, tradeOffer: 'Buy 10 Get 1', minQuantity: 5,
      hsCode: '3304.99', gstType: 'VAT', gstPercent: 17, fedPercent: 0,
      advanceTaxSalePercent: 1, advanceTaxPurchasePercent: 1,
      isActive: true,
    },
    {
      id: uid(), tenantId,
      sku: 'PROD-002', name: 'Moisturizing Lotion 200ml',
      category: 'Lotion', unit: 'Pcs', pcsPerCarton: 36,
      saleRate: 450, purchaseRate: 320, retailPrice: 500,
      tradeDiscount: 3, tradeOffer: '', minQuantity: 10,
      hsCode: '3304.99', gstType: 'VAT', gstPercent: 17, fedPercent: 0,
      advanceTaxSalePercent: 1, advanceTaxPurchasePercent: 1,
      isActive: true,
    },
    {
      id: uid(), tenantId,
      sku: 'PROD-003', name: 'Gift Box Set',
      category: 'Gift Box', unit: 'Set', pcsPerCarton: 12,
      saleRate: 1200, purchaseRate: 850, retailPrice: 1350,
      tradeDiscount: 8, tradeOffer: 'Buy 5 Get 1', minQuantity: 3,
      hsCode: '4819.10', gstType: 'VAT', gstPercent: 17, fedPercent: 0,
      advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0,
      isActive: true,
    },
    {
      id: uid(), tenantId,
      sku: 'PROD-004', name: 'Gentle Shampoo 250ml',
      category: 'Shampoo', unit: 'Pcs', pcsPerCarton: 30,
      saleRate: 380, purchaseRate: 270, retailPrice: 420,
      tradeDiscount: 4, tradeOffer: '', minQuantity: 10,
      hsCode: '3305.10', gstType: 'VAT', gstPercent: 17, fedPercent: 0,
      advanceTaxSalePercent: 1, advanceTaxPurchasePercent: 1,
      isActive: true,
    },
    {
      id: uid(), tenantId,
      sku: 'PROD-005', name: 'Cleaning Wipes Pack',
      category: 'Wipes', unit: 'Pack', pcsPerCarton: 48,
      saleRate: 220, purchaseRate: 150, retailPrice: 250,
      tradeDiscount: 2, tradeOffer: '', minQuantity: 20,
      hsCode: '3401.19', gstType: 'VAT', gstPercent: 17, fedPercent: 0,
      advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0,
      isActive: true,
    },
    {
      id: uid(), tenantId,
      sku: 'PROD-006', name: 'Olive Oil 500ml',
      category: 'Oil', unit: 'Btl', pcsPerCarton: 20,
      saleRate: 650, purchaseRate: 480, retailPrice: 700,
      tradeDiscount: 5, tradeOffer: 'Buy 12 Get 2', minQuantity: 6,
      hsCode: '1509.10', gstType: 'VAT', gstPercent: 17, fedPercent: 0,
      advanceTaxSalePercent: 1, advanceTaxPurchasePercent: 1,
      isActive: true,
    },
    {
      id: uid(), tenantId,
      sku: 'PROD-007', name: 'Bar Soap 100g',
      category: 'Soap', unit: 'Pcs', pcsPerCarton: 60,
      saleRate: 120, purchaseRate: 80, retailPrice: 140,
      tradeDiscount: 3, tradeOffer: '', minQuantity: 30,
      hsCode: '3401.11', gstType: 'VAT', gstPercent: 17, fedPercent: 0,
      advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0,
      isActive: true,
    },
    {
      id: uid(), tenantId,
      sku: 'PROD-008', name: 'Pouch Snack 250g',
      category: 'Pouch', unit: 'Pcs', pcsPerCarton: 40,
      saleRate: 320, purchaseRate: 240, retailPrice: 350,
      tradeDiscount: 4, tradeOffer: 'Buy 20 Get 3', minQuantity: 10,
      hsCode: '1905.90', gstType: 'VAT', gstPercent: 17, fedPercent: 0,
      advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0,
      isActive: true,
    },
  ];
}

/**
 * Build seed warehouses per tenant.
 * Source: audit/03_MASTER_DATA.md — "No warehouse selection observed in forms."
 * INFERRED: Legacy uses single warehouse. New ERP supports multi-warehouse.
 */
function buildSeedWarehouses(tenantId: string): Warehouse[] {
  return [
    { id: uid(), tenantId, code: 'WH-01', name: 'Main Warehouse', isActive: true },
    { id: uid(), tenantId, code: 'WH-02', name: 'Showroom / Transit', isActive: true },
  ];
}

/**
 * Build seed locations per warehouse.
 */
function buildSeedLocations(tenantId: string, warehouseId: string, warehouseCode: string): WarehouseLocation[] {
  return [
    { id: uid(), tenantId, warehouseId, code: `${warehouseCode}-LOC-01`, name: 'Ground Floor', rack: 'A', shelf: '1', bin: '01' },
    { id: uid(), tenantId, warehouseId, code: `${warehouseCode}-LOC-02`, name: 'Ground Floor', rack: 'A', shelf: '2', bin: '01' },
    { id: uid(), tenantId, warehouseId, code: `${warehouseCode}-LOC-03`, name: 'First Floor', rack: 'B', shelf: '1', bin: '01' },
  ];
}

/**
 * Build seed stock levels per tenant.
 * Initial AVCO costs based on purchase rates.
 */
function buildSeedStockLevels(
  tenantId: string,
  products: Product[],
  warehouses: Warehouse[],
): StockLevel[] {
  const levels: StockLevel[] = [];
  const now = new Date().toISOString();

  for (const wh of warehouses) {
    for (const prod of products) {
      // Main warehouse gets full stock, showroom gets partial
      const qty = wh.code === 'WH-01' ? Math.floor(Math.random() * 500) + 100 : Math.floor(Math.random() * 50) + 10;
      levels.push({
        id: uid(),
        tenantId,
        productId: prod.id,
        warehouseId: wh.id,
        quantityOnHand: qty,
        quantityReserved: 0,
        unitCost: prod.purchaseRate,
        reorderLevel: 50,
        minimumStock: 20,
        maximumStock: 1000,
        lastCountDate: now,
      });
    }
  }
  return levels;
}

/**
 * Build seed stock movements per tenant.
 * Historical GRN and ADJUSTMENT movements.
 */
function buildSeedMovements(
  tenantId: string,
  products: Product[],
  warehouses: Warehouse[],
): StockMovement[] {
  const movements: StockMovement[] = [];
  const now = new Date();

  // Generate 3 historical GRN movements
  for (let i = 0; i < 3; i++) {
    const prod = products[i % products.length];
    const wh = warehouses[0];
    const qty = 100 + i * 50;
    const date = new Date(now.getTime() - (3 - i) * 86400000);

    movements.push({
      id: uid(),
      tenantId,
      movementType: 'GRN',
      movementDate: date.toISOString().split('T')[0],
      toWarehouseId: wh.id,
      productId: prod.id,
      quantity: qty,
      unitCost: prod.purchaseRate,
      totalCost: qty * prod.purchaseRate,
      narration: `Initial GRN for ${prod.name}`,
      status: 'POSTED',
      createdAt: date.toISOString(),
      createdBy: 'system',
    });
  }

  // Generate 2 historical ADJUSTMENT movements
  for (let i = 0; i < 2; i++) {
    const prod = products[i + 3];
    const wh = warehouses[0];
    const qty = 10 + i * 5;
    const date = new Date(now.getTime() - (2 - i) * 86400000);

    movements.push({
      id: uid(),
      tenantId,
      movementType: 'ADJUSTMENT',
      movementDate: date.toISOString().split('T')[0],
      fromWarehouseId: wh.id,
      productId: prod.id,
      quantity: qty,
      unitCost: prod.purchaseRate,
      totalCost: qty * prod.purchaseRate,
      narration: `Stock adjustment for ${prod.name}`,
      status: 'POSTED',
      createdAt: date.toISOString(),
      createdBy: 'system',
    });
  }

  return movements;
}

/* ─── Seed Execution ───────────────────────────────────────── */

for (const tid of TENANT_IDS) {
  const products = buildSeedProducts(tid);
  const warehouses = buildSeedWarehouses(tid);
  const locations: WarehouseLocation[] = [];
  const stockLevels = buildSeedStockLevels(tid, products, warehouses);
  const movements = buildSeedMovements(tid, products, warehouses);

  // Build locations for each warehouse
  for (const wh of warehouses) {
    locations.push(...buildSeedLocations(tid, wh.id, wh.code));
  }

  productsStore.set(tid, products);
  warehousesStore.set(tid, warehouses);
  locationsStore.set(tid, locations);
  stockLevelsStore.set(tid, stockLevels);
  movementsStore.set(tid, movements);
  batchesStore.set(tid, []);
  serialsStore.set(tid, []);
}

/* ─── Adapter Implementation ───────────────────────────────── */

/**
 * Mock implementation of IInventoryRepository.
 * DEVELOPMENT ONLY — Do not use in production.
 */
export class MockInventoryAdapter implements IInventoryRepository {

  /* ─── Product Queries ───────────────────────────────────── */

  async getProducts(tenantId: string): Promise<Product[]> {
    const products = productsStore.get(tenantId) ?? [];
    return deepClone(products);
  }

  async getProductById(tenantId: string, id: string): Promise<Product | null> {
    const products = productsStore.get(tenantId) ?? [];
    const found = products.find(p => p.id === id);
    return found ? deepClone(found) : null;
  }

  async createProduct(tenantId: string, dto: CreateProductDTO): Promise<Product> {
    const products = productsStore.get(tenantId) ?? [];

    // Check for duplicate SKU
    if (products.some(p => p.sku === dto.sku)) {
      throw new Error(`Product SKU ${dto.sku} already exists`);
    }

    const product: Product = {
      id: uid(),
      tenantId,
      sku: dto.sku,
      name: dto.name,
      category: dto.category,
      unit: dto.unit,
      pcsPerCarton: dto.pcsPerCarton,
      saleRate: dto.saleRate,
      purchaseRate: dto.purchaseRate,
      retailPrice: dto.retailPrice,
      tradeDiscount: dto.tradeDiscount ?? 0,
      tradeOffer: dto.tradeOffer ?? '',
      minQuantity: dto.minQuantity ?? 0,
      hsCode: dto.hsCode ?? '',
      gstType: dto.gstType ?? 'VAT',
      gstPercent: dto.gstPercent ?? 0,
      fedPercent: dto.fedPercent ?? 0,
      advanceTaxSalePercent: dto.advanceTaxSalePercent ?? 0,
      advanceTaxPurchasePercent: dto.advanceTaxPurchasePercent ?? 0,
      isActive: dto.isActive ?? true,
    };

    products.push(product);
    productsStore.set(tenantId, products);
    return deepClone(product);
  }

  async updateProduct(tenantId: string, id: string, dto: UpdateProductDTO): Promise<Product> {
    const products = productsStore.get(tenantId) ?? [];
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Product not found');

    const existing = products[idx];
    const updated: Product = {
      ...existing,
      name: dto.name ?? existing.name,
      category: dto.category ?? existing.category,
      unit: dto.unit ?? existing.unit,
      pcsPerCarton: dto.pcsPerCarton ?? existing.pcsPerCarton,
      saleRate: dto.saleRate ?? existing.saleRate,
      purchaseRate: dto.purchaseRate ?? existing.purchaseRate,
      retailPrice: dto.retailPrice ?? existing.retailPrice,
      tradeDiscount: dto.tradeDiscount ?? existing.tradeDiscount,
      tradeOffer: dto.tradeOffer ?? existing.tradeOffer,
      minQuantity: dto.minQuantity ?? existing.minQuantity,
      hsCode: dto.hsCode ?? existing.hsCode,
      gstType: dto.gstType ?? existing.gstType,
      gstPercent: dto.gstPercent ?? existing.gstPercent,
      fedPercent: dto.fedPercent ?? existing.fedPercent,
      advanceTaxSalePercent: dto.advanceTaxSalePercent ?? existing.advanceTaxSalePercent,
      advanceTaxPurchasePercent: dto.advanceTaxPurchasePercent ?? existing.advanceTaxPurchasePercent,
      isActive: dto.isActive ?? existing.isActive,
    };

    products[idx] = updated;
    productsStore.set(tenantId, products);
    return deepClone(updated);
  }

  async deactivateProduct(tenantId: string, id: string): Promise<void> {
    const products = productsStore.get(tenantId) ?? [];
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Product not found');
    products[idx] = { ...products[idx], isActive: false };
    productsStore.set(tenantId, products);
  }

  /* ─── Warehouse Queries ─────────────────────────────────── */

  async getWarehouses(tenantId: string): Promise<Warehouse[]> {
    const warehouses = warehousesStore.get(tenantId) ?? [];
    return deepClone(warehouses);
  }

  async getWarehouseLocations(tenantId: string, warehouseId: string): Promise<WarehouseLocation[]> {
    const locations = locationsStore.get(tenantId) ?? [];
    return deepClone(locations.filter(l => l.warehouseId === warehouseId));
  }

  /* ─── Stock Level Queries ───────────────────────────────── */

  async getStockLevels(tenantId: string, warehouseId?: string): Promise<StockLevel[]> {
    let levels = stockLevelsStore.get(tenantId) ?? [];
    if (warehouseId) {
      levels = levels.filter(l => l.warehouseId === warehouseId);
    }
    return deepClone(levels);
  }

  async getStockLevelForProduct(
    tenantId: string,
    productId: string,
    warehouseId: string,
  ): Promise<StockLevel | null> {
    const levels = stockLevelsStore.get(tenantId) ?? [];
    const found = levels.find(l => l.productId === productId && l.warehouseId === warehouseId);
    return found ? deepClone(found) : null;
  }

  /* ─── Stock Movement Queries ────────────────────────────── */

  async getStockMovements(tenantId: string, productId?: string): Promise<StockMovement[]> {
    let movements = movementsStore.get(tenantId) ?? [];
    if (productId) {
      movements = movements.filter(m => m.productId === productId);
    }
    return deepClone(movements.sort((a, b) => b.movementDate.localeCompare(a.movementDate)));
  }

  async getStockMovementById(tenantId: string, id: string): Promise<StockMovement | null> {
    const movements = movementsStore.get(tenantId) ?? [];
    const found = movements.find(m => m.id === id);
    return found ? deepClone(found) : null;
  }

  /* ─── Stock Movement Mutations ──────────────────────────── */

  async createStockMovement(
    tenantId: string,
    movement: Omit<StockMovement, 'id' | 'createdAt'>,
  ): Promise<StockMovement> {
    const newMovement: StockMovement = {
      ...movement,
      id: uid(),
      createdAt: new Date().toISOString(),
    };

    const movements = movementsStore.get(tenantId) ?? [];
    movements.push(newMovement);
    movementsStore.set(tenantId, movements);

    return deepClone(newMovement);
  }

  async postStockMovement(tenantId: string, movementId: string): Promise<StockMovement> {
    const movements = movementsStore.get(tenantId) ?? [];
    const idx = movements.findIndex(m => m.id === movementId);
    if (idx === -1) throw new Error('Stock movement not found');

    const movement = movements[idx];
    if (movement.status === 'POSTED') throw new Error('Movement is already posted');
    if (movement.status === 'CANCELLED') throw new Error('Cannot post a cancelled movement');

    const levels = stockLevelsStore.get(tenantId) ?? [];
    const products = productsStore.get(tenantId) ?? [];

    // Find the product for validation
    const product = products.find(p => p.id === movement.productId);
    if (!product) throw new Error(`Product not found: ${movement.productId}`);

    switch (movement.movementType) {
      case 'GRN':
      case 'RETURN': {
        // Positive stock addition — update AVCO
        const targetWarehouseId = movement.toWarehouseId ?? movement.fromWarehouseId;
        if (!targetWarehouseId) throw new Error('Target warehouse required for GRN/RETURN');

        const levelIdx = levels.findIndex(
          l => l.productId === movement.productId && l.warehouseId === targetWarehouseId,
        );

        if (levelIdx === -1) {
          // Create new stock level
          levels.push({
            id: uid(),
            tenantId,
            productId: movement.productId,
            warehouseId: targetWarehouseId,
            quantityOnHand: movement.quantity,
            quantityReserved: 0,
            unitCost: movement.unitCost,
          });
        } else {
          // Update existing stock level with AVCO
          const level = levels[levelIdx];
          const newUnitCost = calculateAVCO(
            level.quantityOnHand,
            level.unitCost,
            movement.quantity,
            movement.unitCost,
          );
          levels[levelIdx] = {
            ...level,
            quantityOnHand: level.quantityOnHand + movement.quantity,
            unitCost: newUnitCost,
          };
        }
        break;
      }

      case 'ISSUE': {
        // Outgoing stock — validate sufficient quantity
        const sourceWarehouseId = movement.fromWarehouseId;
        if (!sourceWarehouseId) throw new Error('Source warehouse required for ISSUE');

        const levelIdx = levels.findIndex(
          l => l.productId === movement.productId && l.warehouseId === sourceWarehouseId,
        );

        if (levelIdx === -1) {
          throw new Error(`Insufficient inventory stock for Product [${product.name}] — No stock record found`);
        }

        const level = levels[levelIdx];
        if (level.quantityOnHand < movement.quantity) {
          throw new Error(
            `Insufficient inventory stock for Product [${product.name}] — ` +
            `Available: ${level.quantityOnHand}, Requested: ${movement.quantity}`,
          );
        }

        // Deduct at current AVCO cost
        levels[levelIdx] = {
          ...level,
          quantityOnHand: level.quantityOnHand - movement.quantity,
        };
        break;
      }

      case 'TRANSFER': {
        // Transfer between warehouses
        const sourceWarehouseId = movement.fromWarehouseId;
        const targetWarehouseId = movement.toWarehouseId;
        if (!sourceWarehouseId || !targetWarehouseId) {
          throw new Error('Source and target warehouses required for TRANSFER');
        }
        if (sourceWarehouseId === targetWarehouseId) {
          throw new Error('Source and target warehouses must be different');
        }

        // Validate source has sufficient stock
        const sourceIdx = levels.findIndex(
          l => l.productId === movement.productId && l.warehouseId === sourceWarehouseId,
        );

        if (sourceIdx === -1) {
          throw new Error(`Insufficient inventory stock for Product [${product.name}] — No stock record in source warehouse`);
        }

        const sourceLevel = levels[sourceIdx];
        if (sourceLevel.quantityOnHand < movement.quantity) {
          throw new Error(
            `Insufficient inventory stock for Product [${product.name}] in source warehouse — ` +
            `Available: ${sourceLevel.quantityOnHand}, Requested: ${movement.quantity}`,
          );
        }

        // Deduct from source at current AVCO
        levels[sourceIdx] = {
          ...sourceLevel,
          quantityOnHand: sourceLevel.quantityOnHand - movement.quantity,
        };

        // Add to target at current AVCO (source cost preserved)
        const targetIdx = levels.findIndex(
          l => l.productId === movement.productId && l.warehouseId === targetWarehouseId,
        );

        if (targetIdx === -1) {
          levels.push({
            id: uid(),
            tenantId,
            productId: movement.productId,
            warehouseId: targetWarehouseId,
            quantityOnHand: movement.quantity,
            quantityReserved: 0,
            unitCost: sourceLevel.unitCost,
          });
        } else {
          const targetLevel = levels[targetIdx];
          const newUnitCost = calculateAVCO(
            targetLevel.quantityOnHand,
            targetLevel.unitCost,
            movement.quantity,
            sourceLevel.unitCost,
          );
          levels[targetIdx] = {
            ...targetLevel,
            quantityOnHand: targetLevel.quantityOnHand + movement.quantity,
            unitCost: newUnitCost,
          };
        }
        break;
      }

      case 'ADJUSTMENT': {
        // Adjustment — can be positive or negative
        const warehouseId = movement.fromWarehouseId ?? movement.toWarehouseId;
        if (!warehouseId) throw new Error('Warehouse required for ADJUSTMENT');

        const levelIdx = levels.findIndex(
          l => l.productId === movement.productId && l.warehouseId === warehouseId,
        );

        if (levelIdx === -1) {
          if (movement.quantity < 0) {
            throw new Error(`Insufficient inventory stock for Product [${product.name}] — No stock record found`);
          }
          // Create new stock level for positive adjustment
          levels.push({
            id: uid(),
            tenantId,
            productId: movement.productId,
            warehouseId,
            quantityOnHand: movement.quantity,
            quantityReserved: 0,
            unitCost: movement.unitCost,
          });
        } else {
          const level = levels[levelIdx];
          const newQty = level.quantityOnHand + movement.quantity;

          if (newQty < 0) {
            throw new Error(
              `Insufficient inventory stock for Product [${product.name}] — ` +
              `Available: ${level.quantityOnHand}, Adjustment: ${movement.quantity}`,
            );
          }

          if (movement.quantity > 0) {
            // Positive adjustment — update AVCO
            const newUnitCost = calculateAVCO(
              level.quantityOnHand,
              level.unitCost,
              movement.quantity,
              movement.unitCost,
            );
            levels[levelIdx] = {
              ...level,
              quantityOnHand: newQty,
              unitCost: newUnitCost,
            };
          } else {
            // Negative adjustment — use current AVCO
            levels[levelIdx] = {
              ...level,
              quantityOnHand: newQty,
            };
          }
        }
        break;
      }
    }

    // Update stock levels store
    stockLevelsStore.set(tenantId, levels);

    // Mark movement as posted
    const updatedMovement: StockMovement = {
      ...movement,
      status: 'POSTED',
    };
    movements[idx] = updatedMovement;
    movementsStore.set(tenantId, movements);

    return deepClone(updatedMovement);
  }

  async cancelStockMovement(tenantId: string, movementId: string): Promise<StockMovement> {
    const movements = movementsStore.get(tenantId) ?? [];
    const idx = movements.findIndex(m => m.id === movementId);
    if (idx === -1) throw new Error('Stock movement not found');

    const movement = movements[idx];
    if (movement.status === 'POSTED') throw new Error('Cannot cancel a posted movement');
    if (movement.status === 'CANCELLED') throw new Error('Movement is already cancelled');

    const updatedMovement: StockMovement = {
      ...movement,
      status: 'CANCELLED',
    };
    movements[idx] = updatedMovement;
    movementsStore.set(tenantId, movements);

    return deepClone(updatedMovement);
  }

  /* ─── Batch Queries ─────────────────────────────────────── */

  async getBatches(tenantId: string, productId: string): Promise<ItemBatch[]> {
    const batches = batchesStore.get(tenantId) ?? [];
    return deepClone(batches.filter(b => b.productId === productId));
  }

  /* ─── Serial Queries ────────────────────────────────────── */

  async getSerials(tenantId: string, productId: string): Promise<ItemSerial[]> {
    const serials = serialsStore.get(tenantId) ?? [];
    return deepClone(serials.filter(s => s.productId === productId));
  }
}
