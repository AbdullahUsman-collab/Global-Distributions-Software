/**
 * Voucher Repository Interface
 * Defines the contract for voucher and ledger persistence.
 *
 * IMPLEMENTATION NOTE: UI layer MUST depend on this interface only.
 * Concrete adapters (mock or real) are injected at runtime.
 */

import {
  VoucherHeader,
  VoucherLine,
  VoucherStatus,
  VoucherType,
  LedgerEntry,
  CreateVoucherDTO,
  UpdateVoucherDTO,
} from '../types/voucher';

export interface IVoucherRepository {

  /* ─── Voucher Header Queries ───────────────────────────── */

  /** Get all vouchers for a tenant, optionally filtered by type and/or status */
  getVouchersByTenantId(
    tenantId: string,
    filters?: { voucherType?: VoucherType; status?: VoucherStatus },
  ): Promise<VoucherHeader[]>;

  /** Get a single voucher header by its unique id */
  getVoucherById(tenantId: string, id: string): Promise<VoucherHeader | null>;

  /** Get the next sequential voucher number for a tenant */
  getNextVoucherNumber(tenantId: string): Promise<number>;

  /* ─── Voucher Line Queries ─────────────────────────────── */

  /** Get all line items for a specific voucher */
  getVoucherLines(tenantId: string, voucherId: string): Promise<VoucherLine[]>;

  /* ─── Mutations ────────────────────────────────────────── */

  /** Create a new voucher in DRAFT status with the given lines */
  createVoucher(tenantId: string, dto: CreateVoucherDTO, createdBy: string): Promise<VoucherHeader>;

  /** Update an existing DRAFT voucher header and/or lines (replaces lines entirely) */
  updateVoucher(tenantId: string, id: string, dto: UpdateVoucherDTO): Promise<VoucherHeader>;

  /** Delete a DRAFT voucher and its lines; throws if status is POSTED */
  deleteVoucher(tenantId: string, id: string): Promise<void>;

  /** Post a DRAFT voucher — validates balance, creates LedgerEntry records, sets status to POSTED */
  postVoucher(tenantId: string, id: string): Promise<VoucherHeader>;

  /* ─── Ledger Queries ───────────────────────────────────── */

  /** Get all ledger entries for a tenant, optionally filtered by account, date range, and/or voucher type */
  getLedgerEntries(
    tenantId: string,
    filters?: {
      accountId?: string;
      startDate?: string;
      endDate?: string;
      voucherType?: VoucherType;
    },
  ): Promise<LedgerEntry[]>;

  /** Get all ledger entries for a specific account, ordered by date, with running balance */
  getLedgerForAccount(
    tenantId: string,
    accountId: string,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<(LedgerEntry & { balance: number })[]>;
}
