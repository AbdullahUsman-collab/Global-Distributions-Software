/**
 * Financial Reporting Domain Types
 * Defines DTOs for Trial Balance, Profit & Loss, and Balance Sheet reports.
 *
 * Source of Truth:
 *   - audit/20_FINANCIAL_STATEMENTS.md
 *   - audit/04_ACCOUNTING_ENGINE.md
 *   - audit/16_CALCULATIONS.md
 */

import { AccountLevel } from './coa';

/* ─── Filter DTO ──────────────────────────────────────────── */

/** Filters for all financial reports */
export interface ReportFilterDTO {
  /** Tenant identifier — always required for isolation */
  tenantId: string;
  /** Start date for period-based reports (inclusive, YYYY-MM-DD) */
  startDate: string;
  /** End date for period-based reports (inclusive, YYYY-MM-DD) */
  endDate: string;
  /** Whether to include accounts with zero closing balance */
  showZeroBalance: boolean;
}

/* ─── Trial Balance ───────────────────────────────────────── */

/** Single account row in a Trial Balance report */
export interface TrialBalanceRowDTO {
  accountId: string;
  accountCode: string;
  accountName: string;
  level: AccountLevel;
  isPosting: boolean;
  /** Legacy main head number if available */
  legacyMainHeadNo?: number;
  /** Normal balance direction for this account */
  normalBalance: 'DEBIT' | 'CREDIT';
  /** Account type for classification */
  accountType: string;
  /** Opening debit balance (sum of debits before startDate) */
  openingDebit: number;
  /** Opening credit balance (sum of credits before startDate) */
  openingCredit: number;
  /** Period debit total (debits within date range) */
  periodDebit: number;
  /** Period credit total (credits within date range) */
  periodCredit: number;
  /** Closing debit balance */
  closingDebit: number;
  /** Closing credit balance */
  closingCredit: number;
  /** Account effect classification */
  accountEffect?: 'Balance Sheet' | 'Profit and Loss' | 'Both';
}

/** Complete Trial Balance report */
export interface TrialBalanceReportDTO {
  startDate: string;
  endDate: string;
  rows: TrialBalanceRowDTO[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  /** Whether total debits equal total credits */
  isBalanced: boolean;
}

/* ─── Profit & Loss ───────────────────────────────────────── */

/** Single account row in P&L report */
export interface ProfitAndLossRowDTO {
  accountId: string;
  accountCode: string;
  accountName: string;
  level: AccountLevel;
  /** Period total (debit or credit depending on account type) */
  amount: number;
}

/** Complete Profit & Loss report */
export interface ProfitAndLossReportDTO {
  startDate: string;
  endDate: string;
  revenueRows: ProfitAndLossRowDTO[];
  cogsRows: ProfitAndLossRowDTO[];
  expenseRows: ProfitAndLossRowDTO[];
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

/* ─── Balance Sheet ───────────────────────────────────────── */

/** Single account row in Balance Sheet */
export interface BalanceSheetRowDTO {
  accountId: string;
  accountCode: string;
  accountName: string;
  level: AccountLevel;
  /** Balance amount (debit or credit depending on account type) */
  amount: number;
}

/** Complete Balance Sheet report */
export interface BalanceSheetReportDTO {
  asOfDate: string;
  assetRows: BalanceSheetRowDTO[];
  liabilityRows: BalanceSheetRowDTO[];
  equityRows: BalanceSheetRowDTO[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  /** Whether the balance sheet balances */
  isBalanced: boolean;
}
