/**
 * Dashboard Service
 * Aggregates data from existing services/repositories for the ERP dashboard.
 *
 * Does NOT create duplicate accounting logic.
 * Consumes existing services: BillsListService, AgingReportService,
 * CashBookService, FinancialReportService, and raw repositories.
 *
 * Source of Truth:
 *   - audit/42_STEP23_DASHBOARD_ENHANCEMENT_IMPLEMENTATION_REPORT.md
 */

import { VoucherHeader, LedgerEntry, VoucherType } from '../types/voucher';
import { StockLevel } from '../types/inventory';
import { AgingBuckets } from './AgingReportService';
import { IVoucherRepository } from '../repositories/IVoucherRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { ICOARepository } from '../repositories/ICOARepository';
import { ICustomerRepository } from '../repositories/ICustomerRepository';
import { ISupplierRepository } from '../repositories/ISupplierRepository';
import { BillsListService, BillRecord } from './BillsListService';
import { AgingReportService } from './AgingReportService';
import { CashBookService } from './CashBookService';
import { FinancialReportService } from './FinancialReportService';

/* ─── Types ────────────────────────────────────────────────── */

export type DashboardPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DashboardDateRange {
  startDate: string;
  endDate: string;
}

export interface KpiCard {
  label: string;
  amount: number;
  count: number;
  /** Optional secondary display value */
  secondary?: number;
}

export interface RecentTransaction {
  id: string;
  voucherNumber: number;
  voucherType: VoucherType;
  date: string;
  narration: string;
  partyName: string;
  total: number;
  status: string;
}

export interface AgingSummary {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d91_120: number;
  d120plus: number;
  grandTotal: number;
}

export interface DashboardData {
  dateRange: DashboardDateRange;
  period: DashboardPeriod;
  sales: KpiCard;
  purchases: KpiCard;
  saleReturns: KpiCard;
  purchaseReturns: KpiCard;
  receivables: AgingSummary;
  payables: AgingSummary;
  inventory: {
    totalProducts: number;
    totalStockQty: number;
    totalStockValue: number;
  };
  cashPosition: {
    totalBalance: number;
    accountCount: number;
  };
  recentTransactions: RecentTransaction[];
}

/* ─── Period Resolution ────────────────────────────────────── */

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getFirstOfMonth(dateStr: string): string {
  return dateStr.slice(0, 7) + '-01';
}

function getFirstOfQuarter(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const q = Math.floor(d.getMonth() / 3);
  const firstMonth = q * 3;
  return `${d.getFullYear()}-${String(firstMonth + 1).padStart(2, '0')}-01`;
}

function getFirstOfYear(dateStr: string): string {
  return dateStr.slice(0, 4) + '-01-01';
}

export function resolvePeriod(
  period: DashboardPeriod,
  customStart?: string,
  customEnd?: string,
): DashboardDateRange {
  const today = todayStr();
  switch (period) {
    case 'today':
      return { startDate: today, endDate: today };
    case 'week':
      return { startDate: getMonday(today), endDate: today };
    case 'month':
      return { startDate: getFirstOfMonth(today), endDate: today };
    case 'quarter':
      return { startDate: getFirstOfQuarter(today), endDate: today };
    case 'year':
      return { startDate: getFirstOfYear(today), endDate: today };
    case 'custom':
      return {
        startDate: customStart || today,
        endDate: customEnd || today,
      };
  }
}

/* ─── Service ──────────────────────────────────────────────── */

export class DashboardService {
  private billsService: BillsListService;
  private agingService: AgingReportService;

  constructor(
    private voucherRepo: IVoucherRepository,
    private inventoryRepo: IInventoryRepository,
    private coaRepo: ICOARepository,
    private customerRepo: ICustomerRepository,
    private supplierRepo: ISupplierRepository,
    private cashBookService: CashBookService,
    private financialReportService: FinancialReportService,
  ) {
    this.billsService = new BillsListService(voucherRepo, customerRepo, supplierRepo, inventoryRepo, coaRepo);
    this.agingService = new AgingReportService(voucherRepo, coaRepo, customerRepo, supplierRepo);
  }

  /**
   * Get dashboard data for a tenant and period.
   * Aggregates from existing services in parallel where possible.
   */
  async getDashboardData(
    tenantId: string,
    period: DashboardPeriod,
    customStart?: string,
    customEnd?: string,
  ): Promise<DashboardData> {
    const dateRange = resolvePeriod(period, customStart, customEnd);

    // Load all data in parallel
    const [bills, receivables, payables, stockLevels, cashAccounts, recentVouchers] = await Promise.all([
      this.billsService.getAllBills(tenantId),
      this.agingService.generateReport(tenantId, 'customer', todayStr()),
      this.agingService.generateReport(tenantId, 'supplier', todayStr()),
      this.inventoryRepo.getStockLevels(tenantId),
      this.cashBookService.getCashBankAccounts(tenantId),
      this.voucherRepo.getVouchersByTenantId(tenantId),
    ]);

    // Filter bills by date range
    const filteredBills = bills.filter(b =>
      b.voucher.date >= dateRange.startDate && b.voucher.date <= dateRange.endDate
    );

    // Aggregate sales KPIs
    const svBills = filteredBills.filter(b => b.voucher.voucherType === 'SV');
    const sales: KpiCard = {
      label: 'Sales',
      amount: svBills.reduce((s, b) => s + b.total, 0),
      count: svBills.length,
    };

    // Aggregate purchase KPIs
    const pvBills = filteredBills.filter(b => b.voucher.voucherType === 'PV');
    const purchases: KpiCard = {
      label: 'Purchases',
      amount: pvBills.reduce((s, b) => s + b.total, 0),
      count: pvBills.length,
    };

    // Aggregate sale return KPIs
    const srvBills = filteredBills.filter(b => b.voucher.voucherType === 'SRV');
    const saleReturns: KpiCard = {
      label: 'Sale Returns',
      amount: srvBills.reduce((s, b) => s + b.total, 0),
      count: srvBills.length,
    };

    // Aggregate purchase return KPIs
    const prvBills = filteredBills.filter(b => b.voucher.voucherType === 'PRV');
    const purchaseReturns: KpiCard = {
      label: 'Purchase Returns',
      amount: prvBills.reduce((s, b) => s + b.total, 0),
      count: prvBills.length,
    };

    // Inventory summary (using stock levels — reliable data)
    const inventory = {
      totalProducts: stockLevels.length,
      totalStockQty: stockLevels.reduce((s, sl) => s + sl.quantityOnHand, 0),
      totalStockValue: stockLevels.reduce((s, sl) => s + sl.quantityOnHand * sl.unitCost, 0),
    };

    // Cash position
    let cashPosition = { totalBalance: 0, accountCount: cashAccounts.length };
    if (cashAccounts.length > 0) {
      // Get cash book for the first account to get closing balance
      // (in a real scenario, sum across all accounts)
      const balances = await Promise.all(
        cashAccounts.map(acc =>
          this.cashBookService.getCashBook(tenantId, acc.id, dateRange.startDate, dateRange.endDate)
        ),
      );
      cashPosition = {
        totalBalance: balances.reduce((s, cb) => s + cb.closingBalance, 0),
        accountCount: cashAccounts.length,
      };
    }

    // Recent transactions (all types, newest first)
    const filteredVouchers = recentVouchers
      .filter(v => v.date >= dateRange.startDate && v.date <= dateRange.endDate)
      .sort((a, b) => b.date.localeCompare(a.date) || b.voucherNumber - a.voucherNumber)
      .slice(0, 10);

    // Enrich recent transactions with party names and totals from bills
    const billMap = new Map<string, BillRecord>();
    for (const b of filteredBills) {
      billMap.set(b.voucher.id, b);
    }

    const recentTransactions: RecentTransaction[] = filteredVouchers.map(v => {
      const bill = billMap.get(v.id);
      return {
        id: v.id,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        date: v.date,
        narration: v.narration,
        partyName: bill?.partyName ?? '',
        total: bill?.total ?? 0,
        status: v.status,
      };
    });

    return {
      dateRange,
      period,
      sales,
      purchases,
      saleReturns,
      purchaseReturns,
      receivables: {
        current: receivables.totals.current,
        d1_30: receivables.totals.d1_30,
        d31_60: receivables.totals.d31_60,
        d61_90: receivables.totals.d61_90,
        d91_120: receivables.totals.d91_120,
        d120plus: receivables.totals.d120plus,
        grandTotal: receivables.grandTotal,
      },
      payables: {
        current: payables.totals.current,
        d1_30: payables.totals.d1_30,
        d31_60: payables.totals.d31_60,
        d61_90: payables.totals.d61_90,
        d91_120: payables.totals.d91_120,
        d120plus: payables.totals.d120plus,
        grandTotal: payables.grandTotal,
      },
      inventory,
      cashPosition,
      recentTransactions,
    };
  }
}
