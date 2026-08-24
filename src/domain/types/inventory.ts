/**
 * Inventory Domain Types
 * Defines product, warehouse, stock level, and stock movement types.
 *
 * Source of Truth:
 *   - audit/23_DATA_MODEL.md (Items table, Bill_Lines)
 *   - audit/03_MASTER_DATA.md (Item hierarchy, Cost_rate)
 *   - audit/16_CALCULATIONS.md (Stock calculations, AVCO)
 */

import { GstType } from './settings';

/* ─── Re-exports ───────────────────────────────────────────── */
export type { GstType } from './settings';

/* ─── Enums ────────────────────────────────────────────────── */

/**
 * Stock movement types.
 * Source: audit/23_DATA_MODEL.md (Voucher_Type SV/PV/SRV/PRV)
 * Mapped to inventory movement semantics.
 */
export type StockMovementType = 'GRN' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN';

/**
 * Stock movement status.
 * Matches voucher DRAFT/POSTED pattern from audit/04_ACCOUNTING_ENGINE.md.
 */
export type StockMovementStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

/**
 * Item serial status.
 */
export type ItemSerialStatus = 'AVAILABLE' | 'ISSUED' | 'IN_TRANSIT';

/* ─── Display Labels ───────────────────────────────────────── */

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  GRN:        'Goods Received Note',
  ISSUE:      'Goods Issue',
  TRANSFER:   'Stock Transfer',
  ADJUSTMENT: 'Stock Adjustment',
  RETURN:     'Stock Return',
};

export const STOCK_MOVEMENT_STATUS_LABELS: Record<StockMovementStatus, string> = {
  DRAFT:     'Draft',
  POSTED:    'Posted',
  CANCELLED: 'Cancelled',
};

/**
 * Product entity.
 * Source: audit/23_DATA_MODEL.md (Items table)
 * Maps legacy fields: Item_No, Item_MainHeadNo, Units, Pcs_PerCtn,
 *   Sale_Rate, Purchase_Rate, Retail_Price, Trade_Disc, TO,
 *   Min_Qty, Cost_rate, hs_code, gst_type, gst, fed, adv_tax
 */
export interface Product {
  /** Unique identifier (UUID) */
  id: string;
  /** Tenant scoping key */
  tenantId: string;
  /** Stock Keeping Unit (maps to Item_No in legacy) */
  sku: string;
  /** Product name (maps to Item_Name in legacy) */
  name: string;
  /** Category (maps to Item_MainHeadName in legacy) */
  category: string;
  /** Unit of measure (maps to Units in legacy) */
  unit: string;
  /** Pieces per carton (maps to Pcs_PerCtn in legacy) */
  pcsPerCarton: number;
  /** Selling price (maps to Sale_Rate in legacy) */
  saleRate: number;
  /** Purchase/cost price (maps to Purchase_Rate in legacy) */
  purchaseRate: number;
  /** Retail price / MRP (maps to Retail_Price in legacy) */
  retailPrice: number;
  /** Trade discount percentage (maps to Trade_Disc in legacy) */
  tradeDiscount: number;
  /** Trade offer / deal (maps to TO in legacy) */
  tradeOffer: string;
  /** Minimum stock quantity (maps to Min_Qty in legacy) */
  minQuantity: number;
  /** HS Code for customs classification (maps to hs_code in legacy) */
  hsCode: string;
  /** GST type classification (maps to gst_type in legacy) */
  gstType: GstType;
  /** GST percentage (maps to gst in legacy) */
  gstPercent: number;
  /** Federal Excise Duty percentage (maps to fed in legacy) */
  fedPercent: number;
  /** Advance income tax percentage (maps to adv_tax in legacy) */
  advanceTaxPercent: number;
  /** Active status toggle */
  isActive: boolean;
}

/**
 * DTO for creating a new Product.
 * Derived fields (id, tenantId) are set by the adapter.
 */
export interface CreateProductDTO {
  sku: string;
  name: string;
  category: string;
  unit: string;
  pcsPerCarton: number;
  saleRate: number;
  purchaseRate: number;
  retailPrice: number;
  tradeDiscount?: number;
  tradeOffer?: string;
  minQuantity?: number;
  hsCode?: string;
  gstType?: GstType;
  gstPercent?: number;
  fedPercent?: number;
  advanceTaxPercent?: number;
  isActive?: boolean;
}

/**
 * DTO for updating a Product.
 */
export interface UpdateProductDTO {
  name?: string;
  category?: string;
  unit?: string;
  pcsPerCarton?: number;
  saleRate?: number;
  purchaseRate?: number;
  retailPrice?: number;
  tradeDiscount?: number;
  tradeOffer?: string;
  minQuantity?: number;
  hsCode?: string;
  gstType?: GstType;
  gstPercent?: number;
  fedPercent?: number;
  advanceTaxPercent?: number;
  isActive?: boolean;
}

/**
 * Warehouse entity.
 * Source: audit/03_MASTER_DATA.md — "Warehouses/Locations — No warehouse selection observed in forms."
 * INFERRED: Single-warehouse system in legacy. New ERP supports multi-warehouse.
 */
export interface Warehouse {
  /** Unique identifier (UUID) */
  id: string;
  /** Tenant scoping key */
  tenantId: string;
  /** Warehouse code (e.g., WH-01) */
  code: string;
  /** Warehouse name */
  name: string;
  /** Active status toggle */
  isActive: boolean;
}

/**
 * Warehouse location entity.
 * Source: audit/03_MASTER_DATA.md — "No warehouse selection observed in forms."
 * INFERRED: New ERP adds location/bin tracking.
 */
export interface WarehouseLocation {
  /** Unique identifier (UUID) */
  id: string;
  /** Tenant scoping key */
  tenantId: string;
  /** Parent warehouse reference */
  warehouseId: string;
  /** Location code */
  code: string;
  /** Location name */
  name: string;
  /** Rack identifier */
  rack?: string;
  /** Shelf identifier */
  shelf?: string;
  /** Bin identifier */
  bin?: string;
}

/**
 * Stock level entity.
 * Source: audit/16_CALCULATIONS.md (Stock calculations #20-21)
 * Formula: Stock = Opening + Purchases + Sale_Returns - Sales - Purchase_Returns
 * Formula: Value = Quantity x Cost_Rate
 */
export interface StockLevel {
  /** Unique identifier (UUID) */
  id: string;
  /** Tenant scoping key */
  tenantId: string;
  /** Product reference */
  productId: string;
  /** Warehouse reference */
  warehouseId: string;
  /** Optional location reference */
  locationId?: string;
  /** Quantity on hand (physical stock) */
  quantityOnHand: number;
  /** Quantity reserved for orders */
  quantityReserved: number;
  /** AVCO (Average Cost) unit cost basis */
  unitCost: number;
  /** Reorder level threshold */
  reorderLevel?: number;
  /** Minimum stock level */
  minimumStock?: number;
  /** Maximum stock level */
  maximumStock?: number;
  /** Last physical count date */
  lastCountDate?: string;
}

/**
 * Stock movement entity.
 * Source: audit/23_DATA_MODEL.md (Vouchers, Bills tables)
 * Movement types map to voucher/bill types:
 *   GRN → Purchase Voucher (PV)
 *   ISSUE → Sale Voucher (SV)
 *   TRANSFER → Journal Voucher (JV) between warehouses
 *   ADJUSTMENT → Journal Voucher (JV) for stock corrections
 *   RETURN → Sale Return (SRV) / Purchase Return (PRV)
 */
export interface StockMovement {
  /** Unique identifier (UUID) */
  id: string;
  /** Tenant scoping key */
  tenantId: string;
  /** Movement type classification */
  movementType: StockMovementType;
  /** Movement date */
  movementDate: string;
  /** Reference document type (e.g., 'Voucher', 'Bill') */
  referenceType?: string;
  /** Reference document ID */
  referenceId?: string;
  /** Source warehouse (for transfers/issues) */
  fromWarehouseId?: string;
  /** Destination warehouse (for transfers/GRN) */
  toWarehouseId?: string;
  /** Product reference */
  productId: string;
  /** Quantity moved */
  quantity: number;
  /** Unit cost at time of movement */
  unitCost: number;
  /** Total cost (quantity x unitCost) */
  totalCost: number;
  /** Narration/description */
  narration?: string;
  /** Movement status */
  status: StockMovementStatus;
  /** Creation timestamp */
  createdAt: string;
  /** Created by user */
  createdBy: string;
}

/**
 * Item batch entity.
 * Source: audit/03_MASTER_DATA.md — "Batches/Lots — No batch or lot tracking observed."
 * INFERRED: New ERP adds optional batch tracking.
 */
export interface ItemBatch {
  /** Unique identifier (UUID) */
  id: string;
  /** Tenant scoping key */
  tenantId: string;
  /** Product reference */
  productId: string;
  /** Batch number */
  batchNumber: string;
  /** Expiry date (optional) */
  expiryDate?: string;
  /** Manufacturing date (optional) */
  manufacturingDate?: string;
  /** Quantity on hand for this batch */
  quantityOnHand: number;
}

/**
 * Item serial entity.
 * Source: audit/03_MASTER_DATA.md — No serial tracking observed.
 * INFERRED: New ERP adds optional serial tracking.
 */
export interface ItemSerial {
  /** Unique identifier (UUID) */
  id: string;
  /** Tenant scoping key */
  tenantId: string;
  /** Product reference */
  productId: string;
  /** Serial number */
  serialNumber: string;
  /** Current status */
  status: ItemSerialStatus;
  /** Current warehouse location */
  warehouseId: string;
}

/* ─── Computed Helpers ─────────────────────────────────────── */

/**
 * Calculate stock value.
 * Source: audit/16_CALCULATIONS.md #21
 * Formula: Value = Quantity x Cost_Rate
 */
export function calculateStockValue(quantity: number, unitCost: number): number {
  return quantity * unitCost;
}

/**
 * Calculate AVCO (Average Cost) for incoming stock.
 * Source: audit/16_CALCULATIONS.md #24 — "Likely calculated as weighted average or moving average cost"
 * Formula: New Cost = (Current Qty x Current Cost + Incoming Qty x Incoming Cost) / (Current Qty + Incoming Qty)
 */
export function calculateAVCO(
  currentQty: number,
  currentCost: number,
  incomingQty: number,
  incomingCost: number,
): number {
  const totalQty = currentQty + incomingQty;
  if (totalQty === 0) return 0;
  return (currentQty * currentCost + incomingQty * incomingCost) / totalQty;
}
