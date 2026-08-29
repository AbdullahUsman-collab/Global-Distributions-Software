/**
 * Cash Book Service
 * Provides cash/bank account ledger views — opening balance, transactions, closing balance.
 *
 * Source of Truth:
 *   - audit/13_CASH_BANK.md (Cash Book behavior, CP/PV/CR types)
 *   - audit/04_ACCOUNTING_ENGINE.md (double-entry rules for cash transactions)
 *   - audit/MASTER_REVERSE_ENGINEERED_SPEC.md (cash book pages)
 *
 * Accounting:
 *   Opening Balance = Σ(debits) - Σ(credits) for cash/bank account, all vouchers before startDate
 *   Transactions = all CR/CP/CV/PV ledger entries affecting the cash/bank account in date range
 *   Closing Balance = Opening + Σ(debits in range) - Σ(credits in range)
 */

import { VoucherHeader, VoucherType, LedgerEntry, CreateVoucherDTO } from '../types/voucher';
import { AccountHead } from '../types/coa';
import { IVoucherRepository } from '../repositories/IVoucherRepository';
import { ICOARepository } from '../repositories/ICOARepository';

/* ─── Constants ────────────────────────────────────────────── */

/** GL account codes for cash/bank */
const ACCOUNT_CODES = {
  CASH_IN_HAND: '11101',
  BANK_ACCOUNT_MAIN: '11102',
} as const;

/** Accepted cash/bank account codes */
const ACCEPTED_CASH_BANK_CODES: ReadonlySet<string> = new Set([
  ACCOUNT_CODES.CASH_IN_HAND,
  ACCOUNT_CODES.BANK_ACCOUNT_MAIN,
]);

/** Voucher types that affect cash/bank accounts directly */
const CASH_VOUCHER_TYPES: ReadonlySet<VoucherType> = new Set([
  'CR',   // Cash Receipt
  'CP',   // Cash Payment
  'CV',   // Cash Voucher
  'PV',   // Payment Voucher (bank)
  'CRV',  // Cash Receipt (compat)
  'CPV',  // Cash Payment (compat)
  'BPV',  // Bank Payment (compat)
  'BRV',  // Bank Receipt (compat)
]);

/* ─── Types ────────────────────────────────────────────────── */

/** A single cash book transaction line */
export interface CashBookTransaction {
  /** Ledger entry */
  ledgerEntry: LedgerEntry;
  /** Voucher header for context */
  voucher: VoucherHeader;
  /** Running balance after this transaction */
  runningBalance: number;
}

/** Cash book summary for a date range */
export interface CashBookSummary {
  /** The cash/bank account */
  account: AccountHead;
  /** Opening balance (before startDate) */
  openingBalance: number;
  /** Closing balance (after endDate) */
  closingBalance: number;
  /** Total receipts (debits) in range */
  totalReceipts: number;
  /** Total payments (credits) in range */
  totalPayments: number;
  /** Number of transactions in range */
  transactionCount: number;
  /** Transactions with running balance */
  transactions: CashBookTransaction[];
}

/* ─── Service ──────────────────────────────────────────────── */

export class CashBookService {
  constructor(
    private coaRepo: ICOARepository,
    private voucherRepo: IVoucherRepository,
  ) {}

  /* ─── Queries ────────────────────────────────────────────── */

  /**
   * Get all cash/bank accounts for a tenant.
   * Returns accounts with code 11101 (Cash) or 11102 (Bank).
   */
  async getCashBankAccounts(tenantId: string): Promise<AccountHead[]> {
    const accounts = await this.coaRepo.getAccountsByTenantId(tenantId);
    return accounts.filter(a => ACCEPTED_CASH_BANK_CODES.has(a.accountCode) && a.isActive);
  }

  /**
   * Get cash book summary for an account in a date range.
   *
   * Opening Balance = Σ(all debits before startDate) - Σ(all credits before startDate)
   *   for the given cash/bank account (accountHead.id)
   *
   * Transactions = all posted voucher ledger entries for CR/CP/CV/PV types
   *   affecting this account, within [startDate, endDate]
   *
   * Closing = Opening + Σ(debits in range) - Σ(credits in range)
   */
  async getCashBook(
    tenantId: string,
    accountHeadId: string,
    startDate: string,
    endDate: string,
  ): Promise<CashBookSummary> {
    // Validate account exists and is cash/bank
    const account = await this.coaRepo.getAccountById(tenantId, accountHeadId);
    if (!account) throw new Error('Account not found');
    if (!ACCEPTED_CASH_BANK_CODES.has(account.accountCode)) {
      throw new Error(`Account ${account.accountCode} is not a Cash or Bank account`);
    }

    // Get opening balance: all ledger entries for this account STRICTLY BEFORE startDate
    // getLedgerEntries uses <= for endDate, so subtract one day to exclude startDate itself
    const dayBeforeStart = new Date(startDate + 'T00:00:00');
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
    const openingEndDate = dayBeforeStart.toISOString().slice(0, 10);
    const openingEntries = await this.voucherRepo.getLedgerEntries(tenantId, {
      accountId: accountHeadId,
      endDate: openingEndDate,
    });
    const openingBalance = openingEntries.reduce(
      (bal, e) => bal + e.debit - e.credit,
      0,
    );

    // Get all cash-related vouchers posted in the date range
    const allVouchers = await this.voucherRepo.getVouchersByTenantId(tenantId, {
      status: 'POSTED',
    });
    const cashVouchers = allVouchers.filter(
      v => CASH_VOUCHER_TYPES.has(v.voucherType) && v.date >= startDate && v.date <= endDate,
    );

    // Get ledger entries for this account in the date range
    const rangeEntries = await this.voucherRepo.getLedgerEntries(tenantId, {
      accountId: accountHeadId,
      startDate,
      endDate,
    });

    // Build transaction list with running balance
    const transactions: CashBookTransaction[] = [];
    let runningBalance = openingBalance;

    // Sort by date, then voucher number
    const sorted = rangeEntries.sort((a, b) => {
      if (a.entryDate !== b.entryDate) return a.entryDate.localeCompare(b.entryDate);
      return a.voucherNumber - b.voucherNumber;
    });

    // Lookup voucher headers for each entry
    const voucherMap = new Map<string, VoucherHeader>();
    for (const v of cashVouchers) {
      voucherMap.set(v.id, v);
    }

    for (const entry of sorted) {
      runningBalance += entry.debit - entry.credit;
      const voucher = voucherMap.get(entry.voucherId) ?? null;
      transactions.push({
        ledgerEntry: entry,
        voucher: voucher ?? ({
          id: entry.voucherId,
          tenantId,
          voucherNumber: entry.voucherNumber,
          voucherType: entry.voucherType,
          status: 'POSTED',
          date: entry.entryDate,
          narration: entry.narration,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as VoucherHeader),
        runningBalance,
      });
    }

    const totalReceipts = rangeEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalPayments = rangeEntries.reduce((sum, e) => sum + e.credit, 0);

    return {
      account,
      openingBalance,
      closingBalance: openingBalance + totalReceipts - totalPayments,
      totalReceipts,
      totalPayments,
      transactionCount: transactions.length,
      transactions,
    };
  }

  /* ─── Mutations ──────────────────────────────────────────── */

  /**
   * Create a new cash receipt (CR voucher).
   * DEBIT: Cash/Bank Account
   * CREDIT: Income/Party Account (caller must provide)
   */
  async createCashReceipt(
    tenantId: string,
    dto: {
      cashAccountId: string;
      creditAccountId: string;
      amount: number;
      date: string;
      narration: string;
    },
    createdBy: string,
  ): Promise<VoucherHeader> {
    if (dto.amount <= 0) throw new Error('Amount must be greater than zero');
    if (!dto.narration.trim()) throw new Error('Narration is required');
    if (!dto.date) throw new Error('Date is required');

    const cashAccount = await this.coaRepo.getAccountById(tenantId, dto.cashAccountId);
    if (!cashAccount) throw new Error('Cash/Bank account not found');
    if (!ACCEPTED_CASH_BANK_CODES.has(cashAccount.accountCode)) {
      throw new Error('Account is not a valid Cash or Bank account');
    }

    const creditAccount = await this.coaRepo.getAccountById(tenantId, dto.creditAccountId);
    if (!creditAccount) throw new Error('Credit account not found');

    const lines: CreateVoucherDTO['lines'] = [
      {
        accountId: dto.cashAccountId,
        description: `Cash received: ${dto.narration.trim()}`,
        debit: dto.amount,
        credit: 0,
      },
      {
        accountId: dto.creditAccountId,
        description: dto.narration.trim(),
        debit: 0,
        credit: dto.amount,
      },
    ];

    return this.voucherRepo.createVoucher(
      tenantId,
      {
        voucherType: 'CR',
        date: dto.date,
        narration: dto.narration.trim(),
        lines,
      },
      createdBy,
    );
  }

  /**
   * Create a new cash payment (CP voucher).
   * DEBIT: Expense/Party Account (caller must provide)
   * CREDIT: Cash/Bank Account
   */
  async createCashPayment(
    tenantId: string,
    dto: {
      cashAccountId: string;
      debitAccountId: string;
      amount: number;
      date: string;
      narration: string;
    },
    createdBy: string,
  ): Promise<VoucherHeader> {
    if (dto.amount <= 0) throw new Error('Amount must be greater than zero');
    if (!dto.narration.trim()) throw new Error('Narration is required');
    if (!dto.date) throw new Error('Date is required');

    const cashAccount = await this.coaRepo.getAccountById(tenantId, dto.cashAccountId);
    if (!cashAccount) throw new Error('Cash/Bank account not found');
    if (!ACCEPTED_CASH_BANK_CODES.has(cashAccount.accountCode)) {
      throw new Error('Account is not a valid Cash or Bank account');
    }

    const debitAccount = await this.coaRepo.getAccountById(tenantId, dto.debitAccountId);
    if (!debitAccount) throw new Error('Debit account not found');

    const lines: CreateVoucherDTO['lines'] = [
      {
        accountId: dto.debitAccountId,
        description: dto.narration.trim(),
        debit: dto.amount,
        credit: 0,
      },
      {
        accountId: dto.cashAccountId,
        description: `Cash paid: ${dto.narration.trim()}`,
        debit: 0,
        credit: dto.amount,
      },
    ];

    return this.voucherRepo.createVoucher(
      tenantId,
      {
        voucherType: 'CP',
        date: dto.date,
        narration: dto.narration.trim(),
        lines,
      },
      createdBy,
    );
  }

  /**
   * Post a cash book voucher (CR or CP).
   */
  async postVoucher(tenantId: string, voucherId: string): Promise<VoucherHeader> {
    return this.voucherRepo.postVoucher(tenantId, voucherId);
  }

  /**
   * Delete a DRAFT cash book voucher.
   */
  async deleteVoucher(tenantId: string, voucherId: string): Promise<void> {
    const voucher = await this.voucherRepo.getVoucherById(tenantId, voucherId);
    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status === 'POSTED') throw new Error('Cannot delete a posted voucher');
    return this.voucherRepo.deleteVoucher(tenantId, voucherId);
  }

  /**
   * Get all draft CR/CP vouchers for a cash account.
   */
  async getDraftVouchers(tenantId: string): Promise<VoucherHeader[]> {
    const allCR = await this.voucherRepo.getVouchersByTenantId(tenantId, {
      voucherType: 'CR',
      status: 'DRAFT',
    });
    const allCP = await this.voucherRepo.getVouchersByTenantId(tenantId, {
      voucherType: 'CP',
      status: 'DRAFT',
    });
    return [...allCR, ...allCP].sort((a, b) => a.date.localeCompare(b.date));
  }
}
