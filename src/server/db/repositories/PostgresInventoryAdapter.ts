/**
 * PostgreSQL Inventory Adapter
 * Persistent inventory storage.
 *
 * RULE: Persistence ONLY — no business logic, no authorization.
 * RULE: All queries are scoped by tenantId.
 */

import { randomBytes } from 'crypto';
import { Product, Warehouse, WarehouseLocation, StockLevel, StockMovement, ItemBatch, ItemSerial, CreateProductDTO, UpdateProductDTO } from '../../../domain/types/inventory';
import { IInventoryRepository } from '../../../domain/repositories/IInventoryRepository';
import { query } from '../pool.js';

function uuid(): string { return randomBytes(16).toString('hex'); }

/**
 * PostgreSQL implementation of IInventoryRepository.
 */
export class PostgresInventoryAdapter implements IInventoryRepository {

  async getProducts(tenantId: string): Promise<Product[]> {
    const result = await query(
      `SELECT id, tenant_id, sku, name, category, unit, pcs_per_carton,
              sale_rate, purchase_rate, retail_price, trade_discount, trade_offer,
              min_quantity, hs_code, gst_type, gst_percent, fed_percent,
              advance_tax_sale_percent, advance_tax_purchase_percent, is_active
       FROM products WHERE tenant_id = $1 ORDER BY sku`,
      [tenantId]
    );
    return result.rows.map(r => ({
      id: r.id, tenantId: r.tenant_id, sku: r.sku, name: r.name,
      category: r.category || '', unit: r.unit || 'PCS', pcsPerCarton: r.pcs_per_carton || 1,
      saleRate: Number(r.sale_rate), purchaseRate: Number(r.purchase_rate),
      retailPrice: Number(r.retail_price), tradeDiscount: Number(r.trade_discount),
      tradeOffer: r.trade_offer || '', minQuantity: Number(r.min_quantity),
      hsCode: r.hs_code || '', gstType: r.gst_type || 'VAT',
      gstPercent: Number(r.gst_percent), fedPercent: Number(r.fed_percent),
      advanceTaxSalePercent: Number(r.advance_tax_sale_percent),
      advanceTaxPurchasePercent: Number(r.advance_tax_purchase_percent),
      isActive: r.is_active,
    }));
  }

  async getProductById(tenantId: string, id: string): Promise<Product | null> {
    const result = await query(
      `SELECT id, tenant_id, sku, name, category, unit, pcs_per_carton,
              sale_rate, purchase_rate, retail_price, trade_discount, trade_offer,
              min_quantity, hs_code, gst_type, gst_percent, fed_percent,
              advance_tax_sale_percent, advance_tax_purchase_percent, is_active
       FROM products WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      id: r.id, tenantId: r.tenant_id, sku: r.sku, name: r.name,
      category: r.category || '', unit: r.unit || 'PCS', pcsPerCarton: r.pcs_per_carton || 1,
      saleRate: Number(r.sale_rate), purchaseRate: Number(r.purchase_rate),
      retailPrice: Number(r.retail_price), tradeDiscount: Number(r.trade_discount),
      tradeOffer: r.trade_offer || '', minQuantity: Number(r.min_quantity),
      hsCode: r.hs_code || '', gstType: r.gst_type || 'VAT',
      gstPercent: Number(r.gst_percent), fedPercent: Number(r.fed_percent),
      advanceTaxSalePercent: Number(r.advance_tax_sale_percent),
      advanceTaxPurchasePercent: Number(r.advance_tax_purchase_percent),
      isActive: r.is_active,
    };
  }

  async createProduct(tenantId: string, dto: CreateProductDTO): Promise<Product> {
    const id = uuid();
    const result = await query(
      `INSERT INTO products (id, tenant_id, sku, name, category, unit, pcs_per_carton,
         sale_rate, purchase_rate, retail_price, trade_discount, trade_offer,
         min_quantity, hs_code, gst_type, gst_percent, fed_percent,
         advance_tax_sale_percent, advance_tax_purchase_percent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [id, tenantId, dto.sku, dto.name, dto.category, dto.unit || 'PCS', dto.pcsPerCarton || 1,
       dto.saleRate || 0, dto.purchaseRate || 0, dto.retailPrice || 0,
       dto.tradeDiscount || 0, dto.tradeOffer || '', dto.minQuantity || 0,
       dto.hsCode || '', dto.gstType || 'VAT', dto.gstPercent || 0, dto.fedPercent || 0,
       dto.advanceTaxSalePercent || 0, dto.advanceTaxPurchasePercent || 0]
    );
    const r = result.rows[0];
    return {
      id: r.id, tenantId: r.tenant_id, sku: r.sku, name: r.name,
      category: r.category || '', unit: r.unit || 'PCS', pcsPerCarton: r.pcs_per_carton,
      saleRate: Number(r.sale_rate), purchaseRate: Number(r.purchase_rate),
      retailPrice: Number(r.retail_price), tradeDiscount: Number(r.trade_discount),
      tradeOffer: r.trade_offer, minQuantity: Number(r.min_quantity),
      hsCode: r.hs_code, gstType: r.gst_type, gstPercent: Number(r.gst_percent),
      fedPercent: Number(r.fed_percent), advanceTaxSalePercent: Number(r.advance_tax_sale_percent),
      advanceTaxPurchasePercent: Number(r.advance_tax_purchase_percent), isActive: r.is_active,
    };
  }

  async updateProduct(tenantId: string, id: string, dto: UpdateProductDTO): Promise<Product> {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) {
        const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
        sets.push(`${col} = $${idx++}`);
        vals.push(v);
      }
    }
    sets.push('updated_at = NOW()');
    vals.push(tenantId, id);
    const result = await query(
      `UPDATE products SET ${sets.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) throw new Error(`Product not found: ${id}`);
    const r = result.rows[0];
    return {
      id: r.id, tenantId: r.tenant_id, sku: r.sku, name: r.name,
      category: r.category || '', unit: r.unit || 'PCS', pcsPerCarton: r.pcs_per_carton,
      saleRate: Number(r.sale_rate), purchaseRate: Number(r.purchase_rate),
      retailPrice: Number(r.retail_price), tradeDiscount: Number(r.trade_discount),
      tradeOffer: r.trade_offer, minQuantity: Number(r.min_quantity),
      hsCode: r.hs_code, gstType: r.gst_type, gstPercent: Number(r.gst_percent),
      fedPercent: Number(r.fed_percent), advanceTaxSalePercent: Number(r.advance_tax_sale_percent),
      advanceTaxPurchasePercent: Number(r.advance_tax_purchase_percent), isActive: r.is_active,
    };
  }

  async deactivateProduct(tenantId: string, id: string): Promise<void> {
    await query('UPDATE products SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
  }

  async getWarehouses(tenantId: string): Promise<Warehouse[]> {
    const result = await query(
      `SELECT id, tenant_id, code, name, is_active FROM warehouses WHERE tenant_id = $1 ORDER BY code`,
      [tenantId]
    );
    return result.rows.map(r => ({ id: r.id, tenantId: r.tenant_id, code: r.code, name: r.name, isActive: r.is_active }));
  }

  async getWarehouseLocations(tenantId: string, warehouseId: string): Promise<WarehouseLocation[]> {
    const result = await query(
      `SELECT id, tenant_id, warehouse_id, code, name FROM warehouse_locations
       WHERE tenant_id = $1 AND warehouse_id = $2 ORDER BY code`,
      [tenantId, warehouseId]
    );
    return result.rows.map(r => ({ id: r.id, tenantId: r.tenant_id, warehouseId: r.warehouse_id, code: r.code, name: r.name }));
  }

  async getStockLevels(tenantId: string, warehouseId?: string): Promise<StockLevel[]> {
    let sql = `SELECT id, tenant_id, product_id, warehouse_id, quantity_on_hand, quantity_reserved,
               unit_cost, reorder_level, minimum_stock, maximum_stock
               FROM stock_levels WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    if (warehouseId) { sql += ` AND warehouse_id = $2`; params.push(warehouseId); }
    const result = await query(sql, params);
    return result.rows.map(r => ({
      id: r.id, tenantId: r.tenant_id, productId: r.product_id, warehouseId: r.warehouse_id,
      quantityOnHand: Number(r.quantity_on_hand), quantityReserved: Number(r.quantity_reserved),
      unitCost: Number(r.unit_cost), reorderLevel: Number(r.reorder_level),
      minimumStock: Number(r.minimum_stock), maximumStock: Number(r.maximum_stock),
    }));
  }

  async getStockLevelForProduct(tenantId: string, productId: string, warehouseId: string): Promise<StockLevel | null> {
    const result = await query(
      `SELECT id, tenant_id, product_id, warehouse_id, quantity_on_hand, quantity_reserved,
       unit_cost, reorder_level, minimum_stock, maximum_stock
       FROM stock_levels WHERE tenant_id = $1 AND product_id = $2 AND warehouse_id = $3`,
      [tenantId, productId, warehouseId]
    );
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      id: r.id, tenantId: r.tenant_id, productId: r.product_id, warehouseId: r.warehouse_id,
      quantityOnHand: Number(r.quantity_on_hand), quantityReserved: Number(r.quantity_reserved),
      unitCost: Number(r.unit_cost), reorderLevel: Number(r.reorder_level),
      minimumStock: Number(r.minimum_stock), maximumStock: Number(r.maximum_stock),
    };
  }

  async getStockMovements(tenantId: string, productId?: string): Promise<StockMovement[]> {
    let sql = `SELECT id, tenant_id, product_id, warehouse_id, movement_type, status,
               quantity, unit_cost, reference_id, reference_type, narration, created_by, created_at, updated_at
               FROM stock_movements WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    if (productId) { sql += ` AND product_id = $2`; params.push(productId); }
    sql += ` ORDER BY created_at DESC`;
    const result = await query(sql, params);
    return result.rows.map(r => this.mapStockMovementRow(r));
  }

  async getStockMovementById(tenantId: string, id: string): Promise<StockMovement | null> {
    const result = await query(
      `SELECT id, tenant_id, product_id, warehouse_id, movement_type, status,
       quantity, unit_cost, reference_id, reference_type, narration, created_by, created_at, updated_at
       FROM stock_movements WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );
    if (result.rows.length === 0) return null;
    return this.mapStockMovementRow(result.rows[0]);
  }

  async createStockMovement(tenantId: string, movement: Omit<StockMovement, 'id' | 'createdAt'>): Promise<StockMovement> {
    const id = uuid();
    const result = await query(
      `INSERT INTO stock_movements (id, tenant_id, product_id, warehouse_id, movement_type, status,
         quantity, unit_cost, reference_id, reference_type, narration, created_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       RETURNING *`,
      [id, tenantId, movement.productId, movement.warehouseId, movement.movementType,
       movement.status, movement.quantity, movement.unitCost,
       movement.referenceId || null, movement.referenceType || null,
       movement.narration || null, movement.createdBy]
    );
    return this.mapStockMovementRow(result.rows[0]);
  }

  async postStockMovement(tenantId: string, movementId: string): Promise<StockMovement> {
    await query(
      `UPDATE stock_movements SET status = 'POSTED', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
      [tenantId, movementId]
    );
    return (await this.getStockMovementById(tenantId, movementId))!;
  }

  async cancelStockMovement(tenantId: string, movementId: string): Promise<StockMovement> {
    await query(
      `UPDATE stock_movements SET status = 'CANCELLED', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
      [tenantId, movementId]
    );
    return (await this.getStockMovementById(tenantId, movementId))!;
  }

  async getBatches(tenantId: string, productId: string): Promise<ItemBatch[]> {
    return [];
  }

  async getSerials(tenantId: string, productId: string): Promise<ItemSerial[]> {
    return [];
  }

  private mapStockMovementRow(r: any): StockMovement {
    return {
      id: r.id, tenantId: r.tenant_id, productId: r.product_id, warehouseId: r.warehouse_id,
      movementType: r.movement_type, status: r.status, quantity: Number(r.quantity),
      unitCost: Number(r.unit_cost), totalCost: Number(r.quantity) * Number(r.unit_cost),
      referenceId: r.reference_id, referenceType: r.reference_type,
      narration: r.narration, createdBy: r.created_by,
      createdAt: r.created_at?.toISOString?.() || String(r.created_at),
      movementDate: r.created_at?.toISOString?.()?.split('T')[0] || String(r.created_at).split(' ')[0],
    };
  }
}
