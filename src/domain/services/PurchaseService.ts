/**
 * Purchase Service
 * Orchestrates purchase bill creation, posting, and inventory effect.
 *
 * Source of Truth:
 *   - audit/11_PURCHASE_ENGINE.md (Purchase voucher structure, accounting effect)
 *   - audit/24_TRANSACTION_DEPENDENCIES.md (PV dependency map)
 *   - audit/04_ACCOUNTING_ENGINE.md (PV posting rules)
 *   - audit/16_CALCULATIONS.md (Tax formulas)
 *   - audit/07_INVENTORY_ENGINE.md (GRN movement)
 *
 * Accounting (PV posting, audit/24):
 *   DEBIT: Inventory (11301) — Base Amount
 *   DEBIT: Tax Input (11401) — GST Amount
 *   CREDIT: Supplier AP (21100) — Net Amount
 *
 * Rejected taxes (no GL accounts):
 *   FED — No FED Input account in COA (only 21203 FED Payable for sales)
 *   Further Tax — No GL account defined
 *   Advance Tax — No GL account defined
 *
 * Inventory effect (audit/07, audit/24):
 *   Stock INCREASED by received quantity via GRN movement
 */

import { VoucherHeader, CreateVoucherDTO, VoucherType } from '../types/voucher';
import { StockMovement, calculateBillLineTax, BillLineTaxInput } from '../types/inventory';
import { Supplier } from '../types/supplier';
import { IVoucherRepository } from '../repositories/IVoucherRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { ISupplierRepository } from '../repositories/ISupplierRepository';
import { ICOARepository } from '../repositories/ICOARepository';

/* ─── Constants ────────────────────────────────────────────── */

/**
 * GL account codes for purchase posting.
 * Source: MockCOAAdapter seed data, audit/11_PURCHASE_ENGINE.md, audit/24_TRANSACTION_DEPENDENCIES.md
 */
const ACCOUNT_CODES = {
  /** Inventory — General Inventory */
  INVENTORY: '11301',
  /** Tax Input — Sales Tax Input */
  SALES_TAX_INPUT: '11401',
  /** Accounts Payable — parent for supplier-specific accounts */
  ACCOUNTS_PAYABLE: '21100',
} as const;

/* ─── DTOs ─────────────────────────────────────────────────── */

/** A single line item in a purchase bill */
export interface PurchaseBillLine {
  /** Product reference */
  productId: string;
  /** Quantity in cartons */
  cartons: number;
  /** Quantity in pieces (total = cartons × pcsPerCarton + loose packs) */
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

/** Payload for creating a new purchase bill */
export interface CreatePurchaseBillDTO {
  /** Supplier reference */
  supplierId: string;
  /** Bill date */
  date: string;
  /** Warehouse for stock receipt */
  warehouseId: string;
  /** Bill narration/description */
  narration?: string;
  /** Bill lines */
  lines: PurchaseBillLine[];
}

/* ─── Result Types ─────────────────────────────────────────── */

/** Tax breakdown for a single line */
export interface PurchaseLineTaxDetail {
  amount: number;
  discountAmount: number;
  toAmount: number;
  gstAmount: number;
  furtherTaxAmount: number;
  fedAmount: number;
  advanceTaxAmount: number;
  netAmount: number;
}

/** Complete purchase bill calculation result */
export interface PurchaseBillCalculation {
  lines: PurchaseLineTaxDetail[];
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

export class PurchaseService {
  constructor(
    private coaRepo: ICOARepository,
    private voucherRepo: IVoucherRepository,
    private inventoryRepo: IInventoryRepository,
    private supplierRepo: ISupplierRepository,
  ) {}

  /* ─── Calculation (pure, no side effects) ─────────────────── */

  /**
   * Calculate tax breakdown for a single purchase bill line.
   * Source: audit/16_CALCULATIONS.md #1-9
   */
  calculateLineTax(line: PurchaseBillLine, pcsPerCarton: number): PurchaseLineTaxDetail {
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
   * Calculate complete bill totals.
   * Source: audit/11_PURCHASE_ENGINE.md, audit/16_CALCULATIONS.md #10-17
   */
  async calculateBill(tenantId: string, lines: PurchaseBillLine[]): Promise<PurchaseBillCalculation> {
    const products = await this.inventoryRepo.getProducts(tenantId);
    const productMap = new Map(products.map(p => [p.id, p]));

    const lineDetails: PurchaseLineTaxDetail[] = [];
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
   * Create a new purchase bill as a DRAFT voucher of type PV.
   * Source: audit/11_PURCHASE_ENGINE.md, audit/04_ACCOUNTING_ENGINE.md
   *
   * The bill is created in DRAFT status. No GL entries or stock movements
   * are created until postPurchaseBill() is called.
   */
  async createPurchaseBill(
    tenantId: string,
    dto: CreatePurchaseBillDTO,
    createdBy: string,
  ): Promise<VoucherHeader> {
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

    // D2 safety: Further Tax, Advance Tax, and FED have no verified GL
    // purchase-side accounts. Posting without accounts would create an
    // unbalanced voucher. Fail safely rather than silently ignoring tax.
    if (calculation.totalFurtherTax > 0 || calculation.totalAdvanceTax > 0 || calculation.totalFed > 0) {
      throw new Error(
        'Cannot create purchase bill: Further Tax, Advance Tax, or FED is non-zero but ' +
        'no GL purchase-side accounts are configured for these tax types. ' +
        'Set Further Tax %, Advance Tax %, and FED % to 0, or configure GL accounts first.',
      );
    }

    // Create balanced GL entries.
    // DEBIT: Inventory (base amount) + Tax Input (GST)
    // CREDIT: Supplier AP — per-product lines with bill metadata
    const balancedLines: CreateVoucherDTO['lines'] = [
      // DEBIT: Inventory — Base Amount (To.Amt)
      {
        accountId: ACCOUNT_CODES.INVENTORY,
        description: 'Inventory purchase — base cost',
        debit: calculation.totalToAmount,
        credit: 0,
      },
      // DEBIT: Tax Input — GST
      ...(calculation.totalGst > 0 ? [{
        accountId: ACCOUNT_CODES.SALES_TAX_INPUT,
        description: 'Input sales tax on purchases',
        debit: calculation.totalGst,
        credit: 0,
      }] : []),
      // CREDIT: Supplier AP — per-product lines (mirrors Customer AR pattern)
      ...dto.lines.map((line, idx) => {
        const detail = calculation.lines[idx];
        const product = productMap.get(line.productId)!;
        return {
          accountId: supplier.accountHeadId,
          description: `${product.name} × ${line.packs} @ ${line.rate}`,
          debit: 0,
          credit: detail.netAmount,
          quantity: line.packs,
          productId: line.productId,
          branch: dto.warehouseId,
          stRate: line.gstPercent,
          stAmount: detail.gstAmount,
          amtExclStd: detail.toAmount,
        };
      }),
    ];

    const voucher = await this.voucherRepo.createVoucher(
      tenantId,
      {
        voucherType: 'PV' as VoucherType,
        date: dto.date,
        narration: dto.narration ?? `Purchase from ${supplier.name}`,
        lines: balancedLines,
      },
      createdBy,
    );

    return voucher;
  }

  /* ─── Bill Posting ────────────────────────────────────────── */

  /**
   * Post a purchase bill (PV voucher).
   * Source: audit/11_PURCHASE_ENGINE.md, audit/24_TRANSACTION_DEPENDENCIES.md
   *
   * Effects:
   * 1. Voucher posted → LedgerEntry records created
   * 2. Stock GRN movement created and posted for each line
   *
   * Accounting entries (per audit/11, audit/24):
   *   DEBIT: Inventory (11301) — Base Amount
   *   DEBIT: Tax Input (11401) — GST Amount
   *   CREDIT: Supplier AP (21100) — Net Amount
   *
   * Inventory effect (per audit/24):
   *   Stock INCREASED by received quantity
   */
  async postPurchaseBill(tenantId: string, voucherId: string): Promise<VoucherHeader> {
    // Post the voucher (generates LedgerEntry records)
    const postedVoucher = await this.voucherRepo.postVoucher(tenantId, voucherId);

    // Get the voucher lines to extract product/quantity data
    const voucherLines = await this.voucherRepo.getVoucherLines(tenantId, voucherId);

    // Create stock GRN movements for lines with product references
    for (const line of voucherLines) {
      if (line.productId && line.quantity && line.quantity > 0) {
        // Get stock levels to find the destination warehouse
        const stockLevels = await this.inventoryRepo.getStockLevels(tenantId);
        const productLevels = stockLevels.filter(sl => sl.productId === line.productId);

        // Use the destination warehouse from the line, or first available
        const destLevel = productLevels.find(sl => sl.warehouseId === line.branch)
          ?? productLevels[0];

        if (destLevel) {
          // Create GRN movement (receipt into stock)
          const movement: Omit<StockMovement, 'id' | 'createdAt'> = {
            tenantId,
            movementType: 'GRN',
            movementDate: postedVoucher.date,
            referenceType: 'Voucher',
            referenceId: voucherId,
            toWarehouseId: destLevel.warehouseId,
            productId: line.productId,
            quantity: line.quantity,
            unitCost: destLevel.unitCost,
            totalCost: line.quantity * destLevel.unitCost,
            narration: `GRN receipt for ${line.description}`,
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
   * Get all purchase vouchers (PV type) for a tenant.
   */
  async getPurchaseBills(tenantId: string): Promise<VoucherHeader[]> {
    return this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'PV' });
  }

  /**
   * Get a single purchase bill by id.
   */
  async getPurchaseBillById(tenantId: string, id: string): Promise<VoucherHeader | null> {
    return this.voucherRepo.getVoucherById(tenantId, id);
  }

  /**
   * Delete a DRAFT purchase bill.
   */
  async deletePurchaseBill(tenantId: string, id: string): Promise<void> {
    return this.voucherRepo.deleteVoucher(tenantId, id);
  }
}
