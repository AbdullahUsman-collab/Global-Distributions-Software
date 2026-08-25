/**
 * Financial Report Service
 * Generates Trial Balance, Profit & Loss, and Balance Sheet reports.
 *
 * READ-ONLY — does not create, modify, post, or delete vouchers.
 *
 * Source of Truth:
 *   - audit/20_FINANCIAL_STATEMENTS.md
 *   - audit/04_ACCOUNTING_ENGINE.md
 *   - audit/16_CALCULATIONS.md
 *   - audit/17_FINANCIAL_PERIODS.md
 */

import { AccountHead } from '../types/coa';
import { LedgerEntry } from '../types/voucher';
import { ICOARepository } from '../repositories/ICOARepository';
import { IVoucherRepository } from '../repositories/IVoucherRepository';
import {
  ReportFilterDTO,
  TrialBalanceRowDTO,
  TrialBalanceReportDTO,
  ProfitAndLossRowDTO,
  ProfitAndLossReportDTO,
  BalanceSheetRowDTO,
  BalanceSheetReportDTO,
} from '../types/reports';

/* ─── Helpers ──────────────────────────────────────────────── */

/** Round to 2 decimal places */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ─── Service ──────────────────────────────────────────────── */

export class FinancialReportService {
  constructor(
    private coaRepo: ICOARepository,
    private voucherRepo: IVoucherRepository,
  ) {}

  /* ─── Trial Balance ─────────────────────────────────────── */

  async generateTrialBalance(filter: ReportFilterDTO): Promise<TrialBalanceReportDTO> {
    const accounts = await this.coaRepo.getAccountsByTenantId(filter.tenantId);

    // Get all ledger entries for this tenant (no date filter — we need all for opening)
    const allEntries = await this.voucherRepo.getLedgerEntries(filter.tenantId);

    // Only POSTED entries
    const postedEntries = allEntries;

    // Build account map by code
    const accountByCode = new Map<string, AccountHead>();
    for (const a of accounts) {
      accountByCode.set(a.accountCode, a);
    }

    // Compute per-account balances
    const accountBalances = new Map<string, {
      openingDebit: number;
      openingCredit: number;
      periodDebit: number;
      periodCredit: number;
    }>();

    for (const entry of postedEntries) {
      const isBeforeStart = entry.entryDate < filter.startDate;
      const isInRange = entry.entryDate >= filter.startDate && entry.entryDate <= filter.endDate;

      if (!isBeforeStart && !isInRange) continue;

      const key = entry.accountId;
      if (!accountBalances.has(key)) {
        accountBalances.set(key, { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 });
      }
      const bal = accountBalances.get(key)!;

      if (isBeforeStart) {
        bal.openingDebit += entry.debit;
        bal.openingCredit += entry.credit;
      } else {
        bal.periodDebit += entry.debit;
        bal.periodCredit += entry.credit;
      }
    }

    // Build rows for all posting accounts
    const rows: TrialBalanceRowDTO[] = [];

    for (const account of accounts) {
      if (!account.isPosting) continue;
      if (!account.isActive) continue;

      const bal = accountBalances.get(account.accountCode) ?? {
        openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0,
      };

      // Compute net balance
      // For DEBIT-normal accounts: balance = (openingDr - openingCr) + (periodDr - periodCr)
      // For CREDIT-normal accounts: balance = (openingCr - openingDr) + (periodCr - periodDr)
      const openingNet = bal.openingDebit - bal.openingCredit;
      const periodNet = bal.periodDebit - bal.periodCredit;
      const closingNet = openingNet + periodNet;

      let closingDebit = 0;
      let closingCredit = 0;

      if (account.normalBalance === 'DEBIT') {
        if (closingNet >= 0) {
          closingDebit = r2(closingNet);
        } else {
          closingCredit = r2(-closingNet);
        }
      } else {
        // CREDIT-normal
        if (closingNet >= 0) {
          closingCredit = r2(closingNet);
        } else {
          closingDebit = r2(-closingNet);
        }
      }

      // Skip zero-balance accounts if filter says so
      if (!filter.showZeroBalance && closingDebit === 0 && closingCredit === 0) {
        continue;
      }

      rows.push({
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        level: account.level,
        isPosting: account.isPosting,
        legacyMainHeadNo: account.legacyMainHeadNo,
        normalBalance: account.normalBalance,
        accountType: account.accountType,
        openingDebit: r2(bal.openingDebit),
        openingCredit: r2(bal.openingCredit),
        periodDebit: r2(bal.periodDebit),
        periodCredit: r2(bal.periodCredit),
        closingDebit,
        closingCredit,
        accountEffect: account.accountEffect,
      });
    }

    // Sort by account code
    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // Compute totals
    let totalOpeningDebit = 0;
    let totalOpeningCredit = 0;
    let totalPeriodDebit = 0;
    let totalPeriodCredit = 0;
    let totalClosingDebit = 0;
    let totalClosingCredit = 0;

    for (const row of rows) {
      totalOpeningDebit += row.openingDebit;
      totalOpeningCredit += row.openingCredit;
      totalPeriodDebit += row.periodDebit;
      totalPeriodCredit += row.periodCredit;
      totalClosingDebit += row.closingDebit;
      totalClosingCredit += row.closingCredit;
    }

    const isBalanced = Math.abs(totalClosingDebit - totalClosingCredit) < 0.01;

    return {
      startDate: filter.startDate,
      endDate: filter.endDate,
      rows,
      totalOpeningDebit: r2(totalOpeningDebit),
      totalOpeningCredit: r2(totalOpeningCredit),
      totalPeriodDebit: r2(totalPeriodDebit),
      totalPeriodCredit: r2(totalPeriodCredit),
      totalClosingDebit: r2(totalClosingDebit),
      totalClosingCredit: r2(totalClosingCredit),
      isBalanced,
    };
  }

  /* ─── Profit & Loss ─────────────────────────────────────── */

  async generateProfitAndLoss(filter: ReportFilterDTO): Promise<ProfitAndLossReportDTO> {
    const accounts = await this.coaRepo.getAccountsByTenantId(filter.tenantId);
    const allEntries = await this.voucherRepo.getLedgerEntries(filter.tenantId);

    // Only period activity (no opening for P&L — P&L is period-based)
    const periodEntries = allEntries.filter(
      e => e.entryDate >= filter.startDate && e.entryDate <= filter.endDate,
    );

    // Build account map
    const accountByCode = new Map<string, AccountHead>();
    for (const a of accounts) {
      accountByCode.set(a.accountCode, a);
    }

    // Compute per-account period totals
    const accountTotals = new Map<string, { debit: number; credit: number }>();
    for (const entry of periodEntries) {
      const key = entry.accountId;
      if (!accountTotals.has(key)) {
        accountTotals.set(key, { debit: 0, credit: 0 });
      }
      const tot = accountTotals.get(key)!;
      tot.debit += entry.debit;
      tot.credit += entry.credit;
    }

    // Classify accounts
    const revenueRows: ProfitAndLossRowDTO[] = [];
    const cogsRows: ProfitAndLossRowDTO[] = [];
    const expenseRows: ProfitAndLossRowDTO[] = [];

    for (const account of accounts) {
      if (!account.isPosting) continue;
      if (!account.isActive) continue;

      const tot = accountTotals.get(account.accountCode);
      if (!tot) continue;

      // For REVENUE (CREDIT-normal): net = credit - debit
      // For COGS/EXPENSE (DEBIT-normal): net = debit - credit
      let amount = 0;
      if (account.accountType === 'REVENUE') {
        amount = tot.credit - tot.debit;
      } else if (account.accountType === 'COGS' || account.accountType === 'EXPENSE') {
        amount = tot.debit - tot.credit;
      } else {
        continue; // Skip non-P&L accounts
      }

      if (amount === 0 && !filter.showZeroBalance) continue;

      const row: ProfitAndLossRowDTO = {
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        level: account.level,
        amount: r2(amount),
      };

      if (account.accountType === 'REVENUE') {
        revenueRows.push(row);
      } else if (account.accountType === 'COGS') {
        cogsRows.push(row);
      } else if (account.accountType === 'EXPENSE') {
        expenseRows.push(row);
      }
    }

    // Sort by account code within each section
    revenueRows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    cogsRows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    expenseRows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // Compute totals
    // Revenue is credit-normal, so totalRevenue should be positive
    const totalRevenue = r2(revenueRows.reduce((s, r) => s + r.amount, 0));
    const totalCOGS = r2(cogsRows.reduce((s, r) => s + r.amount, 0));
    const totalExpenses = r2(expenseRows.reduce((s, r) => s + r.amount, 0));
    const grossProfit = r2(totalRevenue - totalCOGS);
    const netProfit = r2(totalRevenue - totalCOGS - totalExpenses);

    return {
      startDate: filter.startDate,
      endDate: filter.endDate,
      revenueRows,
      cogsRows,
      expenseRows,
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
    };
  }

  /* ─── Balance Sheet ─────────────────────────────────────── */

  async generateBalanceSheet(filter: ReportFilterDTO): Promise<BalanceSheetReportDTO> {
    const accounts = await this.coaRepo.getAccountsByTenantId(filter.tenantId);

    // Get all posted entries up to endDate
    const allEntries = await this.voucherRepo.getLedgerEntries(filter.tenantId);
    const periodEntries = allEntries.filter(e => e.entryDate <= filter.endDate);

    // Build account map
    const accountByCode = new Map<string, AccountHead>();
    for (const a of accounts) {
      accountByCode.set(a.accountCode, a);
    }

    // Compute per-account cumulative balances
    const accountTotals = new Map<string, { debit: number; credit: number }>();
    for (const entry of periodEntries) {
      const key = entry.accountId;
      if (!accountTotals.has(key)) {
        accountTotals.set(key, { debit: 0, credit: 0 });
      }
      const tot = accountTotals.get(key)!;
      tot.debit += entry.debit;
      tot.credit += entry.credit;
    }

    // Classify accounts by legacyMainHeadNo
    // Assets: legacyMainHeadNo 100 (Assets L1) + 250 (Fixed Assets L2)
    // Liabilities: legacyMainHeadNo 1 (Cash & Bank L3) + 500 (A/R L3) + 8000 (A/P L3)
    //   Note: audit/20 says "DEBITORS (500) less CUSTOMERS" and "BUSINESS PARTIES (8000) - SUPPLIERS"
    //   and "CASH AND BANK (1)" as liabilities
    // Equity: legacyMainHeadNo 200 (Equity L1)
    //
    // Actually from the audit/20 output format:
    //   ASSETS = accounts under legacyMainHeadNo 100 and 250
    //   EQUITY = accounts under legacyMainHeadNo 200
    //   LIABILITIES = accounts under legacyMainHeadNo 1, 500, 8000

    // For Balance Sheet, use accountEffect and legacyMainHeadNo to classify
    // We need to find accounts belonging to each category

    // Strategy: walk the tree. For each Level 4 posting account, determine its
    // top-level ancestor's legacyMainHeadNo or accountEffect.

    const accountAncestors = new Map<string, AccountHead>(); // accountId -> top-level ancestor
    for (const account of accounts) {
      if (account.level === 1) {
        // Walk down to find all descendants
        const descendants = accounts.filter(a => this.isDescendant(a, account, accounts));
        for (const d of descendants) {
          accountAncestors.set(d.id, account);
        }
        // Also map the Level 1 itself
        accountAncestors.set(account.id, account);
      }
    }

    const assetRows: BalanceSheetRowDTO[] = [];
    const liabilityRows: BalanceSheetRowDTO[] = [];
    const equityRows: BalanceSheetRowDTO[] = [];

    for (const account of accounts) {
      if (!account.isPosting) continue;
      if (!account.isActive) continue;

      const tot = accountTotals.get(account.accountCode);
      if (!tot) continue;

      const ancestor = accountAncestors.get(account.id);
      if (!ancestor) continue;

      // Determine net balance
      let balance = 0;
      if (account.normalBalance === 'DEBIT') {
        balance = tot.debit - tot.credit;
      } else {
        balance = tot.credit - tot.debit;
      }

      if (balance === 0 && !filter.showZeroBalance) continue;

      const row: BalanceSheetRowDTO = {
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        level: account.level,
        amount: r2(balance),
      };

      // Classify by top-level account's legacyMainHeadNo
      if (ancestor.legacyMainHeadNo === 100 || ancestor.legacyMainHeadNo === 250) {
        assetRows.push(row);
      } else if (ancestor.legacyMainHeadNo === 200) {
        equityRows.push(row);
      } else if (
        ancestor.legacyMainHeadNo === 1 ||
        ancestor.legacyMainHeadNo === 500 ||
        ancestor.legacyMainHeadNo === 8000
      ) {
        liabilityRows.push(row);
      } else if (ancestor.accountEffect === 'Balance Sheet') {
        // Fallback: use accountEffect if legacyMainHeadNo doesn't match
        // This handles Liabilities root (20000) which has no legacyMainHeadNo
        if (ancestor.accountType === 'LIABILITY') {
          liabilityRows.push(row);
        } else if (ancestor.accountType === 'EQUITY') {
          equityRows.push(row);
        } else if (ancestor.accountType === 'ASSET') {
          assetRows.push(row);
        }
      }
    }

    // Sort by account code
    assetRows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    liabilityRows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    equityRows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const totalAssets = r2(assetRows.reduce((s, r) => s + r.amount, 0));
    const totalLiabilities = r2(liabilityRows.reduce((s, r) => s + r.amount, 0));
    const totalEquity = r2(equityRows.reduce((s, r) => s + r.amount, 0));

    // Balance Sheet equation: Assets = Liabilities + Equity
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    return {
      asOfDate: filter.endDate,
      assetRows,
      liabilityRows,
      equityRows,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced,
    };
  }

  /* ─── Private Helpers ───────────────────────────────────── */

  /** Check if 'candidate' is a descendant of 'ancestor' in the account tree */
  private isDescendant(candidate: AccountHead, ancestor: AccountHead, allAccounts: AccountHead[]): boolean {
    if (candidate.id === ancestor.id) return true;
    if (!candidate.parentId) return false;

    let current = candidate;
    while (current.parentId) {
      if (current.parentId === ancestor.id) return true;
      const parent = allAccounts.find(a => a.id === current.parentId);
      if (!parent) return false;
      current = parent;
    }
    return false;
  }
}
