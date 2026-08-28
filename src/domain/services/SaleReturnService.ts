/**
 * Sale Return Service (SRV)
 * Orchestrates sale return bill creation, posting, and inventory effect.
 *
 * Source of Truth:
 *   - audit/10_SALES_ENGINE.md (SRV accounting: DR Sales Return + Tax Payable, CR Customer AR)
 *   - audit/12_RETURNS_REVERSALS.md (SRV overview)
 *   - audit/24_TRANSACTION_DEPENDENCIES.md (SRV dependency map)
 *   - audit/16_CALCULATIONS.md (Tax formulas)
 *
 * Accounting (SRV posting):
 *   DEBIT: Sales Return (41104) — Base Amount
 *   DEBIT: Sales Tax Output (21201) — GST + Further Tax
 *   DEBIT: FED Payable (21203) — FED
 *   DEBIT: Withholding Tax Payable (21202) — Advance Tax
 *   CREDIT: Customer AR — Net Amount (all taxes included)
 *
 * Inventory effect:
 *   Stock INCREASED by returned quantity (RETURN movement, reverse of ISSUE)
 */

import { VoucherHeader, CreateVoucherDTO, VoucherType } from '../types/voucher';
import { StockMovement, calculateBillLineTax, BillLineTaxInput } from '../types/inventory';
import { Customer } from '../types/customer';
import { IVoucherRepository } from '../repositories/IVoucherRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { ICustomerRepository } from '../repositories/ICustomerRepository';

/* ─── Constants ────────────────────────────────────────────── */

const ACCOUNT_CODES = {
  /** Sales Return — reversal of sales revenue */
  SALES_RETURN: '41104',
  /** Tax Payable — Sales Tax Output (GST + Further Tax) */
  SALES_TAX_OUTPUT: '21201',
  /** Tax Payable — Withholding Tax / Advance Tax Payable */
  WITHHOLDING_TAX_PAYABLE: '21202',
  /** Tax Payable — FED Payable */
  FED_PAYABLE: '21203',
} as const;

/* ─── DTOs ─────────────────────────────────────────────────── */

/** A single line item in a sale return bill */
export interface SaleReturnLine {
  /** Product reference */
  productId: string;
  /** Quantity in cartons */
  cartons: number;
  /** Quantity in pieces */
  packs: number;
  /** Sale rate per piece (must match original sale rate) */
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

/** Payload for creating a new sale return bill */
export interface CreateSaleReturnDTO {
  /** Customer reference */
  customerId: string;
  /** Bill date */
  date: string;
  /** Warehouse for stock return */
  warehouseId: string;
  /** Bill narration/description */
  narration?: string;
  /** Bill lines */
  lines: SaleReturnLine[];
}

/* ─── Result Types ─────────────────────────────────────────── */

/** Tax breakdown for a single line */
export interface SaleReturnLineTaxDetail {
  amount: number;
  discountAmount: number;
  toAmount: number;
  gstAmount: number;
  furtherTaxAmount: number;
  fedAmount: number;
  advanceTaxAmount: number;
  netAmount: number;
}

/** Complete sale return bill calculation result */
export interface SaleReturnBillCalculation {
  lines: SaleReturnLineTaxDetail[];
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

export class SaleReturnService {
  constructor(
    private voucherRepo: IVoucherRepository,
    private inventoryRepo: IInventoryRepository,
    private customerRepo: ICustomerRepository,
  ) {}

  /* ─── Calculation (pure, no side effects) ─────────────────── */

  /**
   * Calculate tax breakdown for a single sale return line.
   * Reuses the same calculateBillLineTax formula as sales.
   */
  calculateLineTax(line: SaleReturnLine, pcsPerCarton: number): SaleReturnLineTaxDetail {
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
   * Calculate complete bill totals for a sale return.
   */
  async calculateBill(tenantId: string, lines: SaleReturnLine[]): Promise<SaleReturnBillCalculation> {
    const products = await this.inventoryRepo.getProducts(tenantId);
    const productMap = new Map(products.map(p => [p.id, p]));

    const lineDetails: SaleReturnLineTaxDetail[] = [];
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
   * Create a new sale return bill as a DRAFT voucher of type SRV.
   *
   * Accounting (audit/10, audit/12):
   *   DEBIT: Sales Return (41104) — Base Amount
   *   DEBIT: Sales Tax Output (21201) — GST + Further Tax
   *   DEBIT: FED Payable (21203) — FED
   *   DEBIT: Withholding Tax Payable (21202) — Advance Tax
   *   CREDIT: Customer AR — Net Amount
   */
  async createSaleReturn(
    tenantId: string,
    dto: CreateSaleReturnDTO,
    createdBy: string,
  ): Promise<VoucherHeader> {
    // Validate customer exists
    const customer = await this.customerRepo.getCustomerById(tenantId, dto.customerId);
    if (!customer) throw new Error('Customer not found');
    if (!customer.isActive) throw new Error('Customer is inactive');

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
    // DEBIT: Sales Return (base amount) + Tax Payable (GST + Further Tax + FED + Advance Tax)
    // CREDIT: Customer AR — per-product lines with bill metadata
    const balancedLines: CreateVoucherDTO['lines'] = [
      // DEBIT: Sales Return — Base Amount (To.Amt)
      {
        accountId: ACCOUNT_CODES.SALES_RETURN,
        description: 'Sale return — base amount',
        debit: calculation.totalToAmount,
        credit: 0,
      },
      // DEBIT: Sales Tax Output — GST + Further Tax
      ...(calculation.totalGst + calculation.totalFurtherTax > 0 ? [{
        accountId: ACCOUNT_CODES.SALES_TAX_OUTPUT,
        description: 'Sales tax returned',
        debit: calculation.totalGst + calculation.totalFurtherTax,
        credit: 0,
      }] : []),
      // DEBIT: FED Payable — FED
      ...(calculation.totalFed > 0 ? [{
        accountId: ACCOUNT_CODES.FED_PAYABLE,
        description: 'FED returned',
        debit: calculation.totalFed,
        credit: 0,
      }] : []),
      // DEBIT: Withholding Tax Payable — Advance Tax
      ...(calculation.totalAdvanceTax > 0 ? [{
        accountId: ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE,
        description: 'Advance tax returned',
        debit: calculation.totalAdvanceTax,
        credit: 0,
      }] : []),
      // CREDIT: Customer AR — per-product lines (reversal of sale)
      ...dto.lines.map((line, idx) => {
        const detail = calculation.lines[idx];
        const product = productMap.get(line.productId)!;
        return {
          accountId: customer.accountHeadId,
          description: `Return: ${product.name} × ${line.packs} @ ${line.rate}`,
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
        voucherType: 'SRV' as VoucherType,
        date: dto.date,
        narration: dto.narration ?? `Sale return from ${customer.name}`,
        lines: balancedLines,
      },
      createdBy,
    );

    return voucher;
  }

  /* ─── Bill Posting ────────────────────────────────────────── */

  /**
   * Post a sale return bill (SRV voucher).
   *
   * Effects:
   * 1. Voucher posted → LedgerEntry records created
   * 2. Stock RETURN movement created and posted for each line (increases stock)
   */
  async postSaleReturn(tenantId: string, voucherId: string): Promise<VoucherHeader> {
    // Post the voucher (generates LedgerEntry records)
    const postedVoucher = await this.voucherRepo.postVoucher(tenantId, voucherId);

    // Get the voucher lines to extract product/quantity data
    const voucherLines = await this.voucherRepo.getVoucherLines(tenantId, voucherId);

    // Create stock RETURN movements for lines with product references
    for (const line of voucherLines) {
      if (line.productId && line.quantity && line.quantity > 0) {
        // Get the stock level to find the destination warehouse
        const stockLevels = await this.inventoryRepo.getStockLevels(tenantId);
        const productLevels = stockLevels.filter(sl => sl.productId === line.productId);

        // Use the warehouse from the line, or first available
        const destLevel = productLevels.find(sl => sl.warehouseId === line.branch)
          ?? productLevels[0];

        if (destLevel) {
          // Create RETURN movement (restores stock, reverse of ISSUE)
          const movement: Omit<StockMovement, 'id' | 'createdAt'> = {
            tenantId,
            movementType: 'RETURN',
            movementDate: postedVoucher.date,
            referenceType: 'Voucher',
            referenceId: voucherId,
            toWarehouseId: destLevel.warehouseId,
            productId: line.productId,
            quantity: line.quantity,
            unitCost: destLevel.unitCost,
            totalCost: line.quantity * destLevel.unitCost,
            narration: `Sale return receipt for ${line.description}`,
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
   * Get all sale return vouchers (SRV type) for a tenant.
   */
  async getSaleReturns(tenantId: string): Promise<VoucherHeader[]> {
    return this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'SRV' });
  }

  /**
   * Get a single sale return bill by id.
   */
  async getSaleReturnById(tenantId: string, id: string): Promise<VoucherHeader | null> {
    return this.voucherRepo.getVoucherById(tenantId, id);
  }

  /**
   * Delete a DRAFT sale return bill.
   */
  async deleteSaleReturn(tenantId: string, id: string): Promise<void> {
    return this.voucherRepo.deleteVoucher(tenantId, id);
  }
}
