/**
 * Domain Types Index
 * Exports all domain types for use across the application.
 */

export * from './tenant';
export * from './auth';
export * from './rbac';
export * from './settings';
export * from './coa';
export * from './voucher';
// Re-export specific items from inventory to avoid conflicts with settings
export {
  StockMovementType,
  StockMovementStatus,
  ItemSerialStatus,
  STOCK_MOVEMENT_TYPE_LABELS,
  STOCK_MOVEMENT_STATUS_LABELS,
  Product,
  Warehouse,
  WarehouseLocation,
  StockLevel,
  StockMovement,
  ItemBatch,
  ItemSerial,
  CreateProductDTO,
  UpdateProductDTO,
  BillLineTaxInput,
  BillLineTaxResult,
  calculateStockValue,
  calculateAVCO,
  calculateCOGS,
  calculateGrossProfit,
  calculateBillLineTax,
} from './inventory';
export * from './reports';
export * from './customer';
