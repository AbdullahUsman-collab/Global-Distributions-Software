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
 *   Min_Qty, Cost_rate, hs_code, gst_type, gst, fed,
 *   adv_tax_purchase, adv_tax_sale
 *
 * CRITICAL: Legacy has SEPARATE adv_tax_purchase and adv_tax_sale fields
 * (audit/15_TAX_DISCOUNT.md, audit/23_DATA_MODEL.md).
 * These must NOT be merged into a single advanceTaxPercent.
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
  /** Advance income tax on SALES percentage (maps to adv_tax_sale in legacy) */
  advanceTaxSalePercent: number;
  /** Advance income tax on PURCHASES percentage (maps to adv_tax_purchase in legacy) */
  advanceTaxPurchasePercent: number;
  /** Active status toggle */
  isActive: boolean;
}

/**
 * DTO for creating a new Product.
 * Derived fields (id, tenantId) are set by the adapter.
 *
 * CRITICAL: Legacy has SEPARATE adv_tax_purchase and adv_tax_sale fields.
 * advanceTaxSalePercent and advanceTaxPurchasePercent are distinct.
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
  advanceTaxSalePercent?: number;
  advanceTaxPurchasePercent?: number;
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
  advanceTaxSalePercent?: number;
  advanceTaxPurchasePercent?: number;
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
 * Source: audit/16_CALCULATIONS.md #24
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

/**
 * Calculate COGS (Cost of Goods Sold).
 * Source: audit/16_CALCULATIONS.md #22
 * Formula: COGS = Quantity_Sold x Cost_Rate
 */
export function calculateCOGS(quantitySold: number, costRate: number): number {
  return quantitySold * costRate;
}

/**
 * Calculate Gross Profit.
 * Source: audit/16_CALCULATIONS.md #23
 * Formula: Profit = Sale_Amount - COGS
 */
export function calculateGrossProfit(saleAmount: number, cogs: number): number {
  return saleAmount - cogs;
}

/* ─── Bill-Line Tax Calculations ───────────────────────────── */

/**
 * Verified bill-line tax calculation inputs.
 * Source: audit/15_TAX_DISCOUNT.md, audit/16_CALCULATIONS.md
 */
export interface BillLineTaxInput {
  quantity: number;
  rate: number;
  tradeDiscountPercent: number;
  gstPercent: number;
  furtherTaxPercent: number;
  fedPercent: number;
  advanceTaxPercent: number;
}

/**
 * Verified bill-line tax calculation result.
 * Source: audit/16_CALCULATIONS.md #1-9
 */
export interface BillLineTaxResult {
  /** Base amount = Quantity x Rate */
  amount: number;
  /** Trade discount amount = Amount x (Trade_Disc / 100) */
  discountAmount: number;
  /** Amount after discount = Amount - Discount */
  toAmount: number;
  /** GST = To_Amt x (ST% / 100) */
  gstAmount: number;
  /** Further Tax = To_Amt x (F-ST% / 100) */
  furtherTaxAmount: number;
  /** FED = To_Amt x (FED% / 100) */
  fedAmount: number;
  /** Advance Tax = To_Amt x (ADV% / 100) */
  advanceTaxAmount: number;
  /** Net = To_Amt + GST + F.Tax + FED + ADV_Tax */
  netAmount: number;
}

/**
 * Calculate complete bill-line tax breakdown.
 * Source: audit/16_CALCULATIONS.md #1-9
 *
 * Formulas verified against audit/15_TAX_DISCOUNT.md:
 *   Amount = Qty × Rate
 *   Disc = Amount × (Trade_Disc% / 100)
 *   To_Amt = Amount - Disc
 *   GST = To_Amt × (ST% / 100)
 *   F.Tax = To_Amt × (F-ST% / 100)
 *   FED = To_Amt × (FED% / 100)
 *   ADV_Tax = To_Amt × (ADV% / 100)
 *   Net = To_Amt + GST + F.Tax + FED + ADV_Tax
 */
export function calculateBillLineTax(input: BillLineTaxInput): BillLineTaxResult {
  const amount = input.quantity * input.rate;
  const discountAmount = amount * (input.tradeDiscountPercent / 100);
  const toAmount = amount - discountAmount;
  const gstAmount = toAmount * (input.gstPercent / 100);
  const furtherTaxAmount = toAmount * (input.furtherTaxPercent / 100);
  const fedAmount = toAmount * (input.fedPercent / 100);
  const advanceTaxAmount = toAmount * (input.advanceTaxPercent / 100);
  const netAmount = toAmount + gstAmount + furtherTaxAmount + fedAmount + advanceTaxAmount;

  return {
    amount,
    discountAmount,
    toAmount,
    gstAmount,
    furtherTaxAmount,
    fedAmount,
    advanceTaxAmount,
    netAmount,
  };
}
