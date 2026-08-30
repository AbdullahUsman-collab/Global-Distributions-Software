/**
 * Purchase Return Service (PRV)
 * Orchestrates purchase return bill creation, posting, and inventory effect.
 *
 * Source of Truth:
 *   - audit/11_PURCHASE_ENGINE.md (PRV accounting: DR Supplier AP, CR Inventory + Tax Input)
 *   - audit/12_RETURNS_REVERSALS.md (PRV overview)
 *   - audit/24_TRANSACTION_DEPENDENCIES.md (PRV dependency map)
 *   - audit/16_CALCULATIONS.md (Tax formulas)
 *
 * Accounting (PRV posting):
 *   DEBIT: Supplier AP — Net Amount
 *   CREDIT: Inventory (11301) — Base Amount
 *   CREDIT: Sales Tax Input (11401) — GST + Further Tax
 *   CREDIT: FED Input (11403) — FED Amount
 *   CREDIT: Advance Income Tax (11402) — Advance Tax
 *
 * Inventory effect:
 *   Stock DECREASED by returned quantity (RETURN movement, reverse of GRN)
 */

import { VoucherHeader, CreateVoucherDTO, VoucherType } from '../types/voucher';
import { StockMovement, calculateBillLineTax, BillLineTaxInput } from '../types/inventory';
import { Supplier } from '../types/supplier';
import { IVoucherRepository } from '../repositories/IVoucherRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { ISupplierRepository } from '../repositories/ISupplierRepository';
import { SystemRoleName } from '../types/rbac';
import { requirePermission, Permissions } from './AuthorizationService';

/* ─── Constants ────────────────────────────────────────────── */

const ACCOUNT_CODES = {
  /** Inventory — General Inventory */
  INVENTORY: '11301',
  /** Tax Input — Sales Tax Input (GST + Further Tax combined) */
  SALES_TAX_INPUT: '11401',
  /** FED Input — Federal Excise Duty on purchases */
  FED_INPUT: '11403',
  /** Advance Income Tax — Advance Tax on purchases */
  ADVANCE_TAX_INPUT: '11402',
} as const;

/* ─── DTOs ─────────────────────────────────────────────────── */

/** A single line item in a purchase return bill */
export interface PurchaseReturnLine {
  /** Product reference */
  productId: string;
  /** Quantity in cartons */
  cartons: number;
  /** Quantity in pieces */
  packs: number;
  /** Purchase rate per piece */
  rate: number;
  /** Trade discount percentage */
  tradeDiscountPercent: number;
  /** GST percentage */
  gstPercent: number;
  /** Further Tax percentage */
  furtherTaxPercent: number;
  /** FED percentage */
  fedPercent: number;
  /** Advance Tax percentage */
  advanceTaxPercent: number;
  /** Line description/narration */
  description?: string;
}

/** Payload for creating a new purchase return bill */
export interface CreatePurchaseReturnDTO {
  /** Supplier reference */
  supplierId: string;
  /** Bill date */
  date: string;
  /** Warehouse for stock return */
  warehouseId: string;
  /** Bill narration/description */
  narration?: string;
  /** Bill lines */
  lines: PurchaseReturnLine[];
}

/* ─── Result Types ─────────────────────────────────────────── */

/** Tax breakdown for a single line */
export interface PurchaseReturnLineTaxDetail {
  amount: number;
  discountAmount: number;
  toAmount: number;
  gstAmount: number;
  furtherTaxAmount: number;
  fedAmount: number;
  advanceTaxAmount: number;
  netAmount: number;
}

/** Complete purchase return bill calculation result */
export interface PurchaseReturnBillCalculation {
  lines: PurchaseReturnLineTaxDetail[];
  totalCartons: number;
  totalPacks: number;
  totalAmount: number;
  totalDiscount: number;
  totalToAmount: number;
  totalGst: number;
  totalFurtherTax: number;
  totalFed: number;
  totalAdvanceTax: number;
  totalNetAmount: number;
}

/* ─── Service ──────────────────────────────────────────────── */

export class PurchaseReturnService {
  constructor(
    private voucherRepo: IVoucherRepository,
    private inventoryRepo: IInventoryRepository,
    private supplierRepo: ISupplierRepository,
  ) {}

  /* ─── Calculation (pure, no side effects) ─────────────────── */

  /**
   * Calculate tax breakdown for a single purchase return line.
   * Reuses the same calculateBillLineTax formula as purchases.
   */
  calculateLineTax(line: PurchaseReturnLine, pcsPerCarton: number): PurchaseReturnLineTaxDetail {
    const totalPacks = line.packs;

    const input: BillLineTaxInput = {
      quantity: totalPacks,
      rate: line.rate,
      tradeDiscountPercent: line.tradeDiscountPercent,
      gstPercent: line.gstPercent,
      furtherTaxPercent: line.furtherTaxPercent,
      fedPercent: line.fedPercent,
      advanceTaxPercent: line.advanceTaxPercent,
    };

    return calculateBillLineTax(input);
  }

  /**
   * Calculate complete bill totals for a purchase return.
   */
  async calculateBill(tenantId: string, lines: PurchaseReturnLine[]): Promise<PurchaseReturnBillCalculation> {
    const products = await this.inventoryRepo.getProducts(tenantId);
    const productMap = new Map(products.map(p => [p.id, p]));

    const lineDetails: PurchaseReturnLineTaxDetail[] = [];
    let totalCartons = 0;
    let totalPacks = 0;

    for (const line of lines) {
      const product = productMap.get(line.productId);
      const pcsPerCarton = product?.pcsPerCarton ?? 1;

      const detail = this.calculateLineTax(line, pcsPerCarton);
      lineDetails.push(detail);

      totalCartons += line.cartons;
      totalPacks += line.packs;
    }

    const totalAmount = lineDetails.reduce((s, l) => s + l.amount, 0);
    const totalDiscount = lineDetails.reduce((s, l) => s + l.discountAmount, 0);
    const totalToAmount = lineDetails.reduce((s, l) => s + l.toAmount, 0);
    const totalGst = lineDetails.reduce((s, l) => s + l.gstAmount, 0);
    const totalFurtherTax = lineDetails.reduce((s, l) => s + l.furtherTaxAmount, 0);
    const totalFed = lineDetails.reduce((s, l) => s + l.fedAmount, 0);
    const totalAdvanceTax = lineDetails.reduce((s, l) => s + l.advanceTaxAmount, 0);
    const totalNetAmount = lineDetails.reduce((s, l) => s + l.netAmount, 0);

    return {
      lines: lineDetails,
      totalCartons,
      totalPacks,
      totalAmount,
      totalDiscount,
      totalToAmount,
      totalGst,
      totalFurtherTax,
      totalFed,
      totalAdvanceTax,
      totalNetAmount,
    };
  }

  /* ─── Bill Creation ───────────────────────────────────────── */

  /**
   * Create a new purchase return bill as a DRAFT voucher of type PRV.
   *
   * Accounting (audit/11, audit/12):
   *   DEBIT: Supplier AP — Net Amount
   *   CREDIT: Inventory (11301) — Base Amount
   *   CREDIT: Sales Tax Input (11401) — GST + Further Tax
   *   CREDIT: FED Input (11403) — FED Amount
   *   CREDIT: Advance Income Tax (11402) — Advance Tax
   */
  async createPurchaseReturn(
    tenantId: string,
    dto: CreatePurchaseReturnDTO,
    createdBy: string,
    role: SystemRoleName = 'ADMIN',
  ): Promise<VoucherHeader> {
    requirePermission(role, Permissions.RETURNS_CREATE);
    // Validate supplier exists
    const supplier = await this.supplierRepo.getById(dto.supplierId, tenantId);
    if (!supplier) throw new Error('Supplier not found');
    if (!supplier.isActive) throw new Error('Supplier is inactive');

    // Validate products exist
    const products = await this.inventoryRepo.getProducts(tenantId);
    const productMap = new Map(products.map(p => [p.id, p]));

    for (const line of dto.lines) {
      const product = productMap.get(line.productId);
      if (!product) throw new Error(`Product not found: ${line.productId}`);
      if (!product.isActive) throw new Error(`Product is inactive: ${product.name}`);
    }

    // Calculate bill for validation
    const calculation = await this.calculateBill(tenantId, dto.lines);

    // Create balanced GL entries.
    // DEBIT: Supplier AP — per-product lines with bill metadata
    // CREDIT: Inventory (base amount) + Tax Input (GST + Further Tax + FED + Advance Tax)
    const balancedLines: CreateVoucherDTO['lines'] = [
      // DEBIT: Supplier AP — per-product lines (mirrors Customer AR pattern)
      ...dto.lines.map((line, idx) => {
        const detail = calculation.lines[idx];
        const product = productMap.get(line.productId)!;
        return {
          accountId: supplier.accountHeadId,
          description: `Return: ${product.name} × ${line.packs} @ ${line.rate}`,
          debit: detail.netAmount,
          credit: 0,
          quantity: line.packs,
          productId: line.productId,
          branch: dto.warehouseId,
          stRate: line.gstPercent,
          stAmount: detail.gstAmount,
          amtExclStd: detail.toAmount,
        };
      }),
      // CREDIT: Inventory — Base Amount (To.Amt)
      {
        accountId: ACCOUNT_CODES.INVENTORY,
        description: 'Purchase return — base cost',
        debit: 0,
        credit: calculation.totalToAmount,
      },
      // CREDIT: Sales Tax Input — GST + Further Tax
      ...(calculation.totalGst + calculation.totalFurtherTax > 0 ? [{
        accountId: ACCOUNT_CODES.SALES_TAX_INPUT,
        description: 'Input tax reversed on purchase return (GST + Further Tax)',
        debit: 0,
        credit: calculation.totalGst + calculation.totalFurtherTax,
      }] : []),
      // CREDIT: FED Input — Federal Excise Duty
      ...(calculation.totalFed > 0 ? [{
        accountId: ACCOUNT_CODES.FED_INPUT,
        description: 'FED reversed on purchase return',
        debit: 0,
        credit: calculation.totalFed,
      }] : []),
      // CREDIT: Advance Income Tax — Advance Tax
      ...(calculation.totalAdvanceTax > 0 ? [{
        accountId: ACCOUNT_CODES.ADVANCE_TAX_INPUT,
        description: 'Advance tax reversed on purchase return',
        debit: 0,
        credit: calculation.totalAdvanceTax,
      }] : []),
    ];

    const voucher = await this.voucherRepo.createVoucher(
      tenantId,
      {
        voucherType: 'PRV' as VoucherType,
        date: dto.date,
        narration: dto.narration ?? `Purchase return to ${supplier.name}`,
        lines: balancedLines,
      },
      createdBy,
    );

    return voucher;
  }

  /* ─── Bill Posting ────────────────────────────────────────── */

  /**
   * Post a purchase return bill (PRV voucher).
   *
   * Effects:
   * 1. Voucher posted → LedgerEntry records created
   * 2. Stock RETURN movement created and posted for each line (decreases stock)
   */
  async postPurchaseReturn(tenantId: string, voucherId: string, role: SystemRoleName = 'ADMIN'): Promise<VoucherHeader> {
    requirePermission(role, Permissions.RETURNS_POST);
    // Post the voucher (generates LedgerEntry records)
    const postedVoucher = await this.voucherRepo.postVoucher(tenantId, voucherId);

    // Get the voucher lines to extract product/quantity data
    const voucherLines = await this.voucherRepo.getVoucherLines(tenantId, voucherId);

    // Create stock ISSUE movements for lines with product references
    // Purchase return = goods leaving our warehouse back to supplier = stock decrease
    for (const line of voucherLines) {
      if (line.productId && line.quantity && line.quantity > 0) {
        // Get stock levels to find the source warehouse
        const stockLevels = await this.inventoryRepo.getStockLevels(tenantId);
        const productLevels = stockLevels.filter(sl => sl.productId === line.productId);

        // Use the warehouse from the line, or first available
        const sourceLevel = productLevels.find(sl => sl.warehouseId === line.branch)
          ?? productLevels[0];

        if (sourceLevel) {
          // Create ISSUE movement (removes from stock, goods returning to supplier)
          const movement: Omit<StockMovement, 'id' | 'createdAt'> = {
            tenantId,
            movementType: 'ISSUE',
            movementDate: postedVoucher.date,
            referenceType: 'Voucher',
            referenceId: voucherId,
            fromWarehouseId: sourceLevel.warehouseId,
            productId: line.productId,
            quantity: line.quantity,
            unitCost: sourceLevel.unitCost,
            totalCost: line.quantity * sourceLevel.unitCost,
            narration: `Purchase return to supplier: ${line.description}`,
            status: 'DRAFT',
            createdBy: postedVoucher.createdBy,
          };

          const createdMovement = await this.inventoryRepo.createStockMovement(tenantId, movement);
          await this.inventoryRepo.postStockMovement(tenantId, createdMovement.id);
        }
      }
    }

    return postedVoucher;
  }

  /* ─── Queries ─────────────────────────────────────────────── */

  /**
   * Get all purchase return vouchers (PRV type) for a tenant.
   */
  async getPurchaseReturns(tenantId: string): Promise<VoucherHeader[]> {
    return this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'PRV' });
  }

  /**
   * Get a single purchase return bill by id.
   */
  async getPurchaseReturnById(tenantId: string, id: string): Promise<VoucherHeader | null> {
    return this.voucherRepo.getVoucherById(tenantId, id);
  }

  /**
   * Delete a DRAFT purchase return bill.
   */
  async deletePurchaseReturn(tenantId: string, id: string, role: SystemRoleName = 'ADMIN'): Promise<void> {
    requirePermission(role, Permissions.RETURNS_DELETE);
    const voucher = await this.voucherRepo.getVoucherById(tenantId, id);
    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status === 'POSTED') throw new Error('Cannot delete a posted voucher');
    return this.voucherRepo.deleteVoucher(tenantId, id);
  }
}
