/**
 * Bills List Service
 * Unified transaction register for SV, PV, SRV, PRV bill vouchers.
 *
 * Fetches bills from all four bill services, enriches with party/item names,
 * and supports filtering by type, date range, party, item, and search text.
 *
 * Source of Truth:
 *   - audit/37_COMPLETE_LEGACY_REMAINING_PARITY_DISCOVERY.md (ListofBills parity)
 *   - audit/10_SALES_ENGINE.md (SV accounting)
 *   - audit/11_PURCHASE_ENGINE.md (PV accounting)
 *   - audit/12_RETURNS_REVERSALS.md (SRV/PRV accounting)
 */

import { VoucherHeader, VoucherLine, VoucherType } from '../types/voucher';
import { IVoucherRepository } from '../repositories/IVoucherRepository';
import { ICustomerRepository } from '../repositories/ICustomerRepository';
import { ISupplierRepository } from '../repositories/ISupplierRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';

/* ─── Types ────────────────────────────────────────────────── */

/** Bill types supported in the Bills List */
export const BILL_VOUCHER_TYPES: VoucherType[] = ['SV', 'PV', 'SRV', 'PRV'];

/** Short display labels for bill types */
export const BILL_TYPE_LABELS: Record<string, string> = {
  SV:  'Sale',
  PV:  'Purchase',
  SRV: 'Sale Return',
  PRV: 'Purchase Return',
};

/** Type badge color scheme */
export const BILL_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  SV:  { bg: '#dbeafe', fg: '#1e40af' },
  PV:  { bg: '#fef3c7', fg: '#92400e' },
  SRV: { bg: '#fce7f3', fg: '#9d174d' },
  PRV: { bg: '#d1fae5', fg: '#065f46' },
};

/** Enriched bill record for display in the Bills List */
export interface BillRecord {
  /** Voucher header */
  voucher: VoucherHeader;
  /** Party name (customer or supplier) */
  partyName: string;
  /** Party ID (customer or supplier id) */
  partyId: string;
  /** Total amount (sum of debit on party lines) */
  total: number;
  /** Number of line items */
  lineCount: number;
  /** Product names present in bill lines */
  itemNames: string[];
  /** Product IDs present in bill lines */
  itemIds: string[];
  /** Resolved voucher lines */
  lines: VoucherLine[];
}

/** Filter criteria for the Bills List */
export interface BillsListFilters {
  /** Filter by voucher type (SV/PV/SRV/PRV) */
  voucherType?: string;
  /** Date from (inclusive, YYYY-MM-DD) */
  dateFrom?: string;
  /** Date to (inclusive, YYYY-MM-DD) */
  dateTo?: string;
  /** Party (customer/supplier) ID */
  partyId?: string;
  /** Item (product) ID */
  itemId?: string;
  /** Free-text search (voucher #, narration, party name, item name) */
  search?: string;
}

/* ─── Service ──────────────────────────────────────────────── */

export class BillsListService {
  constructor(
    private voucherRepo: IVoucherRepository,
    private customerRepo: ICustomerRepository,
    private supplierRepo: ISupplierRepository,
    private inventoryRepo: IInventoryRepository,
  ) {}

  /**
   * Fetch all bill vouchers (SV, PV, SRV, PRV) and enrich with party/item data.
   */
  async getAllBills(tenantId: string): Promise<BillRecord[]> {
    // Fetch all bill types in parallel
    const [svBills, pvBills, srvBills, prvBills] = await Promise.all([
      this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'SV' }),
      this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'PV' }),
      this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'SRV' }),
      this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'PRV' }),
    ]);

    // Merge and sort by date descending
    const allHeaders = [...svBills, ...pvBills, ...srvBills, ...prvBills]
      .sort((a, b) => b.date.localeCompare(a.date));

    // Fetch lookup data
    const [customers, suppliers, products] = await Promise.all([
      this.customerRepo.getCustomersByTenantId(tenantId),
      this.supplierRepo.getSuppliers(tenantId),
      this.inventoryRepo.getProducts(tenantId),
    ]);

    // Build lookup maps: accountId → name
    const customerByAccount = new Map<string, { id: string; name: string }>();
    for (const c of customers) {
      customerByAccount.set(c.accountHeadId, { id: c.id, name: c.name });
    }

    const supplierByAccount = new Map<string, { id: string; name: string }>();
    for (const s of suppliers) {
      supplierByAccount.set(s.accountHeadId, { id: s.id, name: s.name });
    }

    // productId → name
    const productById = new Map<string, string>();
    for (const p of products) {
      productById.set(p.id, p.name);
    }

    // Enrich each voucher with party, items, total
    const records: BillRecord[] = [];
    for (const voucher of allHeaders) {
      const lines = await this.voucherRepo.getVoucherLines(tenantId, voucher.id);
      const enriched = this.enrichBill(voucher, lines, customerByAccount, supplierByAccount, productById);
      records.push(enriched);
    }

    return records;
  }

  /**
   * Apply filters to a list of bill records.
   */
  filterBills(bills: BillRecord[], filters: BillsListFilters): BillRecord[] {
    let result = [...bills];

    // Voucher type filter
    if (filters.voucherType) {
      result = result.filter(b => b.voucher.voucherType === filters.voucherType);
    }

    // Date range filter (inclusive)
    if (filters.dateFrom) {
      result = result.filter(b => b.voucher.date >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      result = result.filter(b => b.voucher.date <= filters.dateTo!);
    }

    // Party filter
    if (filters.partyId) {
      result = result.filter(b => b.partyId === filters.partyId);
    }

    // Item filter
    if (filters.itemId) {
      result = result.filter(b => b.itemIds.includes(filters.itemId!));
    }

    // Free-text search
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(b =>
        String(b.voucher.voucherNumber).includes(q) ||
        b.voucher.narration.toLowerCase().includes(q) ||
        b.partyName.toLowerCase().includes(q) ||
        b.itemNames.some(name => name.toLowerCase().includes(q))
      );
    }

    return result;
  }

  /**
   * Delete a draft bill. Throws if bill is POSTED.
   */
  async deleteBill(tenantId: string, voucherId: string): Promise<void> {
    const voucher = await this.voucherRepo.getVoucherById(tenantId, voucherId);
    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status === 'POSTED') throw new Error('Cannot delete a posted voucher');
    return this.voucherRepo.deleteVoucher(tenantId, voucherId);
  }

  /* ─── Private Helpers ──────────────────────────────────────── */

  /**
   * Enrich a single voucher with party, items, and total.
   */
  private enrichBill(
    voucher: VoucherHeader,
    lines: VoucherLine[],
    customerByAccount: Map<string, { id: string; name: string }>,
    supplierByAccount: Map<string, { id: string; name: string }>,
    productById: Map<string, string>,
  ): BillRecord {
    let partyName = 'Unknown';
    let partyId = '';
    let total = 0;
    const itemNames: string[] = [];
    const itemIds: string[] = [];

    for (const line of lines) {
      // Party detection: look up account in customer or supplier maps
      const customer = customerByAccount.get(line.accountId);
      if (customer) {
        partyName = customer.name;
        partyId = customer.id;
      }
      const supplier = supplierByAccount.get(line.accountId);
      if (supplier) {
        partyName = supplier.name;
        partyId = supplier.id;
      }

      // Total: sum product lines only (party lines have productId)
      // For SV/PRV: party line is debited; for PV/SRV: party line is credited
      // Using Math.max(debit, credit) handles both debit-normal and credit-normal correctly
      if (line.productId) {
        total += Math.max(line.debit, line.credit);
      }

      // Items: collect unique product names
      if (line.productId && productById.has(line.productId)) {
        const name = productById.get(line.productId)!;
        if (!itemNames.includes(name)) {
          itemNames.push(name);
        }
        if (!itemIds.includes(line.productId)) {
          itemIds.push(line.productId);
        }
      }
    }

    return {
      voucher,
      partyName,
      partyId,
      total,
      lineCount: lines.length,
      itemNames,
      itemIds,
      lines,
    };
  }
}
