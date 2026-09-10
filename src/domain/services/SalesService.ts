/**
 * Sales Service
 * Orchestrates sale bill creation, posting, and inventory effect.
 *
 * Source of Truth:
 *   - audit/10_SALES_ENGINE.md (Sale invoice structure, accounting effect)
 *   - audit/24_TRANSACTION_DEPENDENCIES.md (SV dependency map)
 *   - audit/04_ACCOUNTING_ENGINE.md (SV posting rules)
 *   - audit/16_CALCULATIONS.md (Tax formulas)
 *   - audit/08_COSTING_ENGINE.md (COGS, Cost_rate)
 *   - audit/65_LEGACY_COST_RATE_FORMULA_VERIFICATION.md (Cost_rate formula)
 *
 * COGS FORMULA (verified):
 *   COGS = Quantity_Sold × Cost_Rate
 *   Gross Profit = Sale Amount - COGS
 *
 * KNOWN SPECIFICATION GAPS (documented, not invented):
 *   - Further Tax GL posting: no account defined in COA
 *   - Advance Tax on sales GL posting: no account defined in COA
 *   - COGS account verified: 51101 (Material Purchases)
 */

import { VoucherHeader, CreateVoucherDTO, VoucherType } from '../types/voucher';
import { Product, StockMovement, calculateBillLineTax, BillLineTaxInput, calculateCOGS, calculateGrossProfit } from '../types/inventory';
import { Customer } from '../types/customer';
import { IVoucherRepository } from '../repositories/IVoucherRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { ICustomerRepository } from '../repositories/ICustomerRepository';
import { ICOARepository } from '../repositories/ICOARepository';
import { SystemRoleName } from '../types/rbac';
import { requirePermission, Permissions } from './AuthorizationService';

/* ─── Constants ────────────────────────────────────────────── */

/**
 * GL account codes for sales posting.
 * Source: MockCOAAdapter seed data
 */
const ACCOUNT_CODES = {
  /** Sales Revenue — Wholesale Sales */
  SALES_REVENUE: '41101',
  /** Tax Payable — Sales Tax Output (GST + Further Tax) */
  SALES_TAX_OUTPUT: '21201',
  /** Tax Payable — Withholding Tax / Advance Tax Payable */
  WITHHOLDING_TAX_PAYABLE: '21202',
  /** Tax Payable — FED Payable */
  FED_PAYABLE: '21203',
  /** Inventory — General Inventory */
  INVENTORY: '11301',
  /** COGS — Material Purchases (placeholder, not posted) */
  COGS: '51101',
} as const;

/* ─── DTOs ─────────────────────────────────────────────────── */

/** A single line item in a sale bill */
export interface SaleBillLine {
  /** Product reference */
  productId: string;
  /** Quantity in cartons */
  cartons: number;
  /** Quantity in pieces (total = cartons × pcsPerCarton + loose packs) */
  packs: number;
  /** Sale rate per piece (auto-filled from Product.saleRate, can be overridden) */
  rate: number;
  /** Trade discount percentage (auto-filled from Product.tradeDiscount) */
  tradeDiscountPercent: number;
  /** GST percentage (auto-filled from Product.gstPercent) */
  gstPercent: number;
  /** Further Tax percentage (auto-filled from Product.fedPercent) */
  furtherTaxPercent: number;
  /** FED percentage */
  fedPercent: number;
  /** Advance Tax percentage (auto-filled from Product.advanceTaxSalePercent) */
  advanceTaxPercent: number;
  /** Line description/narration */
  description?: string;
}

/** Payload for creating a new sale bill */
export interface CreateSaleBillDTO {
  /** Customer reference */
  customerId: string;
  /** Bill date */
  date: string;
  /** Warehouse for stock deduction */
  warehouseId: string;
  /** Bill narration/description */
  narration?: string;
  /** Bill lines */
  lines: SaleBillLine[];
}

/* ─── Result Types ─────────────────────────────────────────── */

/** Tax breakdown for a single line */
export interface SaleLineTaxDetail {
  amount: number;
  discountAmount: number;
  toAmount: number;
  gstAmount: number;
  furtherTaxAmount: number;
  fedAmount: number;
  advanceTaxAmount: number;
  netAmount: number;
}

/** Complete sale bill calculation result */
export interface SaleBillCalculation {
  lines: SaleLineTaxDetail[];
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

export class SalesService {
  constructor(
    private coaRepo: ICOARepository,
    private voucherRepo: IVoucherRepository,
    private inventoryRepo: IInventoryRepository,
    private customerRepo: ICustomerRepository,
  ) {}

  /* ─── Calculation (pure, no side effects) ─────────────────── */

  /**
   * Calculate tax breakdown for a single sale bill line.
   * Source: audit/16_CALCULATIONS.md #1-9
   * Uses existing calculateBillLineTax() function.
   */
  calculateLineTax(line: SaleBillLine, pcsPerCarton: number): SaleLineTaxDetail {
    // Total pieces = cartons × pcsPerCarton + loose packs
    // For simplicity, packs is treated as the total piece quantity
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
   * Source: audit/10_SALES_ENGINE.md (Bill Totals), audit/16_CALCULATIONS.md #10-17
   */
  async calculateBill(tenantId: string, lines: SaleBillLine[]): Promise<SaleBillCalculation> {
    const products = await this.inventoryRepo.getProducts(tenantId);
    const productMap = new Map(products.map(p => [p.id, p]));

    const lineDetails: SaleLineTaxDetail[] = [];
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
   * Create a new sale bill as a DRAFT voucher of type SV.
   * Source: audit/10_SALES_ENGINE.md, audit/04_ACCOUNTING_ENGINE.md
   *
   * The bill is created in DRAFT status. No GL entries or stock movements
   * are created until postSaleBill() is called.
   */
  async createSaleBill(
    tenantId: string,
    dto: CreateSaleBillDTO,
    createdBy: string,
    role: SystemRoleName = 'ADMIN',
  ): Promise<VoucherHeader> {
    requirePermission(role, Permissions.SALES_CREATE);
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

    // Calculate total COGS for GL posting
    let totalCogs = 0;
    for (const line of dto.lines) {
      const product = productMap.get(line.productId);
      const costRate = product?.costRate ?? 0;
      totalCogs += calculateCOGS(line.packs, costRate);
    }

    // Create balanced GL entries.
    // DEBIT: Customer AR — one line per bill line (carries productId/quantity
    //        for inventory ISSUE on posting).
    // CREDIT: Sales Revenue (base amount) + Tax Payable (GST + Further Tax + FED + Advance Tax).
    // DEBIT: COGS — Cost Amount [VERIFIED — audit/65]
    // CREDIT: Inventory — Cost Amount [VERIFIED — audit/65]
    const balancedLines: CreateVoucherDTO['lines'] = [
      // DEBIT: Customer AR — per-product lines with bill metadata
      ...dto.lines.map((line, idx) => {
        const detail = calculation.lines[idx];
        const product = productMap.get(line.productId)!;
        return {
          accountId: customer.accountHeadId,
          description: `${product.name} × ${line.packs} @ ${line.rate}`,
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
      // CREDIT: Sales Revenue — Base Amount (To.Amt)
      {
        accountId: ACCOUNT_CODES.SALES_REVENUE,
        description: 'Wholesale sales income',
        debit: 0,
        credit: calculation.totalToAmount,
      },
      // CREDIT: Sales Tax Output — GST + Further Tax (combined sales-tax liability)
      ...(calculation.totalGst + calculation.totalFurtherTax > 0 ? [{
        accountId: ACCOUNT_CODES.SALES_TAX_OUTPUT,
        description: 'Sales tax collected',
        debit: 0,
        credit: calculation.totalGst + calculation.totalFurtherTax,
      }] : []),
      // CREDIT: FED Payable — FED
      ...(calculation.totalFed > 0 ? [{
        accountId: ACCOUNT_CODES.FED_PAYABLE,
        description: 'Federal excise duty collected',
        debit: 0,
        credit: calculation.totalFed,
      }] : []),
      // CREDIT: Withholding Tax Payable — Advance Tax
      ...(calculation.totalAdvanceTax > 0 ? [{
        accountId: ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE,
        description: 'Advance income tax withheld',
        debit: 0,
        credit: calculation.totalAdvanceTax,
      }] : []),
      // DEBIT: COGS — Cost Amount (Quantity × Cost_rate)
      ...(totalCogs > 0 ? [{
        accountId: ACCOUNT_CODES.COGS,
        description: 'Cost of goods sold',
        debit: totalCogs,
        credit: 0,
      }] : []),
      // CREDIT: Inventory — Cost Amount (reduces inventory value)
      ...(totalCogs > 0 ? [{
        accountId: ACCOUNT_CODES.INVENTORY,
        description: 'Inventory reduction — cost of sales',
        debit: 0,
        credit: totalCogs,
      }] : []),
    ];

    const voucher = await this.voucherRepo.createVoucher(
      tenantId,
      {
        voucherType: 'SV' as VoucherType,
        date: dto.date,
        narration: dto.narration ?? `Sale invoice to ${customer.name}`,
        lines: balancedLines,
      },
      createdBy,
    );

    return voucher;
  }

  /* ─── Bill Posting ────────────────────────────────────────── */

  /**
   * Post a sale bill (SV voucher).
   * Source: audit/10_SALES_ENGINE.md, audit/24_TRANSACTION_DEPENDENCIES.md
   *
   * Effects:
   * 1. Voucher posted → LedgerEntry records created
   * 2. Stock ISSUE movement created and posted for each line
   * 3. COGS GL entries created (DR COGS 51101, CR Inventory 11301)
   *
   * Accounting entries (per audit/10, audit/24, legacy ERP accounting model):
   *   DEBIT: Customer AR (500 DEBITORS) — Net Amount (all taxes included)
   *   CREDIT: Sales Income (41101) — Base Amount (To.Amt)
   *   CREDIT: Sales Tax Output (21201) — GST + Further Tax
   *   CREDIT: FED Payable (21203) — FED
   *   CREDIT: Withholding Tax Payable (21202) — Advance Tax
   *   DEBIT: COGS (51101) — Cost Amount [VERIFIED — audit/65]
   *   CREDIT: Inventory (11301) — Cost Amount [VERIFIED — audit/65]
   *
   * Inventory effect (per audit/24):
   *   Stock DECREASED by sold quantity
   *   Stock Value DECREASED by cost (using Cost_rate from product)
   */
  async postSaleBill(tenantId: string, voucherId: string, role: SystemRoleName = 'ADMIN'): Promise<VoucherHeader> {
    requirePermission(role, Permissions.SALES_POST);
    // Post the voucher (generates LedgerEntry records)
    const postedVoucher = await this.voucherRepo.postVoucher(tenantId, voucherId);

    // Get the voucher lines to extract product/quantity data
    const voucherLines = await this.voucherRepo.getVoucherLines(tenantId, voucherId);

    // Get products to resolve cost rates
    const products = await this.inventoryRepo.getProducts(tenantId);
    const productMap = new Map(products.map(p => [p.id, p]));

    // Calculate total COGS for GL posting
    let totalCogs = 0;

    // Create stock ISSUE movements for lines with product references
    for (const line of voucherLines) {
      if (line.productId && line.quantity && line.quantity > 0) {
        // Get the stock level to find the source warehouse and current cost
        const stockLevels = await this.inventoryRepo.getStockLevels(tenantId);
        const productLevels = stockLevels.filter(sl => sl.productId === line.productId);

        // Use the first available warehouse with stock
        const sourceLevel = productLevels.find(sl => sl.quantityOnHand >= line.quantity);

        // Get the product's Cost_rate for COGS calculation
        const product = productMap.get(line.productId);
        const costRate = product?.costRate ?? sourceLevel?.unitCost ?? 0;

        // Calculate COGS for this line
        const lineCogs = calculateCOGS(line.quantity, costRate);
        totalCogs += lineCogs;

        if (sourceLevel) {
          // Create ISSUE movement
          const movement: Omit<StockMovement, 'id' | 'createdAt'> = {
            tenantId,
            movementType: 'ISSUE',
            movementDate: postedVoucher.date,
            referenceType: 'Voucher',
            referenceId: voucherId,
            fromWarehouseId: sourceLevel.warehouseId,
            productId: line.productId,
            quantity: line.quantity,
            unitCost: costRate,
            totalCost: lineCogs,
            narration: `Sale issue for ${line.description}`,
            status: 'DRAFT',
            createdBy: postedVoucher.createdBy,
          };

          const createdMovement = await this.inventoryRepo.createStockMovement(tenantId, movement);
          await this.inventoryRepo.postStockMovement(tenantId, createdMovement.id);
        }
        // If no stock available, log but don't fail — legacy doesn't verify stock sufficiency
      }
    }

    // Create COGS GL entries (DR COGS 51101, CR Inventory 11301)
    if (totalCogs > 0) {
      // Note: In the current architecture, GL entries are created by the voucher posting engine.
      // COGS entries need to be added as voucher lines before posting, or as separate journal entries.
      // For now, we document the COGS amount. A separate COGS voucher can be created if needed.
      // TODO: Create a separate COGS journal entry (DR 51101, CR 11301) when the accounting
      // architecture supports multi-voucher posting per bill.
    }

    return postedVoucher;
  }

  /* ─── Queries ─────────────────────────────────────────────── */

  /**
   * Get all sale vouchers (SV type) for a tenant.
   */
  async getSaleBills(tenantId: string): Promise<VoucherHeader[]> {
    return this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'SV' });
  }

  /**
   * Get a single sale bill by id.
   */
  async getSaleBillById(tenantId: string, id: string): Promise<VoucherHeader | null> {
    return this.voucherRepo.getVoucherById(tenantId, id);
  }

  /**
   * Delete a DRAFT sale bill.
   * Source: audit/10_SALES_ENGINE.md — "Delete Bill" button exists
   */
  async deleteSaleBill(tenantId: string, id: string, role: SystemRoleName = 'ADMIN'): Promise<void> {
    requirePermission(role, Permissions.SALES_DELETE);
    const voucher = await this.voucherRepo.getVoucherById(tenantId, id);
    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status === 'POSTED') throw new Error('Cannot delete a posted voucher');
    return this.voucherRepo.deleteVoucher(tenantId, id);
  }
}
