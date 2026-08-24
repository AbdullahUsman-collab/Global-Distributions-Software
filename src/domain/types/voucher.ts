/**
 * Voucher & Ledger Domain Types
 * Defines double-entry voucher system types for journal entry and general ledger.
 *
 * Source of Truth: audit/04_ACCOUNTING_ENGINE.md, audit/23_DATA_MODEL.md
 */

/* ─── Enums ────────────────────────────────────────────────── */

/** Voucher types — all support debit ANY / credit ANY per spec */
export type VoucherType = 'JV' | 'CPV' | 'CRV' | 'BPV' | 'BRV';

/** Voucher lifecycle status */
export type VoucherStatus = 'DRAFT' | 'POSTED';

/* ─── Display Labels ───────────────────────────────────────── */

export const VOUCHER_TYPE_LABELS: Record<VoucherType, string> = {
  JV:  'Journal Voucher',
  CPV: 'Cash Payment Voucher',
  CRV: 'Cash Receipt Voucher',
  BPV: 'Bank Payment Voucher',
  BRV: 'Bank Receipt Voucher',
};

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  DRAFT:  'Draft',
  POSTED: 'Posted',
};

/* ─── Core Entities ────────────────────────────────────────── */

/** Single line item within a voucher (one leg of a journal entry) */
export interface VoucherLine {
  /** Unique line identifier */
  id: string;
  /** Parent voucher reference */
  voucherId: string;
  /** Tenant identifier */
  tenantId: string;
  /** Account code (5-digit string, references AccountHead.accountCode) */
  accountId: string;
  /** Line narration / description */
  description: string;
  /** Debit amount (≥ 0) */
  debit: number;
  /** Credit amount (≥ 0) */
  credit: number;
  /** Display order within voucher */
  lineOrder: number;
}

/** Voucher header — one per journal entry, cash/bank receipt/payment */
export interface VoucherHeader {
  /** Unique voucher identifier */
  id: string;
  /** Tenant identifier */
  tenantId: string;
  /** Auto-generated sequential voucher number */
  voucherNumber: number;
  /** Voucher type */
  voucherType: VoucherType;
  /** DRAFT = editable, no GL entries; POSTED = permanent, immutable */
  status: VoucherStatus;
  /** Entry / posting date */
  date: string;
  /** Header-level narration */
  narration: string;
  /** Username who created the voucher */
  createdBy: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/** General ledger entry — generated when a voucher is posted */
export interface LedgerEntry {
  /** Unique ledger entry identifier */
  id: string;
  /** Tenant identifier */
  tenantId: string;
  /** Source voucher header reference */
  voucherId: string;
  /** Source voucher line reference */
  voucherLineId: string;
  /** Account code (5-digit string, references AccountHead.accountCode) */
  accountId: string;
  /** Debit amount */
  debit: number;
  /** Credit amount */
  credit: number;
  /** Date of the ledger entry (mirrors voucher date) */
  entryDate: string;
  /** Voucher type (for display/filtering) */
  voucherType: VoucherType;
  /** Voucher number (for display/reference) */
  voucherNumber: number;
  /** Narration from the voucher line */
  narration: string;
}

/* ─── DTOs ─────────────────────────────────────────────────── */

/** Payload for creating a new voucher (always starts as DRAFT) */
export interface CreateVoucherDTO {
  voucherType: VoucherType;
  date: string;
  narration: string;
  lines: {
    accountId: string;
    description: string;
    debit: number;
    credit: number;
  }[];
}

/** Payload for updating an existing DRAFT voucher */
export interface UpdateVoucherDTO {
  date?: string;
  narration?: string;
  lines?: {
    accountId: string;
    description: string;
    debit: number;
    credit: number;
  }[];
}

/* ─── Computed Helpers ─────────────────────────────────────── */

/** Compute total debit for a set of voucher lines */
export function totalDebit(lines: { debit: number }[]): number {
  return lines.reduce((sum, l) => sum + l.debit, 0);
}

/** Compute total credit for a set of voucher lines */
export function totalCredit(lines: { credit: number }[]): number {
  return lines.reduce((sum, l) => sum + l.credit, 0);
}

/** Check whether voucher lines balance (total debit === total credit) */
export function isBalanced(lines: { debit: number; credit: number }[]): boolean {
  const d = totalDebit(lines);
  const c = totalCredit(lines);
  return Math.abs(d - c) < 0.005;
}
