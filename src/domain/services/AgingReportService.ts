/**
 * Aging Report Service
 * Calculates customer and supplier aging from ledger data.
 *
 * Uses FIFO payment allocation to determine which invoices are outstanding
 * and allocates outstanding amounts to aging buckets.
 *
 * Source of Truth:
 *   - audit/37_COMPLETE_LEGACY_REMAINING_PARITY_DISCOVERY.md
 *   - audit/04_ACCOUNTING_ENGINE.md (AR/AP accounting)
 *   - audit/10_SALES_ENGINE.md (SV posting: DR Customer AR)
 *   - audit/11_PURCHASE_ENGINE.md (PV posting: CR Supplier AP)
 *   - audit/12_RETURNS_REVERSALS.md (SRV/PRV accounting)
 */

import { LedgerEntry, VoucherType } from '../types/voucher';
import { AccountHead } from '../types/coa';
import { Customer } from '../types/customer';
import { Supplier } from '../types/supplier';
import { IVoucherRepository } from '../repositories/IVoucherRepository';
import { ICOARepository } from '../repositories/ICOARepository';
import { ICustomerRepository } from '../repositories/ICustomerRepository';
import { ISupplierRepository } from '../repositories/ISupplierRepository';

/* ─── Types ────────────────────────────────────────────────── */

/** Aging mode */
export type AgingMode = 'customer' | 'supplier';

/** Aging bucket boundaries (days) */
export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d91_120: number;
  d120plus: number;
}

/** Single party aging row */
export interface AgingRow {
  partyId: string;
  partyName: string;
  accountCode: string;
  accountName: string;
  /** Total outstanding balance */
  totalOutstanding: number;
  /** Aging buckets */
  aging: AgingBuckets;
}

/** Complete aging report */
export interface AgingReportDTO {
  mode: AgingMode;
  asOfDate: string;
  rows: AgingRow[];
  /** Summary totals across all rows */
  totals: AgingBuckets;
  grandTotal: number;
}

/* ─── Service ──────────────────────────────────────────────── */

export class AgingReportService {
  constructor(
    private voucherRepo: IVoucherRepository,
    private coaRepo: ICOARepository,
    private customerRepo: ICustomerRepository,
    private supplierRepo: ISupplierRepository,
  ) {}

  /**
   * Generate aging report for customers or suppliers.
   *
   * @param tenantId - Tenant identifier
   * @param mode - 'customer' or 'supplier'
   * @param asOfDate - Aging as-of date (YYYY-MM-DD)
   * @param partyId - Optional: filter to a specific party
   */
  async generateReport(
    tenantId: string,
    mode: AgingMode,
    asOfDate: string,
    partyId?: string,
  ): Promise<AgingReportDTO> {
    if (mode === 'customer') {
      return this.generateCustomerAging(tenantId, asOfDate, partyId);
    } else {
      return this.generateSupplierAging(tenantId, asOfDate, partyId);
    }
  }

  /* ─── Customer Aging ──────────────────────────────────────── */

  private async generateCustomerAging(
    tenantId: string,
    asOfDate: string,
    partyId?: string,
  ): Promise<AgingReportDTO> {
    // Fetch all customers
    let customers = await this.customerRepo.getCustomersByTenantId(tenantId);
    if (partyId) {
      customers = customers.filter(c => c.id === partyId);
    }

    // Fetch COA for account names
    const accounts = await this.coaRepo.getAccountsByTenantId(tenantId);
    const accountByCode = new Map(accounts.map(a => [a.accountCode, a]));
    const accountById = new Map(accounts.map(a => [a.id, a]));

    const rows: AgingRow[] = [];

    for (const customer of customers) {
      // Resolve customer's accountHeadId → accountCode for ledger lookup
      const coaAccount = accountById.get(customer.accountHeadId);
      if (!coaAccount) continue;

      // Get all ledger entries for this customer's AR account
      const entries = await this.voucherRepo.getLedgerEntries(tenantId, {
        accountId: coaAccount.accountCode,
      });

      // Only include entries on or before asOfDate
      const filteredEntries = entries.filter(e => e.entryDate <= asOfDate);

      // Sort by date ascending for FIFO allocation
      const sorted = [...filteredEntries].sort((a, b) =>
        a.entryDate.localeCompare(b.entryDate) || a.voucherNumber - b.voucherNumber
      );

      // FIFO allocation: debits are invoices (add to outstanding),
      // credits are payments/returns (reduce oldest outstanding)
      const aging = this.allocateAging(sorted, asOfDate, 'AR');

      // Look up account info
      const account = accountByCode.get(coaAccount.accountCode);

      // Only include rows with outstanding balance
      if (aging.current + aging.d1_30 + aging.d31_60 + aging.d61_90 + aging.d91_120 + aging.d120plus > 0.005) {
        rows.push({
          partyId: customer.id,
          partyName: customer.name,
          accountCode: coaAccount.accountCode,
          accountName: account?.accountName ?? 'AR Account',
          totalOutstanding: aging.current + aging.d1_30 + aging.d31_60 + aging.d61_90 + aging.d91_120 + aging.d120plus,
          aging,
        });
      }
    }

    // Sort by party name
    rows.sort((a, b) => a.partyName.localeCompare(b.partyName));

    // Compute totals
    const totals = this.sumAging(rows);

    return {
      mode: 'customer',
      asOfDate,
      rows,
      totals,
      grandTotal: totals.current + totals.d1_30 + totals.d31_60 + totals.d61_90 + totals.d91_120 + totals.d120plus,
    };
  }

  /* ─── Supplier Aging ──────────────────────────────────────── */

  private async generateSupplierAging(
    tenantId: string,
    asOfDate: string,
    partyId?: string,
  ): Promise<AgingReportDTO> {
    // Fetch all suppliers
    let suppliers = await this.supplierRepo.getSuppliers(tenantId);
    if (partyId) {
      suppliers = suppliers.filter(s => s.id === partyId);
    }

    // Fetch COA for account names
    const accounts = await this.coaRepo.getAccountsByTenantId(tenantId);
    const accountByCode = new Map(accounts.map(a => [a.accountCode, a]));
    const accountById = new Map(accounts.map(a => [a.id, a]));

    const rows: AgingRow[] = [];

    for (const supplier of suppliers) {
      // Resolve supplier's accountHeadId → accountCode for ledger lookup
      const coaAccount = accountById.get(supplier.accountHeadId);
      if (!coaAccount) continue;

      // Get all ledger entries for this supplier's AP account
      const entries = await this.voucherRepo.getLedgerEntries(tenantId, {
        accountId: coaAccount.accountCode,
      });

      // Only include entries on or before asOfDate
      const filteredEntries = entries.filter(e => e.entryDate <= asOfDate);

      // Sort by date ascending for FIFO allocation
      const sorted = [...filteredEntries].sort((a, b) =>
        a.entryDate.localeCompare(b.entryDate) || a.voucherNumber - b.voucherNumber
      );

      // FIFO allocation: credits are invoices (add to outstanding),
      // debits are payments/returns (reduce oldest outstanding)
      const aging = this.allocateAging(sorted, asOfDate, 'AP');

      // Look up account info
      const account = accountByCode.get(coaAccount.accountCode);

      // Only include rows with outstanding balance
      if (aging.current + aging.d1_30 + aging.d31_60 + aging.d61_90 + aging.d91_120 + aging.d120plus > 0.005) {
        rows.push({
          partyId: supplier.id,
          partyName: supplier.name,
          accountCode: coaAccount.accountCode,
          accountName: account?.accountName ?? 'AP Account',
          totalOutstanding: aging.current + aging.d1_30 + aging.d31_60 + aging.d61_90 + aging.d91_120 + aging.d120plus,
          aging,
        });
      }
    }

    // Sort by party name
    rows.sort((a, b) => a.partyName.localeCompare(b.partyName));

    // Compute totals
    const totals = this.sumAging(rows);

    return {
      mode: 'supplier',
      asOfDate,
      rows,
      totals,
      grandTotal: totals.current + totals.d1_30 + totals.d31_60 + totals.d61_90 + totals.d91_120 + totals.d120plus,
    };
  }

  /* ─── Aging Allocation ─────────────────────────────────────── */

  /**
   * Allocate ledger entries to aging buckets using FIFO payment allocation.
   *
   * For AR: debits increase outstanding (invoices), credits reduce it (payments/returns).
   * For AP: credits increase outstanding (invoices), debits reduce it (payments/returns).
   *
   * Returns aging buckets with amounts allocated to each period.
   */
  allocateAging(
    sortedEntries: LedgerEntry[],
    asOfDate: string,
    accountType: 'AR' | 'AP',
  ): AgingBuckets {
    // Track outstanding amounts per invoice date
    // Each entry: { date, amount } where amount is the outstanding from that date
    const outstanding: { date: string; amount: number }[] = [];

    for (const entry of sortedEntries) {
      // Determine the "source" amount for this entry
      // AR: debits are invoices (positive), credits are payments (negative)
      // AP: credits are invoices (positive), debits are payments (negative)
      const amount = accountType === 'AR'
        ? (entry.debit - entry.credit)
        : (entry.credit - entry.debit);

      if (amount > 0) {
        // Invoice or credit memo adding to outstanding
        outstanding.push({ date: entry.entryDate, amount });
      } else if (amount < 0) {
        // Payment or return reducing outstanding — apply FIFO
        let remaining = Math.abs(amount);
        while (remaining > 0.005 && outstanding.length > 0) {
          const oldest = outstanding[0];
          if (oldest.amount <= remaining) {
            remaining -= oldest.amount;
            outstanding.shift();
          } else {
            oldest.amount -= remaining;
            remaining = 0;
          }
        }
      }
    }

    // Allocate remaining outstanding to aging buckets
    const buckets: AgingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 };

    for (const item of outstanding) {
      const days = this.daysBetween(item.date, asOfDate);
      const bucket = this.getBucket(days);
      buckets[bucket] += item.amount;
    }

    return buckets;
  }

  /* ─── Helpers ──────────────────────────────────────────────── */

  /** Calculate days between two YYYY-MM-DD dates */
  daysBetween(dateFrom: string, dateTo: string): number {
    const from = new Date(dateFrom + 'T00:00:00');
    const to = new Date(dateTo + 'T00:00:00');
    const diffMs = to.getTime() - from.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  /** Map days to aging bucket key */
  getBucket(days: number): keyof AgingBuckets {
    if (days <= 0) return 'current';
    if (days <= 30) return 'd1_30';
    if (days <= 60) return 'd31_60';
    if (days <= 90) return 'd61_90';
    if (days <= 120) return 'd91_120';
    return 'd120plus';
  }

  /** Sum aging buckets across all rows */
  private sumAging(rows: AgingRow[]): AgingBuckets {
    const totals: AgingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 };
    for (const row of rows) {
      totals.current += row.aging.current;
      totals.d1_30 += row.aging.d1_30;
      totals.d31_60 += row.aging.d31_60;
      totals.d61_90 += row.aging.d61_90;
      totals.d91_120 += row.aging.d91_120;
      totals.d120plus += row.aging.d120plus;
    }
    return totals;
  }
}
