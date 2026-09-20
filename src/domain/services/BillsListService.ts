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

import { VoucherHeader, VoucherLine, VoucherType } from '../types/voucher.js';
import { IVoucherRepository } from '../repositories/IVoucherRepository.js';
import { ICustomerRepository } from '../repositories/ICustomerRepository.js';
import { ISupplierRepository } from '../repositories/ISupplierRepository.js';
import { IInventoryRepository } from '../repositories/IInventoryRepository.js';
import { ICOARepository } from '../repositories/ICOARepository.js';

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
    private coaRepo?: ICOARepository,
  ) {}

  /**
   * Fetch bill vouchers (SV, PV, SRV, PRV) and enrich with party/item data.
   * Uses a single batch query for all voucher lines (no N+1).
   * Optionally filter by voucher types to avoid fetching unused types.
   */
  async getAllBills(tenantId: string, voucherTypes?: VoucherType[]): Promise<BillRecord[]> {
    const types = voucherTypes ?? BILL_VOUCHER_TYPES;

    // Fetch all requested voucher types in parallel
    const headerResults = await Promise.all(
      types.map(t => this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: t }))
    );
    const allHeaders = headerResults.flat().sort((a, b) => b.date.localeCompare(a.date));

    if (allHeaders.length === 0) return [];

    // Fetch lookup data + ALL voucher lines in parallel (single batch query)
    const voucherIds = allHeaders.map(v => v.id);
    const [customers, suppliers, products, allLines] = await Promise.all([
      this.customerRepo.getCustomersByTenantId(tenantId),
      this.supplierRepo.getSuppliers(tenantId),
      this.inventoryRepo.getProducts(tenantId),
      this.voucherRepo.getVoucherLinesByVoucherIds(tenantId, voucherIds),
    ]);

    // Group lines by voucherId in memory
    const linesByVoucher = new Map<string, VoucherLine[]>();
    for (const line of allLines) {
      const list = linesByVoucher.get(line.voucherId) ?? [];
      list.push(line);
      linesByVoucher.set(line.voucherId, list);
    }

    // Build COA id→code map if coaRepo available
    let accountCodeById = new Map<string, string>();
    if (this.coaRepo) {
      const accounts = await this.coaRepo.getAccountsByTenantId(tenantId);
      for (const a of accounts) {
        accountCodeById.set(a.id, a.accountCode);
      }
    }

    // Build lookup maps: accountId (code) → name
    const customerByAccount = new Map<string, { id: string; name: string }>();
    for (const c of customers) {
      const code = accountCodeById.get(c.accountHeadId) || c.accountHeadId;
      customerByAccount.set(code, { id: c.id, name: c.name });
    }

    const supplierByAccount = new Map<string, { id: string; name: string }>();
    for (const s of suppliers) {
      const code = accountCodeById.get(s.accountHeadId) || s.accountHeadId;
      supplierByAccount.set(code, { id: s.id, name: s.name });
    }

    // productId → name
    const productById = new Map<string, string>();
    for (const p of products) {
      productById.set(p.id, p.name);
    }

    // Enrich each voucher — lines already fetched in batch, no per-voucher query
    return allHeaders.map(voucher => {
      const lines = linesByVoucher.get(voucher.id) ?? [];
      return this.enrichBill(voucher, lines, customerByAccount, supplierByAccount, productById);
    });
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