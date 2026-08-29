/**
 * Bill Detail Service
 * Provides complete detail for any bill voucher (SV, PV, SRV, PRV).
 *
 * Returns voucher header, lines with product details, party info,
 * tax breakdown, accounting entries, and inventory movements.
 *
 * Source of Truth:
 *   - audit/43_STEP24_FULL_TRANSACTION_INTEGRATION_AND_DRILLDOWN_REPORT.md
 */

import { VoucherHeader, VoucherLine, LedgerEntry, VoucherType } from '../types/voucher';
import { Product, StockLevel, StockMovement } from '../types/inventory';
import { AccountHead } from '../types/coa';
import { IVoucherRepository } from '../repositories/IVoucherRepository';
import { ICustomerRepository } from '../repositories/ICustomerRepository';
import { ISupplierRepository } from '../repositories/ISupplierRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { ICOARepository } from '../repositories/ICOARepository';

/* ─── Types ────────────────────────────────────────────────── */

export interface BillLineDetail {
  line: VoucherLine;
  productName: string;
  productSku: string;
  productUnit: string;
  rate: number;
  quantity: number;
  discount: number;
  amount: number;
  gstAmount: number;
  furtherTaxAmount: number;
  fedAmount: number;
  advanceTaxAmount: number;
  netAmount: number;
  stockMovement?: StockMovement;
}

export interface BillAccountingEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface BillInventoryMovement {
  movementType: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  fromWarehouse: string;
  toWarehouse: string;
  direction: 'IN' | 'OUT';
  status: string;
}

export interface BillTaxSummary {
  subtotal: number;
  gst: number;
  furtherTax: number;
  fed: number;
  advanceTax: number;
  totalTax: number;
  grandTotal: number;
}

export interface BillDetail {
  voucher: VoucherHeader;
  partyType: 'customer' | 'supplier' | 'unknown';
  partyId: string;
  partyName: string;
  partyAccountCode: string;
  lines: BillLineDetail[];
  accountingEntries: BillAccountingEntry[];
  inventoryMovements: BillInventoryMovement[];
  taxSummary: BillTaxSummary;
  stockLevels: StockLevel[];
}

/* ─── Service ──────────────────────────────────────────────── */

export class BillDetailService {
  constructor(
    private voucherRepo: IVoucherRepository,
    private coaRepo: ICOARepository,
    private customerRepo: ICustomerRepository,
    private supplierRepo: ISupplierRepository,
    private inventoryRepo: IInventoryRepository,
  ) {}

  /**
   * Get complete detail for a specific bill voucher.
   * Returns null if voucher not found or doesn't belong to tenant.
   */
  async getBillDetail(tenantId: string, voucherId: string): Promise<BillDetail | null> {
    // 1. Fetch voucher header
    const voucher = await this.voucherRepo.getVoucherById(tenantId, voucherId);
    if (!voucher) return null;

    // 2. Fetch voucher lines
    const lines = await this.voucherRepo.getVoucherLines(tenantId, voucherId);

    // 3. Fetch ledger entries for this voucher
    const allLedgerEntries = await this.voucherRepo.getLedgerEntries(tenantId, {});
    const voucherLedger = allLedgerEntries.filter(e => e.voucherId === voucherId);

    // 4. Fetch lookup data in parallel
    const [customers, suppliers, products, accounts, stockLevels, allMovements] = await Promise.all([
      this.customerRepo.getCustomersByTenantId(tenantId),
      this.supplierRepo.getSuppliers(tenantId),
      this.inventoryRepo.getProducts(tenantId),
      this.coaRepo.getAccountsByTenantId(tenantId),
      this.inventoryRepo.getStockLevels(tenantId),
      this.inventoryRepo.getStockMovements(tenantId),
    ]);

    // Build lookup maps
    const customerByAccount = new Map<string, { id: string; name: string }>();
    for (const c of customers) customerByAccount.set(c.accountHeadId, { id: c.id, name: c.name });

    const supplierByAccount = new Map<string, { id: string; name: string }>();
    for (const s of suppliers) supplierByAccount.set(s.accountHeadId, { id: s.id, name: s.name });

    const productById = new Map<string, Product>();
    for (const p of products) productById.set(p.id, p);

    const accountById = new Map<string, AccountHead>();
    const accountByCode = new Map<string, AccountHead>();
    for (const a of accounts) {
      accountById.set(a.id, a);
      accountByCode.set(a.accountCode, a);
    }

    // Find movements for this voucher
    const voucherMovements = allMovements.filter(m => m.referenceId === voucherId);

    // 5. Determine party
    let partyType: 'customer' | 'supplier' | 'unknown' = 'unknown';
    let partyId = '';
    let partyName = 'Unknown';
    let partyAccountCode = '';

    for (const line of lines) {
      const customer = customerByAccount.get(line.accountId);
      if (customer) {
        partyType = 'customer';
        partyId = customer.id;
        partyName = customer.name;
        const acc = accountById.get(line.accountId);
        if (acc) partyAccountCode = acc.accountCode;
        break;
      }
      const supplier = supplierByAccount.get(line.accountId);
      if (supplier) {
        partyType = 'supplier';
        partyId = supplier.id;
        partyName = supplier.name;
        const acc = accountById.get(line.accountId);
        if (acc) partyAccountCode = acc.accountCode;
        break;
      }
    }

    // 6. Build line details with product info
    const billLines: BillLineDetail[] = lines.map(line => {
      const product = line.productId ? productById.get(line.productId) : undefined;
      const movement = voucherMovements.find(m => m.productId === line.productId);
      return {
        line,
        productName: product?.name ?? (line.productId ? `Product ${line.productId}` : ''),
        productSku: product?.sku ?? '',
        productUnit: product?.unit ?? '',
        rate: line.amtExclStd > 0 && line.quantity > 0 ? line.amtExclStd / line.quantity : 0,
        quantity: line.quantity,
        discount: 0,
        amount: line.amtExclStd || line.debit || line.credit,
        gstAmount: line.stAmount || 0,
        furtherTaxAmount: 0,
        fedAmount: 0,
        advanceTaxAmount: 0,
        netAmount: line.debit || line.credit,
        stockMovement: movement,
      };
    });

    // 7. Build accounting entries from ledger
    const accountingEntries: BillAccountingEntry[] = voucherLedger.map(entry => {
      const acc = accountByCode.get(entry.accountId);
      return {
        accountId: entry.accountId,
        accountCode: entry.accountId,
        accountName: acc?.accountName ?? entry.accountId,
        description: entry.narration,
        debit: entry.debit,
        credit: entry.credit,
      };
    });

    // 8. Build inventory movements
    const inventoryMovements: BillInventoryMovement[] = voucherMovements.map(m => {
      const product = productById.get(m.productId);
      return {
        movementType: m.movementType,
        productName: product?.name ?? m.productId,
        productSku: product?.sku ?? '',
        quantity: m.quantity,
        unitCost: m.unitCost,
        totalCost: m.totalCost,
        fromWarehouse: m.fromWarehouseId,
        toWarehouse: m.toWarehouseId ?? '',
        direction: (m.movementType === 'GRN' || (m.movementType === 'RETURN' && voucher.voucherType === 'SRV')) ? 'IN' : 'OUT',
        status: m.status,
      };
    });

    // 9. Compute tax summary
    let subtotal = 0;
    let gst = 0;
    let furtherTax = 0;
    let fed = 0;
    let advanceTax = 0;

    for (const bl of billLines) {
      subtotal += bl.amount;
      gst += bl.gstAmount;
      furtherTax += bl.furtherTaxAmount;
      fed += bl.fedAmount;
      advanceTax += bl.advanceTaxAmount;
    }

    // Fallback: if line-level tax not stored, compute from ledger entries
    const totalTaxFromLedger = voucherLedger.reduce((s, e) => {
      const acc = accountByCode.get(e.accountId);
      if (acc && (acc.accountCode === '21201' || acc.accountCode === '21202' || acc.accountCode === '21203' ||
                  acc.accountCode === '11401' || acc.accountCode === '11402' || acc.accountCode === '11403')) {
        return s + (e.debit || e.credit);
      }
      return s;
    }, 0);

    const totalTax = gst + furtherTax + fed + advanceTax || totalTaxFromLedger;
    const grandTotal = subtotal + totalTax;

    return {
      voucher,
      partyType,
      partyId,
      partyName,
      partyAccountCode,
      lines: billLines,
      accountingEntries,
      inventoryMovements,
      taxSummary: {
        subtotal,
        gst,
        furtherTax,
        fed,
        advanceTax,
        totalTax,
        grandTotal,
      },
      stockLevels: stockLevels.filter(sl =>
        billLines.some(bl => bl.line.productId === sl.productId)
      ),
    };
  }
}
