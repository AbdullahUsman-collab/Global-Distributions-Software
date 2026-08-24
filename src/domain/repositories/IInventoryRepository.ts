/**
 * Inventory Repository Interface
 * Defines the contract for inventory and stock persistence.
 *
 * IMPLEMENTATION NOTE: UI layer MUST depend on this interface only.
 * Concrete adapters (mock or real) are injected at runtime.
 */

import {
  Product,
  Warehouse,
  WarehouseLocation,
  StockLevel,
  StockMovement,
  ItemBatch,
  ItemSerial,
  CreateProductDTO,
  UpdateProductDTO,
} from '../types/inventory';

export interface IInventoryRepository {

  /* ─── Product Queries ───────────────────────────────────── */

  /** Get all products for a tenant */
  getProducts(tenantId: string): Promise<Product[]>;

  /** Get a single product by its unique id */
  getProductById(tenantId: string, id: string): Promise<Product | null>;

  /** Create a new product */
  createProduct(tenantId: string, dto: CreateProductDTO): Promise<Product>;

  /** Update an existing product */
  updateProduct(tenantId: string, id: string, dto: UpdateProductDTO): Promise<Product>;

  /** Soft-deactivate a product (set isActive = false) */
  deactivateProduct(tenantId: string, id: string): Promise<void>;

  /* ─── Warehouse Queries ─────────────────────────────────── */

  /** Get all warehouses for a tenant */
  getWarehouses(tenantId: string): Promise<Warehouse[]>;

  /** Get all locations within a warehouse */
  getWarehouseLocations(tenantId: string, warehouseId: string): Promise<WarehouseLocation[]>;

  /* ─── Stock Level Queries ───────────────────────────────── */

  /** Get stock levels, optionally filtered by warehouse */
  getStockLevels(tenantId: string, warehouseId?: string): Promise<StockLevel[]>;

  /** Get stock level for a specific product in a specific warehouse */
  getStockLevelForProduct(
    tenantId: string,
    productId: string,
    warehouseId: string,
  ): Promise<StockLevel | null>;

  /* ─── Stock Movement Queries ────────────────────────────── */

  /** Get all stock movements, optionally filtered by product */
  getStockMovements(tenantId: string, productId?: string): Promise<StockMovement[]>;

  /** Get a single stock movement by its unique id */
  getStockMovementById(tenantId: string, id: string): Promise<StockMovement | null>;

  /* ─── Stock Movement Mutations ──────────────────────────── */

  /** Create a new stock movement in DRAFT status */
  createStockMovement(
    tenantId: string,
    movement: Omit<StockMovement, 'id' | 'createdAt'>,
  ): Promise<StockMovement>;

  /** Post a DRAFT stock movement — updates stock levels using AVCO */
  postStockMovement(tenantId: string, movementId: string): Promise<StockMovement>;

  /** Cancel a DRAFT stock movement */
  cancelStockMovement(tenantId: string, movementId: string): Promise<StockMovement>;

  /* ─── Batch Queries ─────────────────────────────────────── */

  /** Get all batches for a product */
  getBatches(tenantId: string, productId: string): Promise<ItemBatch[]>;

  /* ─── Serial Queries ────────────────────────────────────── */

  /** Get all serials for a product */
  getSerials(tenantId: string, productId: string): Promise<ItemSerial[]>;
}
